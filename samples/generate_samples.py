"""Generate synthetic sample audio for KavachAI demo."""

import json
from pathlib import Path

# Sample transcript data — we'll create text transcripts for now
# (Actual audio generation would require TTS, which is out of scope for this baseline)

SAMPLES_DIR = Path(__file__).parent

NORMAL_CALL = {
    "name": "normal_call_demo",
    "transcript": (
        "Hello, this is Sarah calling from City Hospital. "
        "I'm calling to remind you about your appointment with Dr. Sharma "
        "tomorrow at 3 PM. Please bring your prescription and any recent test reports. "
        "If you need to reschedule, you can call us back at 555-0123. "
        "Have a great day!"
    ),
    "expected_score": 0,
    "expected_level": "safe",
    "language": "English",
    "duration_sec": 18,
}

SCAM_CALL_1 = {
    "name": "scam_call_demo_1",
    "transcript": (
        "Hello sir, I am calling from State Bank of India. "
        "Your account will be blocked within 24 hours due to KYC verification pending. "
        "Please share your OTP and card CVV number immediately to verify your identity. "
        "This is urgent, sir. If you don't act now, your account will be suspended. "
        "Also download AnyDesk app so I can help you update KYC remotely."
    ),
    "expected_score": 95,
    "expected_level": "critical",
    "language": "English",
    "duration_sec": 22,
    "matched_patterns": [
        "OTP/PIN Request",
        "Card Detail Phishing",
        "Urgency/Threats",
        "Fake KYC",
        "Remote Access",
        "Impersonation",
    ],
}

SCAM_CALL_2_HINGLISH = {
    "name": "scam_call_demo_2_hinglish",
    "transcript": (
        "Hello ji, main Reserve Bank of India se bol raha hoon. "
        "Aapka account block ho jayega agar aap turant action nahi lete. "
        "Apna OTP aur card number bataiye jaldi se. "
        "AnyDesk app download karo, main help karunga KYC update mein. "
        "Nahi toh police case ho jayega."
    ),
    "expected_score": 90,
    "expected_level": "critical",
    "language": "Hinglish",
    "duration_sec": 20,
    "matched_patterns": [
        "OTP/PIN Request",
        "Urgency/Threats",
        "Remote Access",
        "Impersonation",
        "Card Detail Phishing",
    ],
}

SCAM_CALL_3_PRIZE = {
    "name": "scam_call_demo_3_prize",
    "transcript": (
        "Congratulations! You have won 10 lakh rupees in our lucky draw contest. "
        "To claim your prize, you need to pay a processing fee of 5000 rupees via UPI. "
        "Send money to this number: 9876543210. "
        "This is a limited time offer, you must pay within 1 hour or you will lose the prize."
    ),
    "expected_score": 60,
    "expected_level": "high",
    "language": "English",
    "duration_sec": 18,
    "matched_patterns": [
        "Prize/Job Scam",
        "UPI/Payment Scam",
        "Urgency/Threats",
    ],
}

SAMPLES = [NORMAL_CALL, SCAM_CALL_1, SCAM_CALL_2_HINGLISH, SCAM_CALL_3_PRIZE]


def generate_sample_metadata():
    """Write sample metadata to JSON for reference."""
    output_path = SAMPLES_DIR / "samples_metadata.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(SAMPLES, f, indent=2, ensure_ascii=False)
    print(f"Sample metadata written to {output_path}")


if __name__ == "__main__":
    generate_sample_metadata()
    print("\nSample Transcripts Generated")
    print("=" * 60)
    print(
        "\nNote: Actual audio files require TTS (text-to-speech) generation."
    )
    print(
        "For the baseline demo, you can test by uploading any WAV/MP3 file"
    )
    print("and the transcription will be processed by Whisper.\n")
    print("Sample metadata saved to samples/samples_metadata.json")
