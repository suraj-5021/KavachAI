# KavachAI — Project Structure

```
KavachAI/
│
├── backend/                          # Python FastAPI backend
│   ├── models/
│   │   ├── __init__.py
│   │   ├── whisper_engine.py        # Whisper ONNX inference engine
│   │   └── whisper-base/            # ONNX model files (auto-created on first run)
│   │       ├── encoder_model.onnx   # Whisper encoder
│   │       ├── decoder_model.onnx   # Whisper decoder
│   │       └── config.json          # Model config
│   │
│   ├── scoring/
│   │   ├── __init__.py
│   │   └── risk_engine.py           # Deterministic scam pattern matcher
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   └── audio.py                 # Audio loading utilities
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_risk_engine.py      # Pytest test suite
│   │
│   ├── main.py                       # FastAPI server
│   └── requirements.txt              # Python dependencies
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── components/              # (Reserved for future components)
│   │   ├── hooks/                   # (Reserved for custom hooks)
│   │   ├── styles/
│   │   │   └── global.css           # All styles
│   │   ├── App.jsx                  # Main React app component
│   │   └── main.jsx                 # React entry point
│   │
│   ├── public/                       # Static assets (none yet)
│   ├── index.html                    # HTML template
│   ├── vite.config.js                # Vite config
│   └── package.json                  # Node dependencies
│
├── samples/                          # Demo audio samples
│   ├── generate_samples.py          # Sample metadata generator
│   └── samples_metadata.json        # Sample transcript data
│
├── docs/                             # Documentation
│   └── (reserved for architecture diagrams)
│
├── DECISIONS.md                      # Architecture decision log
├── README.md                         # Main documentation
└── .gitignore                        # (To be created)
```

## Data Flow

```
User uploads audio (WAV/MP3)
    ↓
Frontend (React) → HTTP POST /analyze
    ↓
Backend (FastAPI)
    ↓
Audio Loader (utils/audio.py)
    ↓ [numpy array, sample rate]
Whisper ONNX Engine (models/whisper_engine.py)
    ↓
  ┌─────────────────────┐
  │ 1. Mel Spectrogram │
  │ 2. Encoder Session │
  │ 3. Decoder Session │
  │ 4. Tokenizer       │
  └─────────────────────┘
    ↓ [transcript, language, latency]
Risk Engine (scoring/risk_engine.py)
    ↓
  ┌──────────────────────┐
  │ 1. Pattern Matching │
  │ 2. Evidence Collection │
  │ 3. Score Calculation │
  │ 4. Guidance Selection │
  └──────────────────────┘
    ↓ [score, risk_level, evidence, guidance]
JSON Response → Frontend
    ↓
UI Renders:
  - Risk Score Badge
  - Transcript
  - Evidence List
  - Guidance
  - Technical Proof
```

## API Endpoints

### `GET /health`
Health check.

**Response**:
```json
{
  "status": "ok",
  "model_loaded": true,
  "privacy_mode": "on-device-only"
}
```

### `GET /model-info`
Technical details about the loaded model.

**Response**:
```json
{
  "model_name": "whisper-base",
  "model_format": "ONNX",
  "model_size_mb": 289.4,
  "active_provider": "CPUExecutionProvider",
  "provider_label": "CPU fallback",
  "is_npu": false,
  "available_providers": ["CPUExecutionProvider"],
  "onnxruntime_version": "1.30.0",
  "platform": "Windows-11-...",
  "machine": "AMD64",
  "processor": "Intel64 Family 6 Model..."
}
```

### `POST /analyze`
Analyze uploaded audio file.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "session_id": "uuid",
  "transcript": "text...",
  "language": "auto",
  "audio_duration_sec": 30.2,
  "risk_score": 75,
  "risk_level": "high",
  "evidence": [
    {
      "pattern_id": "otp_request_en",
      "category": "OTP/PIN Request",
      "matched_text": "share your otp",
      "position": 45,
      "weight": 25,
      "explanation": "Asking you to share OTP...",
      "language": "en"
    }
  ],
  "categories_triggered": ["OTP/PIN Request", "Urgency/Threats"],
  "guidance": [
    "Never share OTP, PIN, or passwords...",
    "Hang up and call your bank directly..."
  ],
  "confidence_note": "",
  "technical_info": {
    "model": "whisper-base",
    "provider": "CPU fallback",
    "transcribe_latency_ms": 2487.3,
    "total_latency_ms": 2503.1,
    "audio_duration_sec": 30.2
  },
  "latency_ms": 2503.1
}
```

### `DELETE /session/{session_id}`
Delete session data from memory.

**Response**:
```json
{
  "status": "deleted",
  "session_id": "uuid"
}
```

### `GET /sessions`
List all active sessions (debug only).

**Response**:
```json
{
  "count": 2,
  "sessions": [...]
}
```

## Empty Placeholder Files

Create these to complete the structure:

```bash
# Backend __init__.py files
touch backend/models/__init__.py
touch backend/scoring/__init__.py
touch backend/utils/__init__.py
touch backend/tests/__init__.py

# .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
*.egg-info/
dist/
build/

# Node
node_modules/
dist/
.cache/

# Models
backend/models/whisper-*/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
EOF
```
