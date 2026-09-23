# KavachAI — Decision Log

## D1: ONNX Runtime over PyTorch for inference
**Decision:** Use `onnxruntime` (1.30.0) with ONNX-format Whisper, not raw PyTorch.
**Why:** Qualcomm AI Hub's Whisper Windows example uses ONNX Runtime with a provider
fallback chain: QNNExecutionProvider → DmlExecutionProvider → CPUExecutionProvider.
ONNX Runtime is the only path to Snapdragon NPU via QNN EP. On non-Snapdragon hardware
it gracefully falls back to CPU.
**Trade-off:** Requires exporting Whisper to ONNX (via Hugging Face Optimum). Slightly
more setup than `import whisper`, but enables hardware portability.

## D2: Whisper Base (not Tiny) as default model
**Decision:** Ship with Whisper Base EN (74M params, ~290 MB ONNX).
**Why:** Whisper Tiny's accuracy on Hindi/Hinglish is poor. Whisper Base is the smallest
model that produces usable Hindi transcripts. Still runs in <3s per 30s chunk on CPU.
**Fallback:** If download fails, code also supports `whisper-tiny` as a flag.

## D3: Deterministic rule-based scoring — no LLM
**Decision:** Risk engine is a rule-based pattern matcher, not an LLM.
**Why:** (a) Explainability: every flagged phrase maps to a rule the user can inspect.
(b) Offline guarantee: no API calls, no cloud dependency. (c) Speed: <10ms per transcript.
(d) Transparency: we can show exactly why a score was assigned.
**Trade-off:** Cannot detect novel scam patterns. We document this as a known limitation.

## D4: Intel x64 CPU fallback is the honest default
**Decision:** On this hardware (Intel i5-13420H, x86-64), we label inference as
"CPU fallback" and do NOT claim NPU acceleration.
**Why:** QNN EP requires Qualcomm Hexagon NPU on ARM64. The code architecture supports
QNN, but we refuse to lie about what's actually running. The Technical Proof screen
shows the active provider name directly from `ort.get_available_providers()`.

## D5: Separate encoder/decoder ONNX models
**Decision:** Use split encoder + decoder ONNX files (Qualcomm AI Hub pattern), not a
monolithic model.
**Why:** Qualcomm's example splits Whisper into `whisper_encoder.onnx` and
`whisper_decoder.onnx`. This matches how QNN EP works (separate session per component)
and allows placing encoder on NPU while decoder stays on CPU if needed.
**Implementation:** We use Hugging Face Optimum to export, which produces this split
format natively.

## D6: FastAPI backend + React frontend
**Decision:** Python FastAPI for the backend API, React (Vite) for the frontend.
**Why:** FastAPI is already installed. React gives a clean desktop-style UI. Communication
is localhost-only HTTP — no external network calls.

## D7: Privacy-first — no data retention by default
**Decision:** Audio is processed in-memory, transcripts are session-only, and a
"Delete Session" button wipes everything.
**Why:** The product promise is "local-first, private." We enforce this in code — there
are no outbound HTTP calls, no telemetry, no logging of audio content to disk.

## D8: Multilingual support via keyword dictionaries
**Decision:** Scam detection patterns include English, Hindi, and Hinglish phrases.
**Why:** Indian scam calls commonly code-switch between Hindi and English. A pure
English-only detector would miss "aapka OTP batayein" or "KYC verify karein".
Whisper Base supports Hindi transcription natively.

## D9: Python 3.14 compatibility confirmed
**Decision:** Stay on system Python 3.14.5.
**Why:** onnxruntime 1.30.0 installed and works. No need for a separate Python version.
