# 📊 LedgerLens

> **Chat with your General Ledger using AI. Built for the Rillet Vibe Code CFO Challenge.**

*"Introducing LedgerLens — the AI-powered GL analyzer that auditors actually want."*

A voice + chat interface that lets auditors, controllers, and finance teams ask plain-English questions about their General Ledger data — and get professional audit-quality responses powered by Claude.

---

## ✨ What It Does

- **Upload any GL CSV** — exports from QuickBooks, NetSuite, Rillet, Xero, Sage all work
- **Ask questions in plain English** — "Find duplicate entries", "What are the top 5 largest transactions?", "Draft an audit finding for the biggest risk"
- **Voice input + voice output** — speak your question, hear the answer read back
- **Smart filtering** — intelligently selects relevant rows before sending to Claude, handling large GL files efficiently
- **Professional audit language** — responses cite specific accounts, amounts, and dates

---

## 🚀 Deploy to Vercel (5 minutes)

### Prerequisites
- [Node.js](https://nodejs.org) installed
- A free [Vercel](https://vercel.com) account
- An [Anthropic API key](https://console.anthropic.com) (starts with `sk-ant-`)

### Steps

```bash
# 1. Unzip and enter the project
unzip gl-audit-app.zip
cd gl-audit-app

# 2. Install dependencies
npm install

# 3. Install Vercel CLI (if you don't have it)
npm install -g vercel

# 4. Deploy
vercel

# Follow the prompts:
# - Log in with GitHub or email
# - Set up and deploy? → Y
# - Which scope? → your account
# - Link to existing project? → N
# - Project name? → ledgerlens (or anything)
# - Directory? → ./  (just press Enter)
# - Override settings? → N

# 5. Done! You get a live URL like:
# https://ledgerlens.vercel.app
```

### Run Locally (optional)

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## 🔑 API Key Setup

On first visit, the app asks for your Anthropic API key:

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Click **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-`)
4. Paste it into the app — saved in your browser's localStorage only

> **Security note:** The key never leaves your browser except in direct calls to `api.anthropic.com`. It is not stored on any server.

---

## 🎯 Demo Script (for LinkedIn video)

1. Open the app and enter your API key
2. Click **"Use sample GL with anomalies"**
3. Ask these questions one by one:

| Question | What it demonstrates |
|---|---|
| *"What are the top 5 largest transactions?"* | Basic analysis |
| *"Find any duplicate entries"* | Anomaly detection |
| *"Show round number transactions"* | Fraud red flags |
| *"Draft an audit finding for the biggest risk"* | **The wow moment** |

4. For voice: tap 🎤, speak a question, Claude reads the answer back
5. Screen record the whole thing — that's your LinkedIn video

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| AI | Claude Sonnet (claude-sonnet-4-6) |
| Voice Input | Web Speech API (browser-native) |
| Voice Output | SpeechSynthesis API (browser-native) |
| Data Parsing | Custom CSV parser (zero dependencies) |
| Deployment | Vercel (free tier) |

---

## 🧠 How Smart Filtering Works

Real GL files have thousands of rows — too large to send to Claude directly. The app pre-filters in the browser before each API call:

- **"Find duplicates"** → groups by amount + description, returns only repeated rows
- **"Round numbers"** → filters for amounts divisible by 1,000
- **"Summarize by account"** → aggregates totals per account
- **Default** → top 20 rows by amount descending

Keeps API calls fast, cheap, and focused.

---

## 📁 Project Structure

```
gl-audit-app/
├── src/
│   ├── App.jsx        # All logic + UI in one file
│   └── main.jsx       # React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## 💡 Built For

**Rillet Vibe Code CFO Challenge** — April 2025

This tool addresses a real pain point: auditors spend hours manually reviewing GL data to find anomalies, draft findings, and summarize account activity. This does it in seconds.

**Judging criteria:**
- ✅ **Creativity** — Voice-enabled GL chat is unlike any other submission
- ✅ **Finance application** — GL analysis is the foundation of every audit
- ✅ **Usefulness** — Any auditor or controller can use this immediately
- ✅ **Time saved** — Hours of manual GL review → seconds

---

*Built by Arcee @ Wiss & Company*

*Tag [@Rillet](https://www.linkedin.com/company/team-rillet) and [@Stephen Hedlund](https://www.linkedin.com/in/stephenhedlund/) in your LinkedIn post!*
