# KavachAI — Local-First Scam Call Detection

**On-device scam call analysis for Windows using Whisper ONNX and explainable risk scoring.**

KavachAI detects social engineering and scam tactics in English, Hindi, and Hinglish audio conversations. No cloud AI calls. Audio and analysis are processed locally on your machine.

---

## 1. Project Overview

KavachAI is a privacy-first security tool designed to protect users against telecom fraud, financial scams, impersonation attacks, and coercive social engineering. It accepts audio recordings, transcribes them on-device using an ONNX-optimized Whisper model, evaluates the transcript against a deterministic multi-pattern risk matrix, and presents explainable security evidence alongside actionable defensive guidance.

---

## 2. Problem Statement

Voice scam calls (vishing) are among the fastest-growing attack vectors in India and globally:
- **Financial Exploitation**: Unauthorized UPI collect requests, fake refund processing, and OTP extraction.
- **Authority Impersonation**: Callers posing as police officers, customs officials (fake FedEx/courier scams), or bank representatives.
- **Privacy Vulnerability in Cloud Solutions**: Sending intimate or sensitive voice recordings to cloud AI APIs introduces severe data confidentiality and compliance risks.
- **Unexplainable Black-Box Outputs**: Users are frequently given vague safety scores without verifiable evidence or understanding of what triggered the warning.

---

## 3. KavachAI Solution

KavachAI solves these challenges by combining:
1. **Local Processing**: Audio remains in-memory on the user's device and is not uploaded to cloud servers.
2. **Deterministic & Explainable Scoring**: Every flagged point is directly linked to an exact phrase, category, and weight in the transcript.
3. **Multilingual Phrasing Support**: Built-in keyword and regex matching for English, Hindi, and Hinglish code-mixed dialect patterns.
4. **Hardware Portability**: Implements ONNX Runtime with an intelligent provider fallback chain (`QNN` → `DirectML` → `CPU`).

---

## 4. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          KavachAI Architecture                         │
└────────────────────────────────────────────────────────────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           ▼                                           ▼
┌───────────────────────────────┐           ┌────────────────────────────┐
│      Frontend (React/Vite)    │           │     Backend (FastAPI)      │
│  - Dashboard & Scan Views     │ ◄───────► │  - Localhost REST API      │
│  - Risk Gauge & Evidence      │  (HTTP)   │  - In-memory processing    │
│  - Interactive Transcript     │           │  - Ephemeral session state │
│  - Security Copilot & Library │           └──────────────┬─────────────┘
│  - Technical Telemetry Proof  │                          │
└───────────────────────────────┘                          ▼
                                            ┌────────────────────────────┐
                                            │     Whisper ONNX Engine    │
                                            │  - Split Encoder / Decoder │
                                            │  - 80-bin log-mel filter   │
                                            │  - Provider Fallback Chain │
                                            └──────────────┬─────────────┘
                                                           │
                                                           ▼
                                            ┌────────────────────────────┐
                                            │  Deterministic Risk Engine │
                                            │  - EN / HI / Hinglish rules│
                                            │  - Evidence & Guidance     │
                                            └────────────────────────────┘
```

---

## 5. Technology Stack

| Layer | Component | Specification / Version | Purpose |
|---|---|---|---|
| **Frontend** | React 19 + Vite | `vite v6.4.3`, React 19 | Fast desktop-grade UI with dynamic SVG telemetry |
| **Backend API** | FastAPI + Uvicorn | Python 3.14 / Starlette | Localhost-bound (`127.0.0.1:8000`) async API |
| **Speech-to-Text** | Whisper Base ONNX | Hugging Face Optimum Export | Multilingual speech transcription (Encoder + Decoder sessions) |
| **Runtime Engine**| ONNX Runtime | `onnxruntime v1.30.0` | Provider fallback: QNN → DirectML → CPUExecutionProvider |
| **Risk Scoring**  | Rule-Based Engine | Python Dataclasses & Regex | Sub-millisecond deterministic risk evaluation and evidence extraction |
| **Audio Library** | SoundFile & Librosa | 16 kHz Mono Resampling | Audio decoding and log-mel spectrogram pre-processing |

---

## 6. Privacy Architecture

KavachAI implements strict local-first privacy guarantees:
- **No Cloud AI / External API Calls**: The application does not use OpenAI, Anthropic, Google GenAI, or any remote inference APIs. No cloud AI calls. Audio and analysis are processed locally.
- **In-Memory Audio Processing**: Audio files are read directly into memory as byte arrays and are not written to persistent disk storage during analysis.
- **Ephemeral Session State**: Sessions reside in a temporary in-memory map and can be permanently wiped using the "Delete Session" button.
- **Localhost-Only Network Binding**: Backend services bind strictly to `127.0.0.1`.
- **Local Client Storage**: History entries and user settings are stored exclusively in the browser's `localStorage`.

---

## 7. Scam Detection Methodology

KavachAI uses a multi-tiered risk scoring engine:
- **Base Score Range**: 0 to 100 points.
- **Risk Level Thresholds**:
  - `SAFE`: 0 points (No suspicious patterns detected)
  - `LOW`: 1 – 19 points (Minimal risk indicators)
  - `MEDIUM`: 20 – 34 points (Suspicious conversational cues)
  - `HIGH`: 35 – 64 points (Multiple confirmed scam indicators)
  - `CRITICAL`: 65 – 100 points (High-confidence scam with critical threat combination)
- **Multi-Category Penalty**: When 3 or more distinct scam categories are triggered in a single conversation, a compound risk multiplier (+15 points) is automatically added.

### Monitored Attack Categories & Weights
1. **Remote Access** (Weight: 30) — e.g., AnyDesk, TeamViewer, QuickSupport requests.
2. **OTP/PIN Extraction** (Weight: 25) — e.g., Bank OTP, UPI PIN, password solicitation.
3. **Card Phishing** (Weight: 25) — e.g., CVV, expiry date, 16-digit debit/credit card queries.
4. **Urgency & Threats** (Weight: 20) — e.g., Arrest threats, account suspension within hours, police action.
5. **Fake KYC Verification** (Weight: 20) — e.g., Aadhaar update requests, SIM block alerts.
6. **UPI & Payment Fraud** (Weight: 20) — e.g., QR code scanning to "receive" funds, collect request approvals.
7. **Impersonation** (Weight: 15) — e.g., Pretending to be police, bank officials, FedEx, customs, tax authorities.
8. **Suspicious Links / APKs** (Weight: 15) — e.g., External phishing links, sideloaded APK installations.
9. **Prize & Employment Scams** (Weight: 15) — e.g., Lottery rewards, advance-fee work-from-home tasks.

---

## 8. Evidence and Explainability System

Rather than presenting an uninterpretable probability score, KavachAI generates a structured evidence dossier for every scan:
- **Matched Snippets**: Exact substrings from the transcript that triggered a detection rule.
- **Category Slugs & Weights**: Point contributions associated with each detection.
- **Plain-Language Explanations**: Contextual descriptions explaining *why* the tactic is dangerous (e.g., *"Legitimate banks never ask for your 4-digit or 6-digit UPI PIN to send you a refund"*).
- **Interactive Transcript Highlighting**: Clicking any evidence card in the UI automatically highlights and scrolls to the exact segment in the transcript.

---

## 9. Security Copilot

The integrated Security Copilot acts as an interactive defensive advisor, answering key user questions:
- *Why was this flagged?* (Lists triggered categories and score rationale)
- *What did the caller try to obtain?* (Extracts attacker targets such as OTPs, credentials, or device access)
- *What should I do now?* (Provides numbered emergency action steps)
- *Is this definitely a scam?* (Explains pattern match certainty, contextual nuances, and independent verification procedures)
- *How can I protect myself?* (Offers tailored security recommendations based on detected attack vectors)

---

## 10. History, Insights & Scam Library

- **Analysis History**: Filterable, searchable repository of all past local scans stored in the user's browser with one-click clear options.
- **Security Insights**: Local aggregation dashboard displaying total scans, threat ratios, category distribution graphs, and average risk metrics.
- **Scam Library**: A comprehensive knowledge base covering 10 major scam blueprints, red flag checklists, defensive protocols, and Indian helpline contact points (e.g., 1930 / cybercrime.gov.in).

---

## 11. ONNX Whisper Implementation

KavachAI implements Whisper Base using ONNX Runtime:
- **Split Session Architecture**: Utilizes separate `encoder_model.onnx` and `decoder_model.onnx` / `decoder_with_past_model.onnx` sessions.
- **Audio Pre-processing**: Input waveforms are resampled to 16,000 Hz mono float32, converted to 80-bin log-mel filterbanks matching OpenAI Whisper's specification, and sliced into 30-second processing windows.
- **Autoregressive Decoding**: Employs greedy / beam generation via Hugging Face Optimum's speech-to-sequence pipeline with fallback to raw ONNX execution.

---

## 12. Runtime Provider Architecture

In accordance with Qualcomm AI Hub reference patterns, execution providers are dynamically prioritized:
1. **`QNNExecutionProvider`**: Qualcomm Snapdragon NPU (Hexagon Tensor Processor / HTP via `QnnHtp.dll`).
2. **`DmlExecutionProvider`**: DirectML GPU hardware acceleration.
3. **`CPUExecutionProvider`**: Universal x86/ARM CPU fallback.

---

## 13. CPU Fallback Execution

When running on standard Intel/AMD x86-64 hardware without Qualcomm QNN runtime libraries, the system automatically selects `CPUExecutionProvider`.
- The system truthfully reports:
  - `active_provider`: `CPUExecutionProvider`
  - `provider_label`: `CPU fallback`
  - `is_npu`: `false`
- No simulated or fabricated NPU metrics are displayed.

---

## 14. Snapdragon / QNN Deployment Preparation

Snapdragon QNN deployment prepared — physical hardware validation pending.

KavachAI's codebase is architecturally prepared for Snapdragon X Elite / Plus and Windows on ARM:
- **Split Graph Sessions**: Matches Qualcomm QNN deployment guidelines (encoder on NPU, decoder autoregression).
- **Configured Backend Options**: Prepared provider dictionary targeting `QnnHtp.dll` with FP16/INT8 support.
- **Dynamic Provider Binding**: When executed in an ARM64 environment with `onnxruntime-qnn` installed, the engine automatically selects `QNNExecutionProvider` and updates UI indicators dynamically.

---

## 15. Benchmark Results

### Measured Real Inference Baseline (Intel x86-64 CPU)

*Hardware: Intel64 Family 6 Model 186 Stepping 2, Windows 11 Build 26200, Python 3.14.5*

| Metric | Warm Inference | Cold Startup Inference |
|---|---|---|
| **Audio File Duration** | 11.30 s | 11.30 s |
| **Whisper Transcription Latency** | **3,080.9 ms** | 6,747.0 ms |
| **Total End-to-End Latency** | **3,090.2 ms** | 7,887.9 ms |
| **Real-Time Factor (RTF)** | **0.273** *(3.7x faster than real-time)* | 0.597 |
| **AI Model** | Whisper Base (Split ONNX) | Whisper Base (Split ONNX) |
| **Model Size on Disk** | 666.3 MB | 666.3 MB |
| **Execution Provider** | `CPUExecutionProvider` | `CPUExecutionProvider` |
| **NPU Active** | `false` | `false` |

### Controlled Scam Detection Benchmark Suite

*Run via `backend/validate_detection.py`:*

- **Total Controlled Test Cases**: 10
- **Controlled Benchmark Results**: 10/10 controlled cases passed
- **False Negatives in Benchmark**: 0 false negatives
- **False Positives in Benchmark**: 0 false positives

*Note: Controlled benchmark test cases demonstrate rule matching coverage against curated benchmark scripts and do not constitute an exhaustive statistical measure of arbitrary conversational real-world accuracy.*

---

## 16. Current Hardware Limitations

- Current test platform is an Intel x86-64 CPU laptop.
- Hardware-accelerated NPU execution via Qualcomm QNN is unavailable in this environment and falls back to CPU execution.
- DirectML acceleration is disabled or unavailable when native GPU DirectML packages are not installed in the Python environment.

---

## 17. Installation Instructions

### Prerequisites
- **Python**: 3.10 to 3.14
- **Node.js**: 18+ (tested on Node 24)
- **OS**: Windows 11 / Windows 10 (x64 or ARM64)

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## 18. Running Instructions

### Start Backend Server
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Open **http://localhost:5173** in your web browser.

### Build Frontend for Production
```bash
cd frontend
npm run build
```

---

## 19. API Endpoints

All endpoints are hosted locally at `http://127.0.0.1:8000`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns backend health status, model loaded flag, and privacy mode |
| `GET` | `/model-info` | Returns model format, size, active provider, NPU status, and OS hardware specs |
| `POST`| `/analyze` | Accepts `multipart/form-data` audio file (`.wav`, `.mp3`, `.m4a`); returns transcript, risk score, evidence list, and execution telemetry |
| `DELETE` | `/session/{session_id}` | Deletes an ephemeral session from backend memory |

---

## 20. Testing & Validation

### Run Backend Unit Tests
```bash
cd backend
python -m pytest tests/ -v
```
*Current test suite: 32/32 tests passing (model info reporting, provider detection, risk scoring, edge cases, multilingual benchmarks).*

### Run Detection Benchmark Suite
```bash
cd backend
python validate_detection.py
```

### Run Audio Pipeline Validation Script
```bash
cd backend
python validate_audio.py <path_to_audio_file.wav>
```

---

## 21. Known Limitations

1. **Static Pattern Database**: Deterministic rule-based scoring detects known social engineering patterns and keywords. Novel scam scripts with unprecedented phrasing may not trigger high risk scores.
2. **Audio Quality Variance**: High background noise, severe compression, or heavy overlapping speech can reduce transcription accuracy.
3. **Audio File Slicing**: Audio inputs longer than 30 seconds are processed in sequential chunk windows.
4. **Offline Operation**: Initial setup requires downloading Whisper Base ONNX weights; once stored locally, all operations run locally on-device without cloud connectivity.

---

## 22. Future Snapdragon Validation Roadmap

When compatible Snapdragon X Elite / Plus ARM64 hardware becomes available:
1. Validate `onnxruntime-qnn` package installation on Windows on ARM64.
2. Verify dynamic activation of `QNNExecutionProvider` with `QnnHtp.dll`.
3. Measure NPU transcription latency and benchmark power efficiency improvements against the CPU baseline.
4. Benchmark real-time chunk transcription latency on Hexagon NPU.
