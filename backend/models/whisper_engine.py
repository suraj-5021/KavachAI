"""
KavachAI — Whisper ONNX Runtime inference engine.

Follows the Qualcomm AI Hub pattern for Whisper on Windows:
  - Split encoder/decoder ONNX sessions
  - Provider fallback chain: QNN → DML → CPU
  - Mel spectrogram preprocessing via log-mel filterbank
  - Autoregressive decoding with the decoder session

On non-Snapdragon hardware (like Intel x64), QNN EP is unavailable,
so the code falls back to CPU and labels it honestly.
"""

import os
import time
import logging
import platform
from pathlib import Path
from typing import Optional

import numpy as np
import onnxruntime as ort

logger = logging.getLogger(__name__)

# Model storage directory
MODEL_DIR = Path(__file__).parent.parent / "models"

# Qualcomm AI Hub provider chain — order matters:
# QNN EP (Snapdragon NPU) > DML EP (GPU) > CPU EP (fallback)
PROVIDER_CHAIN = [
    ("QNNExecutionProvider", {"backend_path": "QnnHtp.dll"}),
    ("DmlExecutionProvider", {}),
    ("CPUExecutionProvider", {}),
]


def get_best_provider() -> tuple[str, dict]:
    """
    Detect the best available execution provider.
    Returns (provider_name, provider_options).
    Never claims NPU unless QNN EP is genuinely available.
    """
    available = set(ort.get_available_providers())
    for provider_name, opts in PROVIDER_CHAIN:
        if provider_name in available:
            return provider_name, opts
    # Should never reach here — CPU is always available
    return "CPUExecutionProvider", {}


def get_provider_label(provider: str) -> str:
    """Human-readable label for the active provider."""
    labels = {
        "QNNExecutionProvider": "Snapdragon NPU (QNN)",
        "DmlExecutionProvider": "GPU (DirectML)",
        "CPUExecutionProvider": "CPU fallback",
    }
    return labels.get(provider, f"Unknown ({provider})")


class WhisperONNX:
    """
    Whisper speech-to-text via ONNX Runtime.

    Architecture follows Qualcomm AI Hub's Windows Whisper sample:
    1. Audio → Mel spectrogram (80-bin log-mel filterbank)
    2. Mel → Encoder ONNX session → encoder hidden states
    3. Encoder output + prompt tokens → Decoder ONNX session → next token
    4. Autoregressive loop until <|endoftext|> or max tokens

    Provider fallback: QNN → DML → CPU.
    """

    SAMPLE_RATE = 16000
    N_FFT = 400
    HOP_LENGTH = 160
    N_MELS = 80
    CHUNK_LENGTH = 30  # seconds
    N_SAMPLES = CHUNK_LENGTH * SAMPLE_RATE  # 480000

    def __init__(self, model_name: str = "whisper-base"):
        self.model_name = model_name
        self.model_dir = MODEL_DIR / model_name
        self.encoder_session: Optional[ort.InferenceSession] = None
        self.decoder_session: Optional[ort.InferenceSession] = None
        self.active_provider = "CPUExecutionProvider"
        self.provider_label = "CPU fallback"
        self.is_loaded = False
        self._processor = None
        self._model_info = {
            "name": model_name,
            "size_mb": 0,
            "format": "ONNX",
        }

    def load(self) -> dict:
        """
        Load the ONNX model. Uses Hugging Face Optimum to export if
        ONNX files don't exist yet.

        Returns model info dict.
        """
        onnx_path = self.model_dir / "model.onnx"
        encoder_path = self.model_dir / "encoder_model.onnx"
        decoder_path = self.model_dir / "decoder_model.onnx"

        # Export to ONNX if not already done
        if not encoder_path.exists():
            logger.info("ONNX model not found. Exporting via Optimum...")
            self._export_model()

        if not encoder_path.exists():
            raise FileNotFoundError(
                f"Encoder ONNX not found at {encoder_path}. "
                "Run model download first."
            )

        # Select best provider
        self.active_provider, provider_opts = get_best_provider()
        self.provider_label = get_provider_label(self.active_provider)
        logger.info(f"Using execution provider: {self.provider_label}")

        # Create sessions following Qualcomm's split-session pattern
        sess_opts = ort.SessionOptions()
        sess_opts.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )

        providers = [self.active_provider]
        provider_options = [provider_opts] if provider_opts else [{}]

        try:
            self.encoder_session = ort.InferenceSession(
                str(encoder_path),
                sess_options=sess_opts,
                providers=providers,
                provider_options=provider_options,
            )
        except Exception as e:
            logger.warning(f"Failed with {self.active_provider}: {e}")
            logger.info("Falling back to CPUExecutionProvider")
            self.active_provider = "CPUExecutionProvider"
            self.provider_label = "CPU fallback"
            self.encoder_session = ort.InferenceSession(
                str(encoder_path),
                sess_options=sess_opts,
                providers=["CPUExecutionProvider"],
            )

        if decoder_path.exists():
            try:
                self.decoder_session = ort.InferenceSession(
                    str(decoder_path),
                    sess_options=sess_opts,
                    providers=["CPUExecutionProvider"],  # Decoder on CPU
                )
            except Exception as e:
                logger.warning(f"Decoder load failed: {e}")

        # Verify which provider is actually active (not just requested)
        actual_providers = self.encoder_session.get_providers()
        if actual_providers:
            self.active_provider = actual_providers[0]
            self.provider_label = get_provider_label(self.active_provider)

        # Calculate model size
        total_size = 0
        for f in self.model_dir.rglob("*.onnx"):
            total_size += f.stat().st_size
        self._model_info["size_mb"] = round(total_size / (1024 * 1024), 1)

        # Load processor for feature extraction
        self._load_processor()

        if self._processor is not None:
            try:
                from optimum.onnxruntime import ORTModelForSpeechSeq2Seq
                self._ort_model = ORTModelForSpeechSeq2Seq.from_pretrained(
                    str(self.model_dir),
                    provider=self.active_provider,
                    use_merged=False,
                )
            except Exception as e:
                logger.warning(f"Optimum model preload failed: {e}")

        self.is_loaded = True
        logger.info(
            f"Model loaded: {self.model_name} "
            f"({self._model_info['size_mb']} MB) "
            f"on {self.provider_label}"
        )
        return self.get_info()

    def _export_model(self):
        """Export Whisper to ONNX format using Hugging Face Optimum."""
        try:
            from optimum.onnxruntime import ORTModelForSpeechSeq2Seq

            hf_model_id = f"openai/{self.model_name}"
            logger.info(f"Exporting {hf_model_id} to ONNX...")

            self.model_dir.mkdir(parents=True, exist_ok=True)

            model = ORTModelForSpeechSeq2Seq.from_pretrained(
                hf_model_id,
                export=True,
            )
            model.save_pretrained(str(self.model_dir))
            logger.info(f"ONNX export complete: {self.model_dir}")

        except ImportError:
            logger.error(
                "optimum[onnxruntime] not installed. "
                "Run: pip install optimum[onnxruntime]"
            )
            raise
        except Exception as e:
            logger.error(f"Model export failed: {e}")
            raise

    def _load_processor(self):
        """Load the Whisper feature extractor / processor."""
        try:
            import transformers
            transformers.logging.set_verbosity_error()
            from transformers import WhisperProcessor

            hf_model_id = f"openai/{self.model_name}"
            self._processor = WhisperProcessor.from_pretrained(hf_model_id)
        except Exception as e:
            logger.warning(f"Processor load failed: {e}")
            self._processor = None

    def transcribe(self, audio: np.ndarray, sr: int = 16000) -> dict:
        """
        Transcribe audio array to text.

        Args:
            audio: numpy array of audio samples (mono, float32)
            sr: sample rate (will resample to 16kHz if different)

        Returns:
            dict with 'text', 'language', 'chunks', 'latency_ms'
        """
        if not self.is_loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        start_time = time.perf_counter()

        # Resample if needed
        if sr != self.SAMPLE_RATE:
            import librosa
            audio = librosa.resample(
                audio, orig_sr=sr, target_sr=self.SAMPLE_RATE
            )

        # Ensure mono float32
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        audio = audio.astype(np.float32)

        # Use Optimum pipeline if available (handles encoder+decoder loop)
        if self._processor is not None:
            result = self._transcribe_with_processor(audio)
        else:
            result = self._transcribe_raw(audio)

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        result["latency_ms"] = round(elapsed_ms, 1)
        result["provider"] = self.provider_label
        result["model"] = self.model_name
        return result

    def _transcribe_with_processor(self, audio: np.ndarray) -> dict:
        """Transcribe using HF processor for feature extraction + decoding."""
        import warnings
        from optimum.onnxruntime import ORTModelForSpeechSeq2Seq

        # Re-load as Optimum pipeline if not already
        if not hasattr(self, "_ort_model") or self._ort_model is None:
            self._ort_model = ORTModelForSpeechSeq2Seq.from_pretrained(
                str(self.model_dir),
                provider=self.active_provider,
                use_merged=False,
            )

        input_features = self._processor(
            audio,
            sampling_rate=self.SAMPLE_RATE,
            return_tensors="pt",
        ).input_features

        # Generate with forced decoder IDs for language
        # Reduce max_new_tokens to leave room for prompt tokens (special tokens)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            predicted_ids = self._ort_model.generate(
                input_features=input_features,
                max_new_tokens=440,
            )

        transcription = self._processor.batch_decode(
            predicted_ids, skip_special_tokens=True
        )[0].strip()

        return {
            "text": transcription,
            "language": "auto",
            "chunks": [{"start": 0.0, "text": transcription}],
        }

    def _transcribe_raw(self, audio: np.ndarray) -> dict:
        """
        Raw ONNX inference without HF processor.
        Computes mel spectrogram manually and runs encoder.
        This is the fallback path.
        """
        # Compute mel spectrogram
        mel = self._compute_mel(audio)

        # Run encoder
        encoder_inputs = {
            self.encoder_session.get_inputs()[0].name: mel
        }
        encoder_output = self.encoder_session.run(None, encoder_inputs)

        return {
            "text": "[Raw ONNX transcription — install transformers for full decode]",
            "language": "unknown",
            "chunks": [],
        }

    def _compute_mel(self, audio: np.ndarray) -> np.ndarray:
        """Compute 80-bin log-mel spectrogram matching Whisper's preprocessing."""
        import librosa

        # Pad or truncate to 30 seconds
        if len(audio) > self.N_SAMPLES:
            audio = audio[: self.N_SAMPLES]
        else:
            audio = np.pad(audio, (0, self.N_SAMPLES - len(audio)))

        # Compute mel spectrogram
        mel = librosa.feature.melspectrogram(
            y=audio,
            sr=self.SAMPLE_RATE,
            n_fft=self.N_FFT,
            hop_length=self.HOP_LENGTH,
            n_mels=self.N_MELS,
            fmax=8000,
        )

        # Log-mel
        mel = np.log10(np.maximum(mel, 1e-10))
        mel = np.maximum(mel, mel.max() - 8.0)
        mel = (mel + 4.0) / 4.0

        # Add batch dimension: (1, 80, 3000)
        return mel[np.newaxis, :, :].astype(np.float32)

    def get_info(self) -> dict:
        """Return model metadata for the Technical Proof screen."""
        return {
            "model_name": self.model_name,
            "model_format": "ONNX",
            "model_size_mb": self._model_info["size_mb"],
            "active_provider": self.active_provider,
            "provider_label": self.provider_label,
            "is_npu": self.active_provider == "QNNExecutionProvider",
            "available_providers": ort.get_available_providers(),
            "onnxruntime_version": ort.__version__,
            "platform": platform.platform(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        }
