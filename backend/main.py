"""
KavachAI — FastAPI backend server.

Provides a local-only HTTP API for audio upload and scam detection.
No external network calls, no telemetry, no cloud dependencies.
"""

import logging
import time
import uuid
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from models.whisper_engine import WhisperONNX
from scoring.risk_engine import score_transcript
from utils.audio import load_audio, get_audio_duration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="KavachAI Backend",
    description="Local-first scam call detection API. Offline, private, explainable.",
    version="0.1.0",
)

# CORS — localhost and 127.0.0.1 support
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global State ───────────────────────────────────────────────────

whisper_model: Optional[WhisperONNX] = None
sessions: dict[str, dict] = {}  # In-memory session storage


# ─── Pydantic Models ────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    privacy_mode: str = "on-device-only"


class ModelInfoResponse(BaseModel):
    model_name: str
    model_format: str
    model_size_mb: float
    active_provider: str
    provider_label: str
    is_npu: bool
    available_providers: list[str]
    onnxruntime_version: str
    platform: str
    machine: str
    processor: str


class AnalysisResponse(BaseModel):
    session_id: str
    transcript: str
    language: str
    audio_duration_sec: float
    risk_score: int
    risk_level: str
    evidence: list[dict]
    categories_triggered: list[str]
    guidance: list[str]
    confidence_note: str
    technical_info: dict
    latency_ms: float


# ─── Startup / Shutdown ──────────────────────────────────────────────


@app.on_event("startup")
async def startup():
    """Load Whisper model on startup."""
    global whisper_model
    logger.info("KavachAI backend starting...")
    logger.info("Loading Whisper ONNX model...")
    try:
        whisper_model = WhisperONNX(model_name="whisper-base")
        whisper_model.load()
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Model load failed: {e}")
        logger.warning("Server will start but /analyze endpoint will fail.")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown."""
    logger.info("KavachAI backend shutting down...")
    sessions.clear()


# ─── Endpoints ───────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        model_loaded=whisper_model is not None and whisper_model.is_loaded,
        privacy_mode="on-device-only",
    )


@app.get("/model-info", response_model=ModelInfoResponse)
async def model_info():
    """Return technical details about the loaded model and execution provider."""
    if whisper_model is None or not whisper_model.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Check server logs for startup errors.",
        )
    info = whisper_model.get_info()
    return ModelInfoResponse(**info)


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyze an uploaded audio file for scam risk.

    Flow:
    1. Load audio (WAV/MP3)
    2. Transcribe via Whisper ONNX
    3. Score transcript via risk engine
    4. Return results with technical proof and guidance

    Privacy: Audio bytes are processed in-memory only, not saved to disk.
    """
    if whisper_model is None or not whisper_model.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded yet. Try again in a few seconds.",
        )

    start_time = time.perf_counter()

    # Generate session ID
    session_id = str(uuid.uuid4())

    try:
        # Read uploaded file
        audio_bytes = await file.read()
        logger.info(
            f"[{session_id}] Received audio file: {file.filename} "
            f"({len(audio_bytes)} bytes)"
        )

        # Load audio
        audio_array, sample_rate = load_audio(file_bytes=audio_bytes)
        duration_sec = get_audio_duration(audio_array, sample_rate)
        logger.info(
            f"[{session_id}] Audio loaded: {duration_sec:.1f}s @ {sample_rate}Hz"
        )

        # Transcribe
        logger.info(f"[{session_id}] Transcribing...")
        transcription_result = whisper_model.transcribe(audio_array, sample_rate)
        transcript = transcription_result["text"]
        language = transcription_result.get("language", "auto")
        transcribe_latency_ms = transcription_result.get("latency_ms", 0)
        logger.info(f"[{session_id}] Transcript: {transcript[:100]}...")

        # Score transcript
        logger.info(f"[{session_id}] Scoring...")
        scoring_result = score_transcript(transcript)
        logger.info(
            f"[{session_id}] Risk score: {scoring_result.score}/100 "
            f"({scoring_result.risk_level.value})"
        )

        # Store session (in-memory only)
        sessions[session_id] = {
            "transcript": transcript,
            "score": scoring_result.score,
            "risk_level": scoring_result.risk_level.value,
            "timestamp": time.time(),
        }

        total_latency_ms = (time.perf_counter() - start_time) * 1000

        # Technical info for proof screen
        model_info_data = whisper_model.get_info()
        rtf = round((transcribe_latency_ms / 1000) / max(duration_sec, 0.001), 3)
        technical_info = {
            "model": model_info_data["model_name"],
            "model_format": model_info_data["model_format"],
            "model_size_mb": model_info_data["model_size_mb"],
            "provider": model_info_data["provider_label"],
            "active_provider": model_info_data["active_provider"],
            "is_npu": model_info_data["is_npu"],
            "available_providers": model_info_data["available_providers"],
            "onnxruntime_version": model_info_data["onnxruntime_version"],
            "platform": model_info_data["platform"],
            "machine": model_info_data["machine"],
            "processor": model_info_data["processor"],
            "transcribe_latency_ms": transcribe_latency_ms,
            "total_latency_ms": round(total_latency_ms, 1),
            "audio_duration_sec": round(duration_sec, 1),
            "rtf": rtf,
        }

        return AnalysisResponse(
            session_id=session_id,
            transcript=transcript,
            language=language,
            audio_duration_sec=round(duration_sec, 1),
            risk_score=scoring_result.score,
            risk_level=scoring_result.risk_level.value,
            evidence=scoring_result.to_dict()["evidence"],
            categories_triggered=scoring_result.categories_triggered,
            guidance=scoring_result.guidance,
            confidence_note=scoring_result.confidence_note,
            technical_info=technical_info,
            latency_ms=round(total_latency_ms, 1),
        )

    except Exception as e:
        logger.error(f"[{session_id}] Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session from memory."""
    if session_id in sessions:
        del sessions[session_id]
        logger.info(f"Session {session_id} deleted")
        return {"status": "deleted", "session_id": session_id}
    else:
        raise HTTPException(status_code=404, detail="Session not found")


@app.get("/sessions")
async def list_sessions():
    """List all active sessions (for debugging)."""
    return {
        "count": len(sessions),
        "sessions": [
            {"session_id": sid, **data} for sid, data in sessions.items()
        ],
    }


# ─── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
    )
