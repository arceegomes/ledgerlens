# 📊 LedgerLens

> **AI-powered GL audit tool built on Claude and connected directly to Rillet.**

*Built for the Rillet Vibe Code CFO Challenge — April 2026*

LedgerLens lets auditors, controllers, and finance teams talk to their General Ledger in plain English, scan for 1099 compliance, send W-9 requests, and generate full audit PDF reports — all powered by Claude and live Rillet GL data.

---

## ✨ Features

### 💬 Chat with your GL
- Ask questions by voice or text — "Find duplicate entries", "What are the top 5 largest transactions?", "Show round number transactions"
- Claude responds with professional audit-quality answers citing specific accounts, amounts, and dates
- Voice input (Web Speech API) + voice output (SpeechSynthesis) — speak your question, hear the answer read back
- Findings pre-warmed in the background so responses are instant

### 🔍 1099 Scanner
- Automatically identifies all journal entries eligible for 1099 reporting
- Classifies form type (1099-NEC, 1099-MISC, 1099-INT, 1099-DIV) and IRS box number
- Flags vendors with missing TINs
- Download a **Vendor Summary Sheet** in the exact Excel template format required by the 1099 filing portal

### 📧 W-9 Requests
- One-click W-9 request email for every vendor missing a TIN
- Pre-filled with vendor name, amount, and filing details
- Tracks which vendors have been contacted

### 📄 Audit PDF Report
- AI-generated findings with risk ratings (HIGH / MEDIUM / LOW) and recommendations
- Professional cover page with GL statistics
- Auditor narrative section
- Downloads as a formatted PDF in one click

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org) installed
- [Python 3](https://python.org) with `openpyxl` (`pip install openpyxl`)
- An [Anthropic API key](https://console.anthropic.com) (starts with `sk-ant-`)
- A [Rillet API key](https://rillet.com) (optional — Demo mode works without one)

### Setup

```bash
# 1. Clone or unzip the project
cd LedgerLens

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env.local
# Edit .env.local and add your keys (see below)

# 4. Start the Vite dev server
npm run dev

# 5. In a second terminal, start the Excel export server
python excel_server.py
```

App runs at **http://localhost:5173**
Excel server runs at **http://localhost:5175** (proxied automatically by Vite)

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_CLAUDE_KEY=sk-ant-your-key-here
VITE_RILLET_KEY=your-rillet-key-here
VITE_RILLET_BASE_URL=https://sandbox.api.rillet.com
```

> **Security note:** Keys are read from environment variables at build time and used only in direct browser-to-API calls. They are never sent to any intermediary server.

If you don't add keys to `.env.local`, the app will prompt you to enter them on first load and store them in `localStorage`.

---

## 🎭 Demo Mode

No Rillet key? No problem. Toggle **Demo** in the header to load a realistic sample GL for Meridian Advisory Group — full journal entries, trial balance, and 1099-eligible vendors — with no API calls required.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| AI | Claude Sonnet (claude-sonnet-4-6) via Anthropic API |
| GL Data | Rillet API (journal entries + trial balance) |
| Voice Input | Web Speech API (browser-native) |
| Voice Output | SpeechSynthesis API (browser-native) |
| PDF Generation | jsPDF |
| Excel Export | Python + openpyxl (preserves Table1, dropdowns, validations) |
| 1099 Engine | Custom rules engine (`tax1099.js`) |

---

## 📁 Project Structure

```
LedgerLens/
├── src/
│   ├── App.jsx            # Main app — chat, voice, GL loading, report generation
│   ├── Panel1099.jsx      # 1099 Scanner UI — vendors, entries, W-9 workflow
│   ├── tax1099.js         # 1099 rules engine + Excel/CSV export logic
│   ├── generateReport.js  # jsPDF audit report builder
│   └── mockData.js        # Demo GL data (Meridian Advisory Group)
├── public/
│   └── vendor-template.xlsx   # Excel template with Table1, dropdowns, validations
├── excel_server.py        # Python server for Excel generation (port 5175)
├── vite.config.js         # Vite config with Rillet + Excel API proxies
├── .env.local             # Local secrets (gitignored)
└── package.json
```

---

## 💡 Built For

**Rillet Vibe Code CFO Challenge — April 2026**

LedgerLens addresses a real pain point at Wiss & Company: auditors and tax teams spend hours manually reviewing GL data to find anomalies, identify 1099-eligible payments, chase down missing TINs, and draft audit findings. LedgerLens does it in minutes.

**Judging criteria:**
- ✅ **Creativity** — Voice-enabled GL chat + 1099 compliance in one tool
- ✅ **Finance application** — GL analysis, 1099 filing workflow, audit reporting
- ✅ **Usefulness** — Directly addresses real Advisory and Tax team workflows at Wiss
- ✅ **Time saved** — Hours of manual GL review → minutes

---

*Built by Arcee Gomes @ Wiss & Company*
