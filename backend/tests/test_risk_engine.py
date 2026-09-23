"""Test suite for KavachAI risk scoring engine."""

import pytest
from scoring.risk_engine import score_transcript, RiskLevel


def test_safe_transcript():
    """Normal call with no scam patterns."""
    text = "Hello, I am calling to remind you about your appointment tomorrow at 3 PM."
    result = score_transcript(text)
    assert result.score == 0
    assert result.risk_level == RiskLevel.SAFE
    assert len(result.evidence) == 0


def test_otp_request_english():
    """OTP request in English."""
    text = "Please share your OTP to verify your account."
    result = score_transcript(text)
    assert result.score >= 25
    assert result.risk_level in [RiskLevel.MEDIUM, RiskLevel.HIGH]
    assert "OTP/PIN Request" in result.categories_triggered
    assert len(result.evidence) > 0


def test_otp_request_hindi():
    """OTP request in Hindi."""
    text = "कृपया अपना OTP बताइए खाता सत्यापित करने के लिए।"
    result = score_transcript(text)
    assert result.score >= 25
    assert "OTP/PIN Request" in result.categories_triggered


def test_otp_request_hinglish():
    """OTP request in Hinglish."""
    text = "Aapka OTP bataiye account verify karne ke liye."
    result = score_transcript(text)
    assert result.score >= 25
    assert "OTP/PIN Request" in result.categories_triggered


def test_urgency_threat():
    """Urgent threat — account will be blocked."""
    text = "Your account will be blocked within 24 hours if you don't act now."
    result = score_transcript(text)
    assert result.score >= 20
    assert "Urgency/Threats" in result.categories_triggered


def test_remote_access_request():
    """Remote access app installation request."""
    text = "Please download AnyDesk so I can help you fix the issue remotely."
    result = score_transcript(text)
    assert result.score >= 30
    assert "Remote Access" in result.categories_triggered


def test_fake_kyc():
    """Fake KYC verification."""
    text = "Your KYC is expired. Please update it immediately."
    result = score_transcript(text)
    assert result.score >= 20
    assert "Fake KYC" in result.categories_triggered


def test_upi_payment_scam():
    """UPI payment request."""
    text = "Send 100 rupees processing fee to receive your refund."
    result = score_transcript(text)
    assert result.score >= 20
    assert "UPI/Payment Scam" in result.categories_triggered


def test_prize_lottery_scam():
    """Prize/lottery scam."""
    text = "Congratulations! You have won a lottery of 10 lakh rupees."
    result = score_transcript(text)
    assert result.score >= 20
    assert "Prize/Job Scam" in result.categories_triggered


def test_impersonation():
    """Impersonation of bank/government."""
    text = "I am calling from Reserve Bank of India regarding your account."
    result = score_transcript(text)
    assert result.score >= 15
    assert "Impersonation" in result.categories_triggered


def test_card_details_phishing():
    """Card details phishing."""
    text = "What is your card number and CVV for verification?"
    result = score_transcript(text)
    assert result.score >= 25
    assert "Card Detail Phishing" in result.categories_triggered


def test_combined_high_risk():
    """Multiple scam patterns — should score very high."""
    text = (
        "I am calling from SBI. Your account will be blocked. "
        "Please share your OTP and card number immediately. "
        "Download AnyDesk to verify."
    )
    result = score_transcript(text)
    assert result.score >= 70
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert len(result.categories_triggered) >= 3


def test_short_transcript_confidence_note():
    """Very short transcript should include confidence warning."""
    text = "OTP batao"
    result = score_transcript(text)
    assert "short transcript" in result.confidence_note.lower()


def test_empty_transcript():
    """Empty transcript."""
    result = score_transcript("")
    assert result.score == 0
    assert result.risk_level == RiskLevel.SAFE
    assert "No transcript available" in result.confidence_note


def test_guidance_presence():
    """Ensure guidance is provided for flagged calls."""
    text = "Please share your OTP immediately."
    result = score_transcript(text)
    assert len(result.guidance) > 0
    assert any("never share" in g.lower() for g in result.guidance)


def test_evidence_details():
    """Ensure evidence includes required fields."""
    text = "Your account will be suspended. Share your OTP now."
    result = score_transcript(text)
    assert len(result.evidence) >= 2
    for ev in result.evidence:
        assert ev.pattern_id
        assert ev.category
        assert ev.matched_text
        assert ev.weight > 0
        assert ev.explanation
        assert ev.language in ["en", "hi", "hinglish"]


def test_score_cap():
    """Score should cap at 100 even with many matches."""
    text = (
        "Share OTP PIN password CVV card number account details. "
        "Your account will be blocked arrested legal action police. "
        "Download AnyDesk immediately urgent now. "
        "I am from RBI Reserve Bank police CBI. "
        "You won lottery prize gift cashback. "
        "Pay processing fee refund UPI collect."
    ) * 10  # Repeat to trigger many matches
    result = score_transcript(text)
    assert result.score <= 100


# ─── 10 Benchmark Category Tests ──────────────────────────────────────────


def test_benchmark_1_normal_conversation():
    """Category 1: Normal conversation — must be SAFE/low risk."""
    text = "Hi, how are you? What time are we meeting today?"
    result = score_transcript(text)
    assert result.score == 0
    assert result.risk_level == RiskLevel.SAFE
    assert len(result.evidence) == 0


def test_benchmark_2_normal_financial_conversation():
    """Category 2: Normal financial conversation — presence of financial terms must not trigger scam flags."""
    text = "I transferred money to my friend yesterday and checked my bank balance."
    result = score_transcript(text)
    assert result.score == 0
    assert result.risk_level == RiskLevel.SAFE
    assert len(result.evidence) == 0


def test_benchmark_3_bank_otp_scam():
    """Category 3: Bank impersonation + OTP credential request — must be HIGH risk."""
    text = "Hello, I am calling from HDFC Bank. Your account has suspicious activity. Tell me the OTP you just received so I can secure your account."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "Impersonation" in result.categories_triggered
    assert "OTP/PIN Request" in result.categories_triggered
    assert any("hdfc bank" in e.matched_text.lower() for e in result.evidence)
    assert any("otp" in e.matched_text.lower() for e in result.evidence)


def test_benchmark_4_upi_payment_scam():
    """Category 4: Fake refund + UPI PIN / collect request — must be HIGH risk."""
    text = "Your refund is pending. Open your UPI app and approve this collect request and enter your UPI PIN to receive the refund."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "UPI/Payment Scam" in result.categories_triggered
    assert "OTP/PIN Request" in result.categories_triggered


def test_benchmark_5_account_suspension_scam():
    """Category 5: Account suspension threat + Fake KYC link — must be HIGH risk."""
    text = "Your bank account will be blocked today because of suspicious activity. Verify your KYC immediately using the link I am sending."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "Urgency/Threats" in result.categories_triggered
    assert "Fake KYC" in result.categories_triggered
    assert "Suspicious Link" in result.categories_triggered


def test_benchmark_6_remote_access_scam():
    """Category 6: Tech support impersonation + AnyDesk remote access — must be HIGH risk."""
    text = "I am from technical support. Install AnyDesk and give me remote access so I can fix the problem with your account."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "Remote Access" in result.categories_triggered
    assert "Impersonation" in result.categories_triggered


def test_benchmark_7_fake_courier_scam():
    """Category 7: FedEx impersonation + illegal parcel threat + customs penalty — must be HIGH risk."""
    text = "I am calling from FedEx. Your parcel contains illegal items. Pay the customs penalty immediately or police action will be taken."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "Impersonation" in result.categories_triggered
    assert "Urgency/Threats" in result.categories_triggered
    assert "UPI/Payment Scam" in result.categories_triggered


def test_benchmark_8_suspicious_link_scam():
    """Category 8: Phishing link + bank login credentials and OTP — must be HIGH risk."""
    text = "Click this link and enter your bank login and OTP to verify your account."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "Suspicious Link" in result.categories_triggered
    assert "Fake KYC" in result.categories_triggered
    assert ("OTP/PIN Request" in result.categories_triggered or "Card Detail Phishing" in result.categories_triggered)


def test_benchmark_9_hindi_scam():
    """Category 9: Hindi bank impersonation + OTP request + block threat — must be HIGH risk."""
    text = "Main HDFC bank se bol raha hoon. Aapke account mein suspicious activity hai. OTP bataiye warna account block ho jayega."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "OTP/PIN Request" in result.categories_triggered
    assert "Urgency/Threats" in result.categories_triggered


def test_benchmark_10_hinglish_scam():
    """Category 10: Hinglish security team + suspension threat + OTP + UPI PIN — must be HIGH risk."""
    text = "Main bank security team se bol raha hoon. Aapka account suspend hone wala hai. OTP share karo aur verification ke liye UPI PIN enter karo."
    result = score_transcript(text)
    assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    assert "OTP/PIN Request" in result.categories_triggered
    assert "UPI/Payment Scam" in result.categories_triggered

