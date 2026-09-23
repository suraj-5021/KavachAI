"""
KavachAI — Audio Pipeline Validation Script.
Validates real audio files through the complete on-device Whisper ONNX
transcription and deterministic risk scoring pipeline.
"""

import os
import sys
import time
import warnings
from pathlib import Path

# Suppress noisy external library warnings during validation
warnings.filterwarnings("ignore")

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from models.whisper_engine import WhisperONNX
from scoring.risk_engine import score_transcript
from utils.audio import load_audio, get_audio_duration


def validate_audio_file(audio_path: str | Path):
    """Run an audio file through the full KavachAI on-device pipeline."""
    path = Path(audio_path)
    if not path.exists():
        # Check relative to repo root or backend dir
        alt_root = backend_dir.parent / audio_path
        alt_backend = backend_dir / audio_path
        if alt_root.exists():
            path = alt_root
        elif alt_backend.exists():
            path = alt_backend
        else:
            print(f"Error: Audio file not found: {audio_path}")
            return None

    print(f"\n============================================================")
    print(f"VALIDATING AUDIO: {path.name}")
    print(f"============================================================")

    # 1. Initialize Whisper ONNX Model
    print("Loading Whisper ONNX model...")
    t_load_start = time.perf_counter()
    engine = WhisperONNX(model_name="whisper-base")
    info = engine.load()
    t_load_end = time.perf_counter()
    print(f"Model loaded in {(t_load_end - t_load_start)*1000:.1f}ms")
    print(f"Provider: {info['provider_label']} ({info['active_provider']})")
    print(f"Model Size: {info['model_size_mb']} MB")
    print(f"NPU Active: {info['is_npu']}")

    # 2. Load Audio
    t0 = time.perf_counter()
    audio_array, sample_rate = load_audio(file_path=str(path))
    duration_sec = get_audio_duration(audio_array, sample_rate)
    print(f"Audio Duration: {duration_sec:.2f}s (Sample Rate: {sample_rate}Hz)")

    # 3. Transcribe
    print("Transcribing with Whisper ONNX...")
    transcribe_result = engine.transcribe(audio_array, sample_rate)
    transcript = transcribe_result["text"]
    transcribe_latency_ms = transcribe_result.get("latency_ms", 0.0)

    # 4. Score Risk
    print("Scoring transcript through risk engine...")
    score_res = score_transcript(transcript)
    total_latency_ms = (time.perf_counter() - t0) * 1000

    rtf = (transcribe_latency_ms / 1000) / max(duration_sec, 0.001)

    print("\n--- RESULTS ---")
    print(f"Transcript: {transcript}")
    print(f"Risk Score: {score_res.score}/100")
    print(f"Risk Level: {score_res.risk_level.value.upper()}")
    print(f"Categories Triggered: {score_res.categories_triggered}")
    print(f"Evidence Count: {len(score_res.evidence)}")
    for ev in score_res.evidence:
        print(f"  - [{ev.category}] '{ev.matched_text}' (+{ev.weight} pts)")
    print(f"Transcription Latency: {transcribe_latency_ms:.1f} ms")
    print(f"Total Pipeline Latency: {total_latency_ms:.1f} ms")
    print(f"Real-Time Factor (RTF): {rtf:.3f}")

    return {
        "audio_path": str(path),
        "duration_sec": duration_sec,
        "transcript": transcript,
        "risk_score": score_res.score,
        "risk_level": score_res.risk_level.value,
        "categories": score_res.categories_triggered,
        "evidence": [ev.to_dict() if hasattr(ev, 'to_dict') else vars(ev) for ev in score_res.evidence],
        "transcribe_latency_ms": transcribe_latency_ms,
        "total_latency_ms": total_latency_ms,
        "rtf": rtf,
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        target_file = str(backend_dir.parent / "sample_scam_call.wav")
    validate_audio_file(target_file)
