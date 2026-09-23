export const SCAM_LIBRARY = [
  {
    id: 'banking-otp',
    title: 'Banking & OTP Phishing',
    category: 'Credentials',
    severity: 'Critical',
    icon: 'ShieldAlert',
    summary: 'Fraudsters impersonate bank officials claiming urgent account verification or security updates to extract OTPs and card PINs.',
    redFlags: [
      'Caller claims to be from SBI, HDFC, RBI or your bank’s fraud department',
      'Demands immediate 6-digit OTP received on your phone',
      'Threatens that your account or debit card will be blocked within 2 hours',
      'Asks for full 16-digit card number, expiry date, or CVV code'
    ],
    tactics: 'Creates high urgency and panic so the victim shares the one-time authentication code without reading the SMS text stating "Do NOT share this code with anyone".',
    whatNotToShare: ['Any OTP (One Time Password)', 'Debit/Credit Card CVV', 'Internet Banking Password / MPIN', 'Full Card Details'],
    defensiveActions: [
      'Hang up immediately and call the official bank customer care number on the back of your card',
      'Never dictate or type OTP over a voice call',
      'Check if money was debited; if yes, freeze card immediately in your bank mobile app',
      'Report within golden hour to national cybercrime helpline 1930'
    ]
  },
  {
    id: 'digital-arrest',
    title: 'Digital Arrest & Police Impersonation',
    category: 'Extortion',
    severity: 'Critical',
    icon: 'UserX',
    summary: 'Scammers pose as CBI, Police, Narcotics Control Bureau (NCB), or Customs officers claiming your Aadhaar or passport was found in an illegal parcel or crime.',
    redFlags: [
      'Claims a courier with illegal narcotics/passports was sent in your name to another country',
      'Threatens immediate arrest and places you under "virtual/digital arrest" via video/audio call',
      'Demands money transfer to "RBI verification accounts" to clear your name',
      'Insists on total secrecy from family members'
    ],
    tactics: 'Uses fake legal jargon, fabricated arrest warrants, and authoritarian intimidation to coerce victims into liquidating savings or fixed deposits.',
    whatNotToShare: ['Aadhaar/PAN details', 'Bank balances and financial holdings', 'Fund transfers to any "court/police verification" account'],
    defensiveActions: [
      'Remember: Indian law has NO provision for "Digital Arrest" over phone or video calls',
      'Police and CBI NEVER demand money transfers for verification',
      'Terminate the call calmly and visit your local police station if concerned',
      'Report incident immediately on cybercrime.gov.in'
    ]
  },
  {
    id: 'fake-kyc',
    title: 'Fake KYC Update & Account Deactivation',
    category: 'Identity Phishing',
    severity: 'High',
    icon: 'FileText',
    summary: 'Attackers pretend your SIM card, bank account, or wallet KYC has expired and will be discontinued unless updated over the phone.',
    redFlags: [
      'SMS or automated call claiming "Your KYC has expired. Complete today to avoid deactivation"',
      'Caller offers to complete KYC remotely within 5 minutes',
      'Directs you to download an app or click an external verification link',
      'Requests Aadhaar OTP or banking authentication to complete update'
    ],
    tactics: 'Exploits fear of service disruption (losing mobile number or bank access) to steal identity documents and access credentials.',
    whatNotToShare: ['Aadhaar OTP', 'Bank passbook photos', 'PAN card details to unverified callers'],
    defensiveActions: [
      'KYC is updated in person at branches or exclusively inside authenticated official banking apps',
      'Never send document photos on WhatsApp or Telegram to random numbers',
      'Contact your telecom or bank provider directly through official channels'
    ]
  },
  {
    id: 'remote-access',
    title: 'Remote Access Tool Takeover',
    category: 'Malware / Device Control',
    severity: 'Critical',
    icon: 'Monitor',
    summary: 'Callers claiming to be tech support, bank reps, or KYC agents instruct you to install AnyDesk, TeamViewer, or QuickSupport.',
    redFlags: [
      'Instructs you to search and install AnyDesk, TeamViewer, RustDesk or QuickSupport',
      'Asks you to read aloud the 9-digit remote connection code',
      'Tells you to approve permission prompts on your screen',
      'Asks you to log in to your banking app while they "monitor the screen"'
    ],
    tactics: 'Once the victim shares the connection code, the attacker takes full remote control of the device, viewing SMS OTPs and transferring funds directly.',
    whatNotToShare: ['Remote connection code (9-digit ID)', 'Screen sharing permissions', 'Device accessibility access'],
    defensiveActions: [
      'NEVER install remote access software at the request of an inbound caller',
      'If already installed, immediately turn off Wi-Fi/mobile data and uninstall the app',
      'Change all banking and email passwords from another secure device'
    ]
  },
  {
    id: 'upi-refund',
    title: 'UPI Payment & QR Code "Refund" Scams',
    category: 'Financial Fraud',
    severity: 'High',
    icon: 'CreditCard',
    summary: 'Scammers send UPI collect requests or QR codes, claiming you need to enter your UPI PIN to "receive" a refund or cashback.',
    redFlags: [
      'Caller says "I am sending you 5000 rupees refund, accept the request on GPay/PhonePe"',
      'Sends a QR code and asks you to scan it to receive money',
      'Instructs you to enter your UPI PIN to receive money'
    ],
    tactics: 'Capitalizes on misunderstanding of UPI architecture: UPI PIN is ONLY entered when SENDING money, NEVER when RECEIVING.',
    whatNotToShare: ['UPI PIN under any circumstance when expecting money', 'Scanning QR codes to receive funds'],
    defensiveActions: [
      'Golden Rule: You NEVER need to enter your UPI PIN or scan a QR code to receive money',
      'Reject unknown UPI collect requests immediately',
      'Block and report the VPA / phone number on your UPI app'
    ]
  },
  {
    id: 'lottery-prize',
    title: 'Lottery, Lucky Draw & Prize Fraud',
    category: 'Advance Fee',
    severity: 'Medium',
    icon: 'Gift',
    summary: 'Unsolicited calls or messages claiming you won a brand new car, cash lottery, or shopping cashback from Kaun Banega Crorepati or major e-commerce brands.',
    redFlags: [
      'Claims you won a massive prize in a contest you never participated in',
      'Requires a small "processing fee", "GST charge", or "delivery fee" to release the prize',
      'Uses branded logos of Amazon, Flipkart, or TV shows on fake letters'
    ],
    tactics: 'Lures victims with greed and false optimism, extracting repeated upfront fee payments until the victim realizes the prize does not exist.',
    whatNotToShare: ['Processing fee payments', 'Bank account details'],
    defensiveActions: [
      'If you did not purchase a ticket or enter a verified contest, you did not win',
      'Legitimate lotteries and contests never demand upfront fee transfers to claim winnings',
      'Ignore and block the communication'
    ]
  },
  {
    id: 'job-part-time',
    title: 'Work-From-Home & YouTube Like Scams',
    category: 'Employment Fraud',
    severity: 'High',
    icon: 'Briefcase',
    summary: 'Victims are offered part-time jobs liking videos or rating hotels for high daily payouts, leading into crypto/prepaid task traps.',
    redFlags: [
      'Unsolicited WhatsApp/Telegram offers promising 2,000–10,000 daily for simple tasks',
      'Initial small payout (e.g., 200–500) given to build trust',
      'Demands "prepaid investment tasks" where you deposit larger funds to unlock earnings'
    ],
    tactics: 'Uses small initial token payments to gain trust before executing a sunk-cost extortion scheme with escalating deposit demands.',
    whatNotToShare: ['Upfront deposits for job registration', 'Crypto wallet transfers'],
    defensiveActions: [
      'Legitimate employers never ask candidates to pay money to work',
      'Stop communicating as soon as a task demands money deposit',
      'Do not engage with unsolicited international numbers (+84, +62, +234, etc.)'
    ]
  },
  {
    id: 'delivery-customs',
    title: 'Delivery & Courier Customs Trap',
    category: 'Phishing',
    severity: 'Medium',
    icon: 'Package',
    summary: 'Fake notifications claiming your courier (FedEx, India Post, DHL) has an incorrect address or unpaid customs duty of a nominal amount.',
    redFlags: [
      'Message claiming a package is delayed due to wrong address or unpaid ₹5–₹25 fee',
      'Directs to a spoofed delivery tracking website designed to steal card details',
      'Caller demands urgent fee payment to avoid package destruction or penalty'
    ],
    tactics: 'Uses very small amounts (₹5–₹50) to lower victim suspicion; the fake payment portal captures full card and OTP credentials.',
    whatNotToShare: ['Card details on unverified short-link websites (bit.ly, tinyurl)'],
    defensiveActions: [
      'Verify tracking numbers directly on the official courier website by typing the URL manually',
      'Never click SMS links regarding delivery status',
      'India Post and major couriers do not call asking for OTPs or credit card payments'
    ]
  },
  {
    id: 'investment-crypto',
    title: 'High-Yield Investment & Stock Fraud',
    category: 'Investment Trap',
    severity: 'High',
    icon: 'TrendingUp',
    summary: 'Callers and WhatsApp groups claiming to be SEBI-registered institutional advisors offering guaranteed 200–500% returns in stocks or crypto.',
    redFlags: [
      'Guaranteed high returns with "zero risk" on special VIP trading apps',
      'Added to Telegram/WhatsApp stock tip groups without consent',
      'Instructed to transfer funds to individual mule bank accounts instead of registered brokers'
    ],
    tactics: 'Displays fabricated high balances on spoofed trading dashboards. When the victim attempts to withdraw funds, scammers demand more taxes/fees.',
    whatNotToShare: ['Transfers to personal bank accounts for stock purchases', 'Credentials to Demat accounts'],
    defensiveActions: [
      'Only invest through SEBI-registered brokers (verify on sebi.gov.in)',
      'There is no such thing as guaranteed high-return stock trading',
      'Never transfer money to personal savings accounts for stock investments'
    ]
  },
  {
    id: 'utility-bill',
    title: 'Electricity & Utility Disconnection Threat',
    category: 'Urgency Extortion',
    severity: 'Medium',
    icon: 'Zap',
    summary: 'Urgent calls or SMS claiming your electricity or gas connection will be disconnected tonight due to an unpaid previous month bill.',
    redFlags: [
      'Message: "Dear consumer, your electricity will be disconnected tonight at 9:30 PM due to unpaid bill"',
      'Provides a personal mobile number to contact the "Electricity Officer"',
      'Officer asks you to pay via a custom link or install an app to verify bill status'
    ],
    tactics: 'Creates acute stress of immediate utility disconnection to prevent the victim from checking their actual bill on official portals.',
    whatNotToShare: ['Bill payments via links sent on WhatsApp or SMS'],
    defensiveActions: [
      'Check your actual bill status directly on your official state electricity board app or portal',
      'Disconnection notices are served formally by postal letter, not random SMS numbers',
      'Never call the personal mobile number listed in such warning messages'
    ]
  }
]
