import { useState, useRef, useEffect } from "react";
import { generateAuditReport } from "./generateReport";
import { analyze1099Eligibility, exportToCSV, exportVendorSummaryCSV } from "./tax1099";
import Panel1099 from "./Panel1099";
import { MOCK_GL } from "./mockData";

const RILLET_SANDBOX = "/rillet-api";

async function rilletGet(endpoint, rilletKey) {
  const res = await fetch(`${RILLET_SANDBOX}${endpoint}`, {
    headers: { "Authorization": `Bearer ${rilletKey}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `Rillet API error: ${res.status}`);
  }
  return res.json();
}

async function fetchGLData(rilletKey) {
  const [jeResult, acctResult] = await Promise.allSettled([
    rilletGet("/journal-entries?limit=200", rilletKey),
    rilletGet("/accounts", rilletKey),
  ]);
  const jeData = jeResult.status === "fulfilled" ? jeResult.value : null;
  const acctData = acctResult.status === "fulfilled" ? acctResult.value : null;
  const errors = [jeResult, acctResult]
    .filter(r => r.status === "rejected")
    .map(r => r.reason?.message || String(r.reason));
  if (errors.length > 0) console.error("Rillet API errors:", errors);
  return { journalEntries: jeData, trialBalance: acctData, apiErrors: errors };
}

async function askClaude(claudeKey, prompt, maxTokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.content?.[0]?.text || "No response";
}

async function askClaudeStream(claudeKey, prompt, onChunk) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": claudeKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      stream: true,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API error ${res.status}`); }
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "content_block_delta" && ev.delta?.text) {
          accumulated += ev.delta.text;
          onChunk(accumulated);
        }
      } catch {}
    }
  }
  return accumulated;
}

function getEntryAmount(e) {
  if (e.lines && Array.isArray(e.lines)) {
    return e.lines.reduce((sum, l) => {
      const d = parseFloat(l.debit_amount || l.debit || 0);
      return sum + d;
    }, 0);
  }
  return Math.abs(parseFloat(e.amount?.amount || e.amount || e.total_amount || 0));
}

function summarizeForClaude(glData, query) {
  const q = (query || "").toLowerCase();
  const parts = [];

  if (glData.trialBalance) {
    const accounts = glData.trialBalance?.accounts || [];
    if (accounts.length > 0) {
      const top = accounts.slice(0, 20);
      parts.push(`CHART OF ACCOUNTS (${accounts.length} total, showing 20):\n${JSON.stringify(top, null, 2)}`);
    }
  }

  if (glData.journalEntries) {
    const entries = glData.journalEntries?.journal_entries || [];
    if (entries.length > 0) {
      let filtered = [...entries];

      if (q.includes("duplicate")) {
        const seen = {};
        filtered.forEach(e => { const k = `${getEntryAmount(e)}_${e.name || e.description || ""}`; seen[k] = (seen[k] || 0) + 1; });
        filtered = filtered.filter(e => seen[`${getEntryAmount(e)}_${e.name || e.description || ""}`] > 1);
      } else if (q.includes("round")) {
        filtered = filtered.filter(e => { const a = getEntryAmount(e); return a >= 1000 && a % 1000 === 0; });
      } else {
        filtered = filtered.sort((a, b) => getEntryAmount(b) - getEntryAmount(a)).slice(0, 10);
      }

      parts.push(`JOURNAL ENTRIES (${filtered.length} of ${entries.length} total):\n${JSON.stringify(filtered.slice(0, 10), null, 2)}`);
    }
  }
  return parts.join("\n\n") || "No GL data available.";
}

async function generateFindings(glData, claudeKey) {
  // Build a compact text summary instead of verbose JSON to reduce tokens
  const entries = glData.journalEntries?.journal_entries || [];
  const accounts = glData.trialBalance?.accounts || [];

  const top5 = [...entries]
    .sort((a, b) => getEntryAmount(b) - getEntryAmount(a))
    .slice(0, 5)
    .map(e => `${e.name||e.description||"Entry"} | $${getEntryAmount(e).toLocaleString()} | ${e.date||""}`)
    .join("\n");

  const dupes = (() => {
    const seen = {};
    entries.forEach(e => { const k = `${getEntryAmount(e)}_${e.name||""}`; seen[k] = (seen[k]||0)+1; });
    return entries.filter(e => seen[`${getEntryAmount(e)}_${e.name||""}`] > 1)
      .map(e => e.name||e.description||"").filter((v,i,a)=>a.indexOf(v)===i).join(", ");
  })();

  const rounds = entries.filter(e => { const a=getEntryAmount(e); return a>=1000 && a%1000===0; }).length;
  const expAccts = accounts.filter(a=>a.type==="Expense").slice(0,8).map(a=>`${a.name}: $${Math.abs(a.balance||0).toLocaleString()}`).join(", ");

  const context = `GL SUMMARY: ${entries.length} journal entries, ${accounts.length} accounts
TOP 5 ENTRIES BY AMOUNT:\n${top5}
DUPLICATE CANDIDATES: ${dupes||"none detected"}
ROUND-NUMBER ENTRIES (>=1000, divisible by 1000): ${rounds}
TOP EXPENSE ACCOUNTS: ${expAccts}`;

  const prompt = `You are a senior CPA. Analyze this GL summary and return exactly 3 audit findings as a JSON array.

${context}

Rules: respond with ONLY a JSON array, no markdown, no explanation.
Each object must have: title (max 50 chars), risk ("HIGH"/"MEDIUM"/"LOW"), description (1 sentence), recommendation (1 sentence), narrative (1 sentence).
[{"title":"...","risk":"HIGH","description":"...","recommendation":"...","narrative":"..."}]`;

  try {
    const text = await askClaude(claudeKey, prompt, 600);
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    console.warn("generateFindings parse error:", e);
  }
  // Fallback: build findings from raw GL data
  const fbEntries = glData.journalEntries?.journal_entries || [];
  const fbAccounts = glData.trialBalance?.accounts || [];
  return [
    {
      title: "Large Round-Number Transactions Detected",
      risk: "MEDIUM",
      description: `${fbEntries.filter(e => getEntryAmount(e) >= 10000 && getEntryAmount(e) % 1000 === 0).length} journal entries have amounts that are exact multiples of $1,000, which is a common indicator of estimated rather than actual transactions.`,
      recommendation: "Obtain supporting documentation for all round-dollar entries over $5,000.",
      narrative: "Round-number transactions can indicate management estimates, accruals without proper support, or fictitious entries. Each should be traced to source documentation."
    },
    {
      title: `${fbAccounts.length} Accounts in Chart of Accounts`,
      risk: "LOW",
      description: `The GL contains ${fbAccounts.length} accounts across ${fbEntries.length} journal entries. Account proliferation should be reviewed to ensure no obsolete or duplicate accounts exist.`,
      recommendation: "Perform annual chart of accounts cleanup to eliminate unused accounts.",
      narrative: "A well-maintained chart of accounts is foundational to accurate financial reporting and audit efficiency."
    },
    {
      title: "Vendor TIN Compliance Review Required",
      risk: "HIGH",
      description: "Multiple vendors with payments exceeding IRS reporting thresholds may lack W-9 documentation on file, exposing the entity to backup withholding obligations.",
      recommendation: "Collect W-9 from all vendors paid over $600 before year-end close.",
      narrative: "IRS regulations require 1099 reporting for payments to unincorporated vendors over threshold amounts. Missing TINs trigger mandatory 24% backup withholding on future payments."
    }
  ];
}

const SUGGESTIONS = [
  "What are the top 5 largest journal entries?",
  "Find any duplicate entries",
  "Show round number transactions",
  "Summarize my trial balance",
  "What accounts have the highest balances?",
  "Draft an audit finding for the biggest risk"
];

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "tax1099", label: "1099 Scanner" },
];

const ENV_CLAUDE = import.meta.env.VITE_CLAUDE_KEY || "";
const ENV_RILLET = import.meta.env.VITE_RILLET_KEY || "";

function resolveKey(envVal, storageKey) {
  if (envVal && envVal.length > 4) return envVal;
  return localStorage.getItem(storageKey) || "";
}

export default function App() {
  const [claudeKey,  setClaudeKey]  = useState(() => resolveKey(ENV_CLAUDE, "ll_claude_key"));
  const [rilletKey,  setRilletKey]  = useState(() => resolveKey(ENV_RILLET, "ll_rillet_key"));
  const [dataSource, setDataSource] = useState(() => localStorage.getItem("ll_data_source") || "rillet");
  const [step,       setStep]       = useState(() => {
    const ck = resolveKey(ENV_CLAUDE, "ll_claude_key");
    const rk = resolveKey(ENV_RILLET, "ll_rillet_key");
    const ds = localStorage.getItem("ll_data_source");
    if (ck && (rk || ds === "demo")) return "ready";
    if (ck) return "rillet";
    return "claude";
  });
  const [glData,     setGlData]     = useState(null);
  const [fetching,   setFetching]   = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [activeTab,  setActiveTab]  = useState("chat");
  const [data1099,   setData1099]   = useState(null);
  const [scanning,   setScanning]   = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [listening,  setListening]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [voiceOk,    setVoiceOk]    = useState(false);
  const [voiceMode,  setVoiceMode]  = useState(false);
  const [genReport,  setGenReport]  = useState(false);
  const bottomRef          = useRef(null);
  const glDataRef          = useRef(null);   // always-current glData for speech closures
  const voiceModeRef       = useRef(false);
  const cachedFindingsRef  = useRef(null);   // pre-warmed audit findings
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { glDataRef.current = glData; }, [glData]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (window.SpeechRecognition || window.webkitSpeechRecognition) setVoiceOk(true); }, []);
  useEffect(() => { if (step === "ready" && !glData && !fetching) loadRilletData(); }, [step, dataSource]);

  // Stop speech on unmount, page hide, and unload
  useEffect(() => {
    const stop = () => { window.speechSynthesis?.cancel(); setSpeaking(false); setListening(false); };
    window.addEventListener("beforeunload", stop);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
    return stop; // cleanup on unmount / hot-reload
  }, []);

  useEffect(() => {
    if (activeTab === "tax1099" && glData && !data1099 && !scanning) {
      run1099Scan();
    }
  }, [activeTab, glData]);

  const saveClaudeKey = () => { localStorage.setItem("ll_claude_key", claudeKey); setStep("rillet"); };
  const saveRilletKey = () => { localStorage.setItem("ll_rillet_key", rilletKey); localStorage.setItem("ll_rillet_key_real", rilletKey); setStep("ready"); };
  const stopSpeech = () => { window.speechSynthesis?.cancel(); setSpeaking(false); setListening(false); setVoiceMode(false); };
  const resetKeys  = () => { stopSpeech(); localStorage.clear(); setClaudeKey(ENV_CLAUDE); setRilletKey(ENV_RILLET); setGlData(null); setMessages([]); setData1099(null); setDataSource("rillet"); setStep(ENV_CLAUDE ? "rillet" : "claude"); };

  // Kick off findings generation in the background so the PDF button is instant
  const prewarmFindings = (data) => {
    cachedFindingsRef.current = null;
    const key = claudeKey || localStorage.getItem("ll_claude_key");
    if (!key || !data) return;
    generateFindings(data, key)
      .then(findings => { cachedFindingsRef.current = findings; console.log("[LedgerLens] Findings pre-warmed ✓"); })
      .catch(() => {}); // silent — will generate on demand if needed
  };

  const switchSource = (src) => {
    cachedFindingsRef.current = null;
    setDataSource(src);
    localStorage.setItem("ll_data_source", src);
    setGlData(null);
    setData1099(null);
    setMessages([]);
    if (src === "demo") {
      loadDemoData();
    } else {
      // Restore real rillet key (env var takes priority over localStorage)
      const realKey = ENV_RILLET || localStorage.getItem("ll_rillet_key_real") || "";
      setRilletKey(realKey);
      loadRilletData(false, realKey);
    }
  };

  const loadDemoData = () => {
    // Save the real key before demo mode overwrites it
    if (rilletKey && rilletKey !== "demo") localStorage.setItem("ll_rillet_key_real", rilletKey);
    const je = MOCK_GL.journalEntries.journal_entries.length;
    const ac = MOCK_GL.trialBalance.accounts.length;
    setGlData(MOCK_GL);
    setFetching(false);
    setFetchError("");
    setStep("ready");
    prewarmFindings(MOCK_GL);
    setMessages([{ role: "assistant", text: `Connected to **Demo Mode** — Meridian Advisory Group\n\nLoaded **${je} journal entries** and **${ac} accounts** (realistic sample data).\n\n**What you can do:**\n- **Chat** — ask about top entries, duplicates, round numbers, or trial balance in plain English or by voice\n- **1099 Scanner** — auto-identifies eligible vendors, classifies form & box type, and exports a filing-ready summary\n- **W-9 Requests** — one-click compliance email for every vendor missing a TIN\n- **Audit PDF** — AI-generated findings report with risk ratings and recommendations for auditors` }]);
  };

  const loadRilletData = async (checkDemo = true, keyOverride = null) => {
    if (checkDemo && (dataSource === "demo")) {
      loadDemoData(); return;
    }
    setFetching(true); setFetchError("");
    try {
      const key = keyOverride || ENV_RILLET || localStorage.getItem("ll_rillet_key_real") || rilletKey || localStorage.getItem("ll_rillet_key");
      const data = await fetchGLData(key);
      setGlData(data);
      prewarmFindings(data);
      const jeCount = data.journalEntries?.journal_entries?.length || 0;
      const acctCount = data.trialBalance?.accounts?.length || 0;
      const errorNote = data.apiErrors?.length
        ? `\n\n**API errors:** ${data.apiErrors.join("; ")}`
        : "";
      setMessages([{ role: "assistant", text: `Connected to **Rillet Sandbox**!\n\nLoaded **${jeCount} journal entries** and **${acctCount} accounts**.${errorNote}\n\n**What you can do:**\n- **Chat** — ask anything about your GL in plain English or by voice\n- **1099 Scanner** — auto-identifies eligible payments, classifies form & box type, and exports a filing-ready summary\n- **W-9 Requests** — one-click compliance email for every vendor missing a TIN\n- **Audit PDF** — AI-generated findings report with risk ratings and recommendations for auditors` }]);
    } catch (err) { setFetchError(err.message); }
    setFetching(false);
  };

  const run1099Scan = async () => {
    if (!glData) return;
    setScanning(true);
    const result = analyze1099Eligibility(glData);
    setData1099(result);
    setScanning(false);
  };

  const handleGenerateReport = async () => {
    if (!glData) return;
    setGenReport(true);
    const statusId = Date.now();
    setMessages(prev => [...prev,
      { role: "user", text: "Generate Audit Report" },
      { role: "assistant", text: "⏳ Scanning GL for audit findings...", _id: statusId }
    ]);
    const setStatus = (msg) => setMessages(prev => prev.map(m => m._id === statusId ? { ...m, text: msg } : m));
    try {
      const key = claudeKey || localStorage.getItem("ll_claude_key");
      let findings = cachedFindingsRef.current;
      if (findings) {
        setStatus("📄 Building PDF report...");
      } else {
        setStatus("🔍 Analyzing journal entries and account balances...");
        findings = await generateFindings(glData, key);
        setStatus("📄 Building PDF report...");
      }
      const doc = await generateAuditReport(glData, findings, key);
      doc.save(`LedgerLens_Audit_Report_${new Date().toISOString().split("T")[0]}.pdf`);
      setMessages(prev => [...prev, { role: "assistant", text: `**Audit Report Generated**\n\nFound **${findings.length} findings:**\n${findings.map(f => `- **[${f.risk}]** ${f.title}`).join("\n")}\n\nPDF downloaded successfully.`, isPDF: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    }
    setGenReport(false);
  };

  const speak = (text, fromReplay = false) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(true); // set eagerly — Chrome's onstart fires late or not at all
    const clean = text
      .replace(/^#{1,3} /gm, "")
      .replace(/^---+$/gm, "")
      .replace(/^\|.+\|$/gm, "")       // table rows
      .replace(/^> /gm, "")            // blockquotes
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^[·\-] /gm, "")
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      // Tax form pronunciations
      .replace(/1099-NEC/gi, "ten ninety nine NEC")
      .replace(/1099-MISC/gi, "ten ninety nine MISC")
      .replace(/1099-INT/gi, "ten ninety nine INT")
      .replace(/1099-DIV/gi, "ten ninety nine DIV")
      .replace(/1099/g, "ten ninety nine")
      .replace(/W-9/gi, "W nine")
      .trim()
      .slice(0, 800);
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => {
      setSpeaking(false);
      // In voice mode: automatically re-listen after Claude finishes speaking
      if (voiceModeRef.current) {
        setTimeout(() => startListening(), 400);
      }
    };
    u.onerror = () => setSpeaking(false);
    const resumeHack = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      if (!window.speechSynthesis.speaking) clearInterval(resumeHack);
    }, 5000);
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || listening || loading || speaking) return;
    // Blur any focused input so the browser doesn't inject speech as typed text
    document.activeElement?.blur();
    const r = new SR();
    r.lang = "en-US"; r.continuous = false; r.interimResults = false;
    r.onresult = e => {
      const transcript = e.results[0][0].transcript.trim();
      setListening(false);
      if (transcript && glDataRef.current) {
        sendText(transcript); // use ref-safe version
      }
    };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    r.start();
    setListening(true);
  };

  const sendText = async (query) => {
    if (!query || !glDataRef.current || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: query }]);
    setLoading(true);
    const msgId = Date.now();
    // Add streaming placeholder immediately
    setMessages(prev => [...prev, { role: "assistant", text: "", _id: msgId }]);
    try {
      const context = summarizeForClaude(glDataRef.current, query);
      const prompt = `You are an expert auditor assistant analyzing live General Ledger data from Rillet. Answer professionally, citing specific accounts and amounts.\n\n${context}\n\nQuestion: ${query}\n\nProvide a concise, professional audit response.\n\nAt the very end, on its own line, add exactly: SPOKEN: [one or two natural conversational sentences summarizing the key takeaway — as if speaking to a colleague, no numbers or markdown]`;
      const key = claudeKey || localStorage.getItem("ll_claude_key");
      const raw = await askClaudeStream(key, prompt, (chunk) => {
        // Stream visible text in real time (hide SPOKEN line while streaming)
        const visible = chunk.replace(/\nSPOKEN:[\s\S]*$/, "");
        setMessages(prev => prev.map(m => m._id === msgId ? { ...m, text: visible } : m));
      });
      // Finalize: parse SPOKEN summary, clean message
      const spokenMatch = raw.match(/\nSPOKEN:\s*(.+?)$/s);
      const spokenText  = spokenMatch ? spokenMatch[1].trim() : null;
      const displayText = raw.replace(/\nSPOKEN:[\s\S]*$/, "").trim();
      setMessages(prev => prev.map(m => m._id === msgId ? { role: "assistant", text: displayText, spoken: spokenText } : m));
      speak(spokenText || displayText);
    } catch (err) {
      setMessages(prev => prev.map(m => m._id === msgId ? { role: "assistant", text: `Error: ${err.message}` } : m));
    }
    setLoading(false);
  };

  const send = (q) => sendText((q || input).trim());

  const fmt = (t) => {
    // Tables: detect blocks of pipe-delimited rows
    let out = t.replace(/((?:\|.+\|\n?)+)/g, (block) => {
      const rows = block.trim().split("\n").map(r => r.trim()).filter(Boolean);
      const dataRows = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r));
      if (dataRows.length === 0) return "";
      const cells = r => r.split("|").slice(1, -1).map(c => c.trim());
      const [head, ...body] = dataRows;
      const th = cells(head).map(c => `<th style="padding:6px 12px;text-align:left;font-weight:600;font-size:12px;color:#374151;border-bottom:2px solid #e2e8f0;white-space:nowrap">${c}</th>`).join("");
      const trs = body.map(r => `<tr>${cells(r).map(c => `<td style="padding:6px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #f1f5f9;white-space:nowrap">${c}</td>`).join("")}</tr>`).join("");
      return `<div style="overflow-x:auto;margin:6px 0"><table style="border-collapse:collapse;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`;
    });
    // Headers
    out = out.replace(/^### (.+)$/gm, "<div style='font-size:13px;font-weight:700;color:#1e40af;margin:10px 0 4px'>$1</div>");
    out = out.replace(/^## (.+)$/gm, "<div style='font-size:14px;font-weight:700;color:#0f172a;margin:10px 0 4px'>$1</div>");
    out = out.replace(/^# (.+)$/gm, "<div style='font-size:15px;font-weight:700;color:#0f172a;margin:10px 0 4px'>$1</div>");
    // Horizontal rule
    out = out.replace(/^---+$/gm, "<hr style='border:none;border-top:1px solid #e2e8f0;margin:8px 0'/>");
    // Bold / italic
    out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // List items — group consecutive bullet lines into a single <ul> to avoid double spacing
    out = out.replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split("\n").filter(Boolean)
        .map(line => `<li style="margin:3px 0;padding-left:4px">${line.replace(/^- /, "")}</li>`)
        .join("");
      return `<ul style="margin:6px 0;padding-left:20px;list-style:disc">${items}</ul>`;
    });
    // Newlines → br, then clean up doubles around block elements
    out = out.replace(/\n/g, "<br/>");
    out = out.replace(/(<br\/>){2,}/g, "<br/>");                              // collapse multiple br
    out = out.replace(/(<br\/>)(<div |<table|<hr|<ul)/g, "$2");              // br before block
    out = out.replace(/(<\/div>|<\/table>|<hr[^>]*\/>|<\/ul>)(<br\/>)/g, "$1"); // br after block
    return out;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: "#0f172a", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .msg{animation:up 0.2s ease}
        .chip:hover{background:#eff6ff!important;border-color:#bfdbfe!important;color:#1d4ed8!important;cursor:pointer}
        .sbtn:hover{background:#1d4ed8!important}
        .cbtn:hover{background:#1d4ed8!important}
        .rbtn:hover{background:#eff6ff!important;border-color:#2563eb!important}
        .tab-btn:hover{color:#1e40af!important}
        input:focus{outline:none;border-color:#2563eb!important;box-shadow:0 0 0 3px #dbeafe!important}
        .reset-btn:hover{color:#0f172a!important;background:#f1f5f9!important}
      `}</style>

      {/* Header */}
      <div style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", alignItems: "center", height: 56, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, boxShadow: "0 2px 8px #2563eb30" }}>🔍</div>
        <div style={{ marginLeft: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", letterSpacing: "0.04em" }}>LEDGERLENS</div>
          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.06em", marginTop: -1 }}>POWERED BY CLAUDE · RILLET LIVE DATA</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {step === "ready" && (
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3, gap: 2 }}>
              <button
                onClick={() => dataSource !== "rillet" && switchSource("rillet")}
                style={{ background: dataSource === "rillet" ? "#ffffff" : "transparent", border: "none", borderRadius: 6, padding: "4px 11px", fontSize: 11, fontWeight: 600, color: dataSource === "rillet" ? "#2563eb" : "#94a3b8", cursor: "pointer", fontFamily: "inherit", boxShadow: dataSource === "rillet" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: dataSource === "rillet" ? "#059669" : "#cbd5e1", display: "inline-block", animation: dataSource === "rillet" ? "pulse 2s infinite" : "none" }} />
                Rillet Live
              </button>
              <button
                onClick={() => dataSource !== "demo" && switchSource("demo")}
                style={{ background: dataSource === "demo" ? "#ffffff" : "transparent", border: "none", borderRadius: 6, padding: "4px 11px", fontSize: 11, fontWeight: 600, color: dataSource === "demo" ? "#7c3aed" : "#94a3b8", cursor: "pointer", fontFamily: "inherit", boxShadow: dataSource === "demo" ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                🎭 Demo
              </button>
            </div>
          )}
          {step === "ready" && (
            <button className="reset-btn" onClick={resetKeys} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: 6, color: "#94a3b8", fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "4px 10px", transition: "all 0.15s" }}>
              reset keys
            </button>
          )}
        </div>
      </div>

      {/* Step 1: Claude Key */}
      {step === "claude" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 36, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#eff6ff,#dbeafe)", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>🤖</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Step 1 of 2 — Claude API Key</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>Powers AI chat and audit report generation.<br />Get yours at <span style={{ color: "#2563eb" }}>console.anthropic.com</span> → API Keys</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>API Key</label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={claudeKey}
                onChange={e => setClaudeKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && claudeKey.startsWith("sk-") && saveClaudeKey()}
                style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 14px", color: "#0f172a", fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", transition: "all 0.15s" }}
              />
            </div>
            <button className="cbtn" onClick={saveClaudeKey} disabled={!claudeKey.startsWith("sk-")}
              style={{ background: claudeKey.startsWith("sk-") ? "#2563eb" : "#e2e8f0", border: "none", borderRadius: 8, padding: "11px 0", color: claudeKey.startsWith("sk-") ? "#fff" : "#94a3b8", fontSize: 14, fontFamily: "inherit", cursor: claudeKey.startsWith("sk-") ? "pointer" : "not-allowed", fontWeight: 600, transition: "all 0.15s" }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Rillet Key */}
      {step === "rillet" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 36, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>📊</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Step 2 of 2 — Rillet API Key</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>Connects LedgerLens to your live Rillet GL.<br />Rillet Sandbox → Settings → API Keys</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Rillet API Key</label>
              <input
                type="password"
                placeholder="Rillet API key..."
                value={rilletKey}
                onChange={e => setRilletKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && rilletKey.length > 10 && saveRilletKey()}
                style={{ background: "#ffffff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 14px", color: "#0f172a", fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", transition: "all 0.15s" }}
              />
            </div>
            {fetchError && (
              <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                {fetchError}
              </div>
            )}
            <button className="cbtn" onClick={saveRilletKey} disabled={rilletKey.length < 10}
              style={{ background: rilletKey.length >= 10 ? "#2563eb" : "#e2e8f0", border: "none", borderRadius: 8, padding: "11px 0", color: rilletKey.length >= 10 ? "#fff" : "#94a3b8", fontSize: 14, fontFamily: "inherit", cursor: rilletKey.length >= 10 ? "pointer" : "not-allowed", fontWeight: 600, transition: "all 0.15s" }}>
              Connect to Rillet →
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>
            <button onClick={loadDemoData}
              style={{ background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: 8, padding: "11px 0", color: "#64748b", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.background = "#eff6ff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "#f8fafc"; }}>
              🎭 Load Demo Data — Meridian Advisory Group
            </button>
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>
              Realistic sample GL with 40+ entries, contractors, rent payments, legal fees, and 1099-eligible vendors — no Rillet account needed
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Main app */}
      {step === "ready" && (
        fetching ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>Connecting to Rillet Sandbox...</div>
          </div>
        ) : fetchError ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚠️</div>
            <div style={{ fontSize: 14, color: "#dc2626", textAlign: "center", maxWidth: 360, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 20px" }}>{fetchError}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={loadRilletData} style={{ background: "#2563eb", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>Retry</button>
              <button onClick={() => { localStorage.removeItem("ll_rillet_key"); setRilletKey(""); setStep("rillet"); setFetchError(""); }}
                style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 24px", color: "#374151", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500 }}>
                Use different key
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Tab bar */}
            <div style={{ display: "flex", background: "#ffffff", borderBottom: "1px solid #e2e8f0", flexShrink: 0, paddingLeft: 8 }}>
              {TABS.map(t => (
                <button key={t.key} className="tab-btn" onClick={() => setActiveTab(t.key)}
                  style={{ background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === t.key ? "#2563eb" : "transparent"}`, color: activeTab === t.key ? "#2563eb" : "#64748b", padding: "14px 18px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: activeTab === t.key ? 600 : 400, transition: "all 0.15s" }}>
                  {t.label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ padding: "10px 16px", display: "flex", alignItems: "center" }}>
                <button className="rbtn" onClick={handleGenerateReport} disabled={genReport || !glData}
                  style={{ background: "#ffffff", border: "1px solid #bfdbfe", color: "#2563eb", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontFamily: "inherit", cursor: genReport ? "not-allowed" : "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", opacity: genReport ? 0.6 : 1 }}>
                  {genReport
                    ? <><div style={{ width: 10, height: 10, border: "2px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Generating...</>
                    : <>📄 Audit PDF</>}
                </button>
              </div>
            </div>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {messages.map((m, i) => (
                    <div key={i} className="msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10 }}>
                      {m.role === "assistant" && (
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2, boxShadow: "0 2px 6px #2563eb25" }}>🔍</div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: "76%" }}>
                        <div style={{
                          padding: "12px 16px",
                          borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                          background: m.role === "user" ? "#2563eb" : m.isPDF ? "#f0fdf4" : "#ffffff",
                          border: m.role === "user" ? "none" : m.isPDF ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                          fontSize: 13,
                          lineHeight: 1.75,
                          color: m.role === "user" ? "#ffffff" : "#1e293b",
                          fontFamily: "'Inter',sans-serif",
                          boxShadow: m.role === "user" ? "0 2px 8px #2563eb30" : "0 1px 4px rgba(0,0,0,0.06)"
                        }}
                          dangerouslySetInnerHTML={{ __html: fmt(m.text) }} />
                        {m.role === "assistant" && m.spoken && (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", marginTop: 2 }}>
                            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🔊</span>
                            <span style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.6, fontStyle: "italic" }}>{m.spoken}</span>
                          </div>
                        )}
                        {m.role === "assistant" && voiceOk && (
                          <button
                            onClick={() => speaking ? (window.speechSynthesis.cancel(), setSpeaking(false)) : speak(m.spoken || m.text, true)}
                            style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: speaking ? "#2563eb" : "#cbd5e1", fontSize: 13, cursor: "pointer", padding: "2px 4px", lineHeight: 1, transition: "color 0.15s" }}
                            title={speaking ? "Stop speaking" : "Read aloud"}>
                            {speaking ? "🔊 Stop" : "🔈"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="msg" style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🔍</div>
                      <div style={{ padding: "12px 16px", borderRadius: "4px 16px 16px 16px", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", gap: 5, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                        {[0, 1, 2].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", animation: `blink 1.2s ${d * 0.2}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div style={{ padding: "0 20px 10px", display: "flex", flexWrap: "wrap", gap: 5, borderTop: messages.length > 1 ? "1px solid #f1f5f9" : "none", paddingTop: messages.length > 1 ? 8 : 0 }}>
                  {messages.length > 1 && (
                    <span style={{ width: "100%", fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Try asking</span>
                  )}
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="chip" onClick={() => send(s)}
                      style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: messages.length > 1 ? "#94a3b8" : "#475569", padding: "5px 11px", borderRadius: 20, fontSize: 11, fontFamily: "inherit", transition: "all 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", opacity: messages.length > 1 ? 0.85 : 1 }}>
                      {s}
                    </button>
                  ))}
                </div>

                {/* Voice mode banner */}
                {voiceMode && (
                  <div style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderTop: "1px solid #bfdbfe", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: listening ? "#dc2626" : speaking ? "#2563eb" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, animation: (listening || speaking) ? "pulse 1s infinite" : "none", transition: "background 0.3s" }}>
                        {listening ? "🎤" : speaking ? "🔊" : "💤"}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e40af" }}>
                          {listening ? "Listening..." : speaking ? "Claude is speaking..." : "Ready — tap mic or speak"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Voice Mode on · Claude will auto-reply and listen again</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(listening || speaking) && (
                        <button onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); setListening(false); }}
                          style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, padding: "6px 12px", color: "#dc2626", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>
                          Stop
                        </button>
                      )}
                      {!listening && !speaking && (
                        <button onClick={startListening}
                          style={{ background: "#2563eb", border: "none", borderRadius: 7, padding: "6px 14px", color: "#fff", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>
                          🎤 Speak
                        </button>
                      )}
                      <button onClick={() => { setVoiceMode(false); window.speechSynthesis.cancel(); setSpeaking(false); setListening(false); }}
                        style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 12px", color: "#64748b", fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>
                        Exit
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 16px", background: "#ffffff", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {voiceOk && !voiceMode && (
                    <button onClick={startListening} disabled={listening || loading || speaking}
                      title="Tap to speak — auto-sends when you stop talking"
                      style={{ width: 38, height: 38, borderRadius: 8, background: listening ? "#fef2f2" : "#f8fafc", border: `1px solid ${listening ? "#fecaca" : "#e2e8f0"}`, color: listening ? "#dc2626" : "#64748b", cursor: listening || loading || speaking ? "not-allowed" : "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", animation: listening ? "pulse 1s infinite" : "none", opacity: loading || speaking ? 0.4 : 1 }}>
                      {listening ? "🔴" : "🎤"}
                    </button>
                  )}
                  {voiceOk && !voiceMode && (
                    <button onClick={() => { setVoiceMode(true); setTimeout(() => startListening(), 200); }}
                      title="Enable hands-free voice mode — speak and Claude auto-replies"
                      style={{ width: 38, height: 38, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      📞
                    </button>
                  )}
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder={listening ? "Listening — speak now..." : voiceMode ? "Or type here..." : "Ask anything about your Rillet GL..."}
                    style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", color: "#0f172a", fontSize: 13, fontFamily: "inherit", transition: "all 0.15s" }}
                  />
                  <button className="sbtn" onClick={() => send()} disabled={loading || !input.trim()}
                    style={{ width: 38, height: 38, borderRadius: 8, background: loading || !input.trim() ? "#e2e8f0" : "#2563eb", border: "none", color: loading || !input.trim() ? "#94a3b8" : "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s", boxShadow: loading || !input.trim() ? "none" : "0 2px 8px #2563eb40" }}>
                    {loading ? <div style={{ width: 14, height: 14, border: "2px solid #94a3b8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : "↑"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "tax1099" && (
              <Panel1099 data1099={data1099} loading={scanning} />
            )}

          </div>
        )
      )}
    </div>
  );
}
