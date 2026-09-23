"""
KavachAI — Deterministic scam-call risk scoring engine.

Scores transcripts from 0–100 using explainable, rule-based pattern matching.
No cloud LLM, no opaque model — every point is traceable to a matched rule.

Supports English, Hindi, and Hinglish (Hindi-English code-mixing) patterns.
"""

import re
from dataclasses import dataclass, field
from enum import Enum


class RiskLevel(str, Enum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Evidence:
    """A single piece of evidence that contributed to the risk score."""
    pattern_id: str
    category: str
    matched_text: str
    position: int  # character offset in transcript
    weight: int  # points contributed to total score
    explanation: str  # human-readable why this is suspicious
    language: str  # en, hi, hinglish


@dataclass
class ScoringResult:
    """Complete result from the risk engine."""
    score: int  # 0–100
    risk_level: RiskLevel
    evidence: list[Evidence] = field(default_factory=list)
    categories_triggered: list[str] = field(default_factory=list)
    guidance: list[str] = field(default_factory=list)
    confidence_note: str = ""

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "risk_level": self.risk_level.value,
            "evidence": [
                {
                    "pattern_id": e.pattern_id,
                    "category": e.category,
                    "matched_text": e.matched_text,
                    "position": e.position,
                    "weight": e.weight,
                    "explanation": e.explanation,
                    "language": e.language,
                }
                for e in self.evidence
            ],
            "categories_triggered": self.categories_triggered,
            "guidance": self.guidance,
            "confidence_note": self.confidence_note,
        }


# ─── Scam Pattern Definitions ─────────────────────────────────────
# Each pattern: (pattern_id, category, regex, weight, explanation, language)

SCAM_PATTERNS: list[tuple[str, str, str, int, str, str]] = [
    # ── OTP / PIN / Password Requests ──
    (
        "otp_request_en",
        "OTP/PIN Request",
        r"\b(?:share|tell|give|send|provide|verify|confirm|enter|input|read(?:\s+out)?)\b(?:[^\.\,\;\!\?]{0,40}?)\b(?:otp|o\.t\.p|one[\s\-]time[\s\-]password|(?:upi\s+|atm\s+|card\s+|mpin\s+|m[\s\-]pin\s+)?pin|password|cvv|mpin|security\s+code|login\s+credentials)\b",
        25,
        "Asking you to share OTP, PIN, or password. Legitimate institutions never ask for these.",
        "en",
    ),
    (
        "otp_request_hi",
        "OTP/PIN Request",
        r"(?:otp|ओटीपी|पिन|pin|password|पासवर्ड|cvv)\s*(?:बताइए|बताओ|बताएं|भेजो|भेजिए|दीजिए|दो|बता\s*दें|share\s*करो|share\s*करें|शेयर\s*करो|शेयर\s*करें|दर्ज\s*करें|दर्ज\s*करो|बताना|दें)",
        25,
        "OTP/PIN मांगा जा रहा है। कोई भी बैंक या सरकारी संस्था कभी OTP नहीं मांगती।",
        "hi",
    ),
    (
        "otp_request_hinglish",
        "OTP/PIN Request",
        r"(?:(?:aapka|apna|tumhara|your|mujhe|humein)?\s*(?:otp|pin|upi\s*pin|password|mpin|cvv|code)\s*(?:batao|batayein|bataiye|bata\s*do|de\s*do|share\s*karo|bhejo|send\s*karo|enter\s*karo|daalo|type\s*karo|bolo)|(?:enter|daalo|type\s*karo|share\s*karo|batao|bataiye)\s+(?:apna|aapka|tumhara|your)?\s*(?:otp|pin|upi\s*pin|password|mpin|cvv))",
        25,
        "OTP/PIN share करने को कहा जा रहा है — scam indicator.",
        "hinglish",
    ),

    # ── Urgent Threats / Pressure ──
    (
        "urgent_threat_en",
        "Urgency/Threats",
        r"\b(?:(?:bank\s+)?account\s+(?:will\s+be\s+)?(?:blocked|suspended|frozen|closed|deactivated)|arrest\s+warrant|arrest\s+you|legal\s+action|police\s+(?:action|complaint|case)|case\s+(?:filed|registered)|immediately|within\s+\d+\s*(?:hour|minute|min|day)s?|right\s+now|urgent(?:ly)?|today\s+unless|action\s+will\s+be\s+taken|illegal\s+(?:items?|goods|parcel|package|substance|drugs?)|digital\s+arrest)\b",
        20,
        "Creating urgency or threatening consequences. Scammers pressure you to act without thinking.",
        "en",
    ),
    (
        "urgent_threat_hi",
        "Urgency/Threats",
        r"(?:खाता\s*(?:बंद|ब्लॉक|सस्पेंड)|गिरफ्तार|कानूनी\s*कार्रवाई|पुलिस\s*(?:केस|शिकायत|कार्रवाई)|तुरंत|अभी|फौरन|जल्दी\s*करो|नहीं\s*तो|आज\s*ही|अवैध\s*(?:सामान|पार्सल))",
        20,
        "डराने या जल्दबाजी करने की कोशिश — scam का संकेत।",
        "hi",
    ),
    (
        "urgent_threat_hinglish",
        "Urgency/Threats",
        r"(?:account\s*(?:block|band|suspend|freeze)\s*(?:ho\s*jayega|kar\s*denge|hoga|hone\s*wala\s*hai|hone\s*waala\s*hai|ho\s*raha\s*hai)|arrest\s*(?:ho\s*jaoge|kar\s*lenge|karenge)|legal\s*action\s*(?:lenge|hoga)|police\s*(?:action|case|complaint)|jaldi\s*karo|abhi\s*turant|nahi\s*toh|aaj\s*hi|digital\s*arrest)",
        20,
        "Account block/arrest की धमकी — scam tactic.",
        "hinglish",
    ),

    # ── Remote Access App Requests ──
    (
        "remote_access_en",
        "Remote Access",
        r"\b(?:(?:download|install|open|run)\s+(?:anydesk|teamviewer|quick\s*support|screen\s*share|remote\s*desktop|rustdesk)|(?:give|grant|provide|allow)\s+(?:me\s+)?(?:remote\s+access|screen\s*share|device\s*control)|remote\s+access\b)",
        30,
        "Asking to install remote access software. Scammers use this to control your device.",
        "en",
    ),
    (
        "remote_access_hi",
        "Remote Access",
        r"(?:anydesk|teamviewer|quicksupport|rustdesk)\s*(?:डाउनलोड|इंस्टॉल|खोलो|चालू\s*करो|डालो)|(?:रिमोट\s*एक्सेस|स्क्रीन\s*शेयर)",
        30,
        "Remote access app install करने को कहा — scammer आपका फ़ोन/कंप्यूटर control कर सकता है।",
        "hi",
    ),
    (
        "remote_access_hinglish",
        "Remote Access",
        r"(?:anydesk|teamviewer|quick\s*support|rustdesk)\s*(?:download\s*karo|install\s*karo|kholo|daal\s*lo|open\s*karo)|(?:remote\s*access|screen\s*share|control\s*do)",
        30,
        "Remote access app install करने को कहा — scam red flag.",
        "hinglish",
    ),

    # ── Fake KYC / Verification ──
    (
        "fake_kyc_en",
        "Fake KYC",
        r"\b(?:kyc\s+(?:is\s+)?(?:verification|update|expired|pending|mandatory|complete|is\s+pending)|(?:account|identity|card|profile|sim)\s+(?:verification|update|validation|needs\s+verification)|(?:complete|do|finish|submit)\s+(?:this\s+)?(?:verification|kyc)|verify\s+your\s+(?:kyc|identity|aadhaar|aadhar|pan|account|profile|details)|link\s+(?:aadhaar|aadhar|pan))\b",
        20,
        "Fake KYC verification request. Banks do KYC in-branch, not over phone calls.",
        "en",
    ),
    (
        "fake_kyc_hi",
        "Fake KYC",
        r"(?:kyc|केवाईसी|आधार|पैन)\s*(?:अपडेट|वेरिफ़ाई|verify|update|पेंडिंग|expired|ज़रूरी|करवाना|करो|कराओ|करें|कीजिए)",
        20,
        "फ़ोन पर KYC verification — बैंक ऐसा कभी नहीं करता।",
        "hi",
    ),
    (
        "fake_kyc_hinglish",
        "Fake KYC",
        r"(?:kyc|aadhar|aadhaar|pan|account)\s*(?:update\s*karo|verify\s*karo|link\s*karo|karao|karwao|karna\s*padega|expire\s*ho\s*gaya|verification\s*pending|verify\s*karna)",
        20,
        "Phone pe KYC update — typical scam pattern.",
        "hinglish",
    ),

    # ── UPI / Payment Requests ──
    (
        "upi_request_en",
        "UPI/Payment Scam",
        r"\b(?:send\s+(?:(?:the|a|this)\s+)?(?:money|payment|amount|fee|processing\s+(?:fee|amount|charge))|upi\s+(?:collect|request|pay|pin|id|app)|pay\s+(?:the\s+)?(?:customs\s+(?:penalty|fee|duty|charges?|tax)|penalty|fine|fee|charge|charges|amount|money|customs|tax|now|immediately|first)|processing\s+(?:fee|amount|charge)|refund(?:able)?\s+(?:fee|charge|amount|is\s+pending)|refund\s+is\s+pending|(?:approve|accept)\s+(?:this\s+|the\s+)?(?:collect\s+request|upi\s+request|payment\s+request|collect)|scan\s+(?:this\s+)?(?:qr\s*code|qr))\b",
        20,
        "Requesting payment or UPI transaction. Scammers often ask for 'processing fees' or misuse UPI collect.",
        "en",
    ),
    (
        "upi_request_hi",
        "UPI/Payment Scam",
        r"(?:पैसे\s*(?:भेजो|भेजिए|transfer\s*करो)|upi\s*(?:collect|request|pin)|(?:processing|refund(?:able)?)\s*(?:fee|charge|शुल्क|amount)|पहले\s*(?:pay|भुगतान)\s*करो|qr\s*code\s*स्कैन\s*करो|कस्टम्स\s*(?:पेनाल्टी|चार्ज|शुल्क))",
        20,
        "पैसे भेजने या UPI collect accept करने को कहा — scam indicator.",
        "hi",
    ),
    (
        "upi_request_hinglish",
        "UPI/Payment Scam",
        r"(?:paisa|paise|money|amount)\s*(?:bhejo|send\s*karo|transfer\s*karo|de\s*do)|upi\s*(?:collect|request|pin|app)\s*(?:accept|approve|karo|daalo|enter\s*karo)|(?:processing|refund|customs|penalty)\s*(?:fee|amount|charge|penalty)\s*(?:bhejo|pay\s*karo|de\s*do)|qr\s*(?:code\s*)?scan\s*karo",
        20,
        "Paise bhejne ko kaha ja raha hai — scam red flag.",
        "hinglish",
    ),

    # ── Prize / Lottery / Job Scam ──
    (
        "prize_scam_en",
        "Prize/Job Scam",
        r"\b(?:(?:won|win|selected\s+for)\s+(?:a\s+)?(?:prize|lottery|reward|cashback|gift|lucky\s+draw)|congratulations?\s+you(?:'ve)?\s+(?:won|been\s+selected)|(?:work\s+from\s+home|earn)\s+(?:\d+[kK]?\s+)?(?:per\s+(?:day|month|hour)|daily|monthly))\b",
        20,
        "Prize/lottery/easy-money claims are classic scam bait. If you didn't enter, you didn't win.",
        "en",
    ),
    (
        "prize_scam_hi",
        "Prize/Job Scam",
        r"(?:(?:इनाम|prize|lottery|लॉटरी|cashback|gift)\s*(?:जीता|मिला|जीत\s*गए|लगी|लगा)|बधाई|(?:घर\s*बैठे|work\s*from\s*home)\s*(?:कमाओ|कमाएं|earn))",
        20,
        "इनाम/लॉटरी/आसान पैसे का लालच — scam pattern.",
        "hi",
    ),
    (
        "prize_scam_hinglish",
        "Prize/Job Scam",
        r"(?:prize|lottery|inaam|gift)\s*(?:jeeta|jeet\s*gaye|mila|milega|mile\s*ga)|(?:ghar\s*baithe|work\s*from\s*home)\s*(?:kamao|earn\s*karo|paisa\s*kamao)",
        20,
        "Prize/lottery/easy money scam pattern.",
        "hinglish",
    ),

    # ── Impersonation ──
    (
        "impersonation_en",
        "Impersonation",
        r"\b(?:(?:i\s+am|this\s+is|calling\s+from|we\s+are\s+from|speak(?:ing)?\s+from|i\s+am\s+from)\s+(?:(?:the|your)\s+)?(?:reserve\s+bank|rbi|sbi|hdfc|icici|axis|pnb|bank|police|cyber\s*(?:cell|crime|security)|income\s+tax|cbi|customs|narcotics|ncb|trai|telecom\s+authority|microsoft|amazon|flipkart|fedex|courier|(?:technical|tech|customer|it)\s+support|support\s*team|fraud\s*department|security\s*team)(?:\s+bank)?)\b",
        15,
        "Claiming to be from a government agency or major company. Verify independently — don't trust the caller.",
        "en",
    ),
    (
        "impersonation_hi",
        "Impersonation",
        r"(?:(?:मैं|हम)\s*(?:बैंक|RBI|SBI|HDFC|ICICI|AXIS|पुलिस|साइबर\s*(?:सेल|क्राइम)|इनकम\s*टैक्स|CBI|कस्टम्स|TRAI|फेडेक्स|FedEx|कूरियर|सपोर्ट)\s*(?:से|का|के)?\s*(?:बोल\s*रहा|बोल\s*रही|बात\s*कर\s*रहा|अधिकारी))",
        15,
        "सरकारी/बैंक अधिकारी बनकर कॉल — सीधे संस्था को कॉल करके verify करें।",
        "hi",
    ),
    (
        "impersonation_hinglish",
        "Impersonation",
        r"(?:main|hum|mai)\s*(?:(?:hdfc|icici|sbi|axis|pnb|rbi|bank)(?:\s+bank)?|police|cyber\s*cell|income\s*tax|cbi|trai|fedex|courier|bank\s*(?:security\s*team|fraud\s*department|support\s*team))\s*(?:se|ka|ki)\s*(?:bol\s*raha|bol\s*rahi|call\s*kar\s*raha|officer)",
        15,
        "Bank/government officer ban ke call — verify karo khud call karke.",
        "hinglish",
    ),

    # ── Link / App Install ──
    (
        "suspicious_link_en",
        "Suspicious Link",
        r"\b(?:click\s+(?:on\s+)?(?:this|the)\s+link|(?:visit|go\s+to|open)\s+(?:this\s+)?(?:link|url|website)|(?:using|via|follow)\s+(?:the|this)\s+link|(?:link|url)\s+(?:i\s+am\s+|i\s+|we\s+)?(?:sending|sent|provided|sharing)|bit\.ly|tinyurl|(?:download|install)\s+(?:this|our)\s+app)\b",
        15,
        "Directing you to click links or install unknown apps — potential phishing or malware.",
        "en",
    ),
    (
        "suspicious_link_hinglish",
        "Suspicious Link",
        r"(?:link\s*(?:pe\s*click\s*karo|kholo|open\s*karo|bhej\s*raha|bheja\s*hai)|app\s*(?:download\s*karo|install\s*karo|daal\s*lo))",
        15,
        "Suspicious link/app install request — phishing ka khatra.",
        "hinglish",
    ),

    # ── Card / Banking Details ──
    (
        "card_details_en",
        "Card Detail Phishing",
        r"\b(?:(?:card|debit|credit)\s+(?:number|details|expiry|cvv)|last\s+(?:four|4)\s+digits|bank\s+account\s+(?:number|details)|ifsc\s+code|bank\s+login|(?:net\s*banking|banking|account)\s+(?:login|credentials|password))\b",
        25,
        "Requesting card or banking details. No legitimate institution asks for full card details over phone.",
        "en",
    ),
    (
        "card_details_hinglish",
        "Card Detail Phishing",
        r"(?:card\s*(?:number|details|ka\s*number)|(?:debit|credit)\s*card\s*(?:batao|bataiye|details\s*do)|cvv\s*(?:batao|bataiye|kya\s*hai)|account\s*number\s*(?:batao|bataiye|do))",
        25,
        "Card/account number maanga ja raha hai — bank kabhi phone pe nahi maangta.",
        "hinglish",
    ),
]


# ─── Safe-Next-Step Guidance ──────────────────────────────────────

GUIDANCE_BY_CATEGORY = {
    "OTP/PIN Request": [
        "Never share OTP, PIN, or passwords with anyone — banks and services never ask for them.",
        "If pressured, hang up and call your bank directly using the number on your card or website.",
    ],
    "Urgency/Threats": [
        "Don't panic. Scammers create urgency to stop you from thinking clearly.",
        "No government agency arrests people over phone calls. Verify by calling the official number.",
    ],
    "Remote Access": [
        "Never install AnyDesk, TeamViewer, or similar apps when asked by a caller.",
        "If already installed, uninstall immediately and change all passwords.",
    ],
    "Fake KYC": [
        "Banks do KYC in-branch or through their official app, never via phone calls.",
        "Never share Aadhaar, PAN, or account details with callers claiming to do KYC.",
    ],
    "UPI/Payment Scam": [
        "Never pay money to 'receive' a refund or prize — that's always a scam.",
        "Don't accept unknown UPI collect requests. Paying money is always YOUR action, not theirs.",
    ],
    "Prize/Job Scam": [
        "If you didn't enter a contest, you didn't win. Unsolicited prizes are scams.",
        "Real jobs don't ask for upfront fees. Research the company independently.",
    ],
    "Impersonation": [
        "Hang up and call the institution directly using their official website number.",
        "Government agencies send official notices — they don't randomly call to threaten you.",
    ],
    "Suspicious Link": [
        "Don't click links sent by unknown callers. They may lead to phishing sites.",
        "Only download apps from official Play Store or App Store.",
    ],
    "Card Detail Phishing": [
        "Never share card numbers, CVV, or account details over phone. Your bank already has these.",
        "If you accidentally shared card details, block your card immediately via your bank's app.",
    ],
}

DEFAULT_GUIDANCE = [
    "When in doubt, hang up and independently verify by calling the official number.",
    "Report suspicious calls to your bank and at cybercrime.gov.in or call 1930.",
]


# ─── Scoring Engine ───────────────────────────────────────────────


def score_transcript(text: str) -> ScoringResult:
    """
    Score a transcript for scam risk.

    Returns a ScoringResult with:
    - score: 0-100 (capped)
    - risk_level: safe/low/medium/high/critical
    - evidence: list of matched patterns with explanations
    - guidance: recommended safe actions
    - confidence_note: uncertainty disclaimer
    """
    if not text or not text.strip():
        return ScoringResult(
            score=0,
            risk_level=RiskLevel.SAFE,
            confidence_note="No transcript available for analysis.",
        )

    text_lower = text.lower()
    evidence_list: list[Evidence] = []
    categories_seen: set[str] = set()
    raw_score = 0

    for pattern_id, category, regex, weight, explanation, lang in SCAM_PATTERNS:
        for match in re.finditer(regex, text_lower, re.IGNORECASE):
            evidence_list.append(
                Evidence(
                    pattern_id=pattern_id,
                    category=category,
                    matched_text=match.group(),
                    position=match.start(),
                    weight=weight,
                    explanation=explanation,
                    language=lang,
                )
            )
            # Only count each category's weight once for scoring,
            # but record all matches as evidence
            if category not in categories_seen:
                raw_score += weight
                categories_seen.add(category)

    # Cap at 100
    score = min(raw_score, 100)

    # Determine risk level
    if score == 0:
        risk_level = RiskLevel.SAFE
    elif score <= 15:
        risk_level = RiskLevel.LOW
    elif score <= 35:
        risk_level = RiskLevel.MEDIUM
    elif score <= 70:
        risk_level = RiskLevel.HIGH
    else:
        risk_level = RiskLevel.CRITICAL

    # Collect guidance for triggered categories
    guidance: list[str] = []
    for cat in sorted(categories_seen):
        guidance.extend(GUIDANCE_BY_CATEGORY.get(cat, []))
    if not guidance:
        guidance = list(DEFAULT_GUIDANCE)

    # Confidence notes
    confidence_parts: list[str] = []
    if len(text.split()) < 10:
        confidence_parts.append(
            "Very short transcript — analysis may be incomplete."
        )
    if score > 0 and len(evidence_list) == 1:
        confidence_parts.append(
            "Only one pattern matched — could be a false positive. "
            "Use judgment alongside this analysis."
        )
    if not evidence_list:
        confidence_parts.append(
            "No known scam patterns detected, but novel scam tactics "
            "may not be in our pattern database."
        )

    return ScoringResult(
        score=score,
        risk_level=risk_level,
        evidence=evidence_list,
        categories_triggered=sorted(categories_seen),
        guidance=guidance,
        confidence_note=" ".join(confidence_parts) if confidence_parts else "",
    )
