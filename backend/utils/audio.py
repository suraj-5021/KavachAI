"""
KavachAI — Audio loading utilities.
Handles WAV, MP3, and other audio formats via soundfile + librosa.
"""

import io
import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


def load_audio(
    file_path: str | None = None,
    file_bytes: bytes | None = None,
    target_sr: int = 16000,
) -> tuple[np.ndarray, int]:
    """
    Load audio from a file path or raw bytes.

    Returns:
        (audio_array, sample_rate) — mono float32 at target_sr
    """
    import soundfile as sf

    if file_bytes is not None:
        audio, sr = sf.read(io.BytesIO(file_bytes), dtype="float32")
    elif file_path is not None:
        audio, sr = sf.read(file_path, dtype="float32")
    else:
        raise ValueError("Provide either file_path or file_bytes")

    # Convert to mono
    if audio.ndim > 1:
        audio = audio.mean(axis=1)

    # Resample if needed
    if sr != target_sr:
        try:
            import librosa
            audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
            sr = target_sr
        except ImportError:
            logger.warning(
                f"librosa not available for resampling from {sr} to {target_sr}Hz"
            )

    return audio.astype(np.float32), sr


def get_audio_duration(audio: np.ndarray, sr: int = 16000) -> float:
    """Return duration in seconds."""
    return len(audio) / sr
