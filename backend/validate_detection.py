"""
Validation script for KavachAI Scam Detection Engine.
Runs controlled tests across 10 exact categories plus negative / normal conversations.
"""

import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from scoring.risk_engine import score_transcript, RiskLevel, SCAM_PATTERNS


def run_validation():
    test_cases = [
        {
            "id": 1,
            "name": "NORMAL CONVERSATION",
            "transcript": "Hi, how are you? What time are we meeting today?",
            "expected_level": "SAFE / low risk",
            "acceptable_levels": [RiskLevel.SAFE, RiskLevel.LOW],
            "is_scam": False,
        },
        {
            "id": 2,
            "name": "NORMAL FINANCIAL CONVERSATION",
            "transcript": "I transferred money to my friend yesterday and checked my bank balance.",
            "expected_level": "SAFE or low risk",
            "acceptable_levels": [RiskLevel.SAFE, RiskLevel.LOW],
            "is_scam": False,
        },
        {
            "id": 3,
            "name": "BANK + OTP SCAM",
            "transcript": "Hello, I am calling from HDFC Bank. Your account has suspicious activity. Tell me the OTP you just received so I can secure your account.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 4,
            "name": "UPI PAYMENT SCAM",
            "transcript": "Your refund is pending. Open your UPI app and approve this collect request and enter your UPI PIN to receive the refund.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 5,
            "name": "ACCOUNT SUSPENSION SCAM",
            "transcript": "Your bank account will be blocked today because of suspicious activity. Verify your KYC immediately using the link I am sending.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 6,
            "name": "REMOTE ACCESS SCAM",
            "transcript": "I am from technical support. Install AnyDesk and give me remote access so I can fix the problem with your account.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 7,
            "name": "FAKE COURIER SCAM",
            "transcript": "I am calling from FedEx. Your parcel contains illegal items. Pay the customs penalty immediately or police action will be taken.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 8,
            "name": "SUSPICIOUS LINK SCAM",
            "transcript": "Click this link and enter your bank login and OTP to verify your account.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 9,
            "name": "HINDI SCAM",
            "transcript": "Main HDFC bank se bol raha hoon. Aapke account mein suspicious activity hai. OTP bataiye warna account block ho jayega.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
        {
            "id": 10,
            "name": "HINGLISH SCAM",
            "transcript": "Main bank security team se bol raha hoon. Aapka account suspend hone wala hai. OTP share karo aur verification ke liye UPI PIN enter karo.",
            "expected_level": "HIGH risk",
            "acceptable_levels": [RiskLevel.HIGH, RiskLevel.CRITICAL],
            "is_scam": True,
        },
    ]

    print("=" * 60)
    print("DETECTION VALIDATION RUN")
    print("=" * 60)

    expected_scams = sum(1 for tc in test_cases if tc["is_scam"])
    true_detections = 0
    false_negatives = 0
    false_positives = 0
    passed_all = True

    for tc in test_cases:
        res = score_transcript(tc["transcript"])
        is_high_or_crit = res.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        passed = res.risk_level in tc["acceptable_levels"]

        if not passed:
            passed_all = False

        if tc["is_scam"]:
            if is_high_or_crit:
                true_detections += 1
            else:
                false_negatives += 1
        else:
            if is_high_or_crit or res.risk_level == RiskLevel.MEDIUM:
                false_positives += 1

        print(f"\nTest {tc['id']}: {tc['name']}")
        print(f"Transcript: {tc['transcript']}")
        print(f"Expected: {tc['expected_level']}")
        print(f"Actual: score={res.score}, risk_level={res.risk_level.value}")
        print(f"PASS/FAIL: {'PASS' if passed else 'FAIL'}")
        print(f"Categories Triggered: {res.categories_triggered}")
        print("Evidence:")
        for ev in res.evidence:
            print(f"  - [{ev.category}] '{ev.matched_text}' (weight: {ev.weight}, pattern: {ev.pattern_id})")
        print(f"Guidance: {res.guidance}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print(f"Total Tests: {len(test_cases)}")
    print(f"True/expected detections: {true_detections}/{expected_scams}")
    print(f"False negatives: {false_negatives}")
    print(f"False positives: {false_positives}")
    print(f"Overall Result: {'PASS' if passed_all else 'FAIL'}")
    print("=" * 60)


if __name__ == "__main__":
    run_validation()
