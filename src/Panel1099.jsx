import { useState } from "react";
import { exportVendorSummaryXLSX, exportDetailXLSX } from "./tax1099";

const RISK_COLORS = {
  "MISSING":   { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" },
  "PRESENT":   { bg: "#f0fdf4", border: "#bbf7d0", text: "#059669" },
  "INVALID":   { bg: "#fffbeb", border: "#fde68a", text: "#d97706" },
  "REQUESTED": { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
};

const FORM_COLORS = {
  "1099-NEC":  { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" },
  "1099-MISC": { bg: "#faf5ff", border: "#e9d5ff", text: "#7c3aed" },
  "1099-INT":  { bg: "#f0fdf4", border: "#bbf7d0", text: "#059669" },
  "1099-DIV":  { bg: "#fffbeb", border: "#fde68a", text: "#d97706" },
  "REVIEW":    { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
};

function Badge({ label, bg, border, text }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: text, background: bg, border: `1px solid ${border}`, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function StatCard({ label, value, color, border }) {
  return (
    <div style={{ background: "#ffffff", border: `1px solid ${border || "#e2e8f0"}`, borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#0f172a" }}>{value}</div>
    </div>
  );
}

function W9EmailModal({ vendor, onClose, onSent }) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const deadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const subject = `W-9 Request - ${vendor.vendor} - Action Required for 1099 Filing`;
  const body = `Dear ${vendor.vendor} Team,

I hope this message finds you well. My name is Arcee Gomes, and I am reaching out from Wiss & Company, LLC regarding our annual 1099 filing obligations.

As part of our compliance process, we are required by the IRS to collect a completed Form W-9 (Request for Taxpayer Identification Number and Certification) from all vendors who received payments of $${vendor.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} or more during the 2025 tax year.

Our records indicate that we do not currently have a W-9 on file for ${vendor.vendor}. To ensure accurate 1099 reporting and to avoid any IRS backup withholding requirements (currently 24%), please complete and return the attached W-9 form at your earliest convenience.

PAYMENT SUMMARY:
  Vendor: ${vendor.vendor}
  Total 2025 Payments: $${vendor.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
  Form Type: ${vendor.form === "REVIEW" ? "Under Review" : vendor.form}
  Filing Deadline: January 31, 2026

HOW TO SUBMIT YOUR W-9:
  1. Download Form W-9 from: https://www.irs.gov/pub/irs-pdf/fw9.pdf
  2. Complete all required fields (Name, TIN/SSN/EIN, Signature)
  3. Return by reply email to arcee.gomes@wiss.com or mail to:
     Wiss & Company, LLC — 100 Campus Drive, Suite 400, Florham Park, NJ 07932

Please respond by ${deadline}. If we do not receive your W-9 by this date, we may be required to apply IRS backup withholding to future payments.

If you believe you have already submitted a W-9 to us or have any questions, please do not hesitate to contact us at arcee.gomes@wiss.com or (973) 994-9400.

Thank you for your prompt attention to this matter.

Best regards,
Arcee Gomes
Manager, Tax & Advisory
Wiss & Company, LLC
100 Campus Drive, Suite 400, Florham Park, NJ 07932
Direct: (973) 994-9400 | arcee.gomes@wiss.com
www.wiss.com`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#ffffff", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Modal header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>W-9 Request Email</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>To: {vendor.vendor} · ${vendor.totalAmount.toLocaleString()} in 2025 payments</div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Email preview */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Subject line */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Subject: </span>
            <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{subject}</span>
          </div>

          {/* Email body */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "16px 20px" }}>
            <pre style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.75, fontFamily: "'Inter',sans-serif", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
              {body}
            </pre>
          </div>

          <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>✓</span>
            <div style={{ fontSize: 12, color: "#166534" }}>Ready to send — all contact details pre-filled for Wiss & Company, LLC. Deadline auto-calculated as 2 weeks from today.</div>
          </div>
        </div>

        {/* Modal actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={handleCopy}
            style={{ flex: 1, background: copied ? "#f0fdf4" : "#f8fafc", border: `1px solid ${copied ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 0", color: copied ? "#059669" : "#374151", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 500, transition: "all 0.2s" }}>
            {copied ? "✓ Copied to Clipboard" : "Copy Email Text"}
          </button>
          <button onClick={() => { onSent(vendor.vendor); onClose(); }}
            style={{ flex: 1, background: "#2563eb", border: "none", borderRadius: 8, padding: "10px 0", color: "#fff", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>
            ✓ Confirm W-9 Requested
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Panel1099({ data1099, loading }) {
  const [view, setView] = useState("summary");
  const [w9Modal, setW9Modal] = useState(null);
  const [sentW9s, setSentW9s] = useState(new Set());

  const markSent = (vendorName) => setSentW9s(prev => new Set([...prev, vendorName]));

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Scanning GL for 1099-eligible payments...</div>
      </div>
    );
  }

  if (!data1099) return null;

  const { summary, vendors, entries } = data1099;
  const pendingW9s = vendors.filter(v => v.tinStatus === "MISSING" && !sentW9s.has(v.vendor)).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>

      {w9Modal && <W9EmailModal vendor={w9Modal} onClose={() => setW9Modal(null)} onSent={markSent} />}

      {/* Sub-tab bar */}
      <div style={{ display: "flex", alignItems: "center", background: "#ffffff", borderBottom: "1px solid #e2e8f0", paddingLeft: 8, paddingRight: 16, flexShrink: 0 }}>
        {[{ key: "summary", label: "Summary" }, { key: "vendors", label: `Vendors${pendingW9s > 0 ? ` (${pendingW9s} W-9 needed)` : ""}` }, { key: "entries", label: "Entries" }].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            style={{ background: "transparent", border: "none", borderBottom: `2px solid ${view === t.key ? "#2563eb" : "transparent"}`, color: view === t.key ? "#2563eb" : t.key === "vendors" && pendingW9s > 0 ? "#dc2626" : "#64748b", padding: "12px 16px", fontSize: 13, fontFamily: "inherit", cursor: "pointer", fontWeight: view === t.key ? 600 : 400, transition: "all 0.15s" }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportVendorSummaryXLSX(data1099)}
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#059669", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>
            ↓ 1099 Summary
          </button>
          <button onClick={() => exportDetailXLSX(data1099)}
            style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600 }}>
            ↓ Detail XLSX
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

        {/* SUMMARY */}
        {view === "summary" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
              <StatCard label="Eligible Entries"  value={summary.totalEligible} color="#059669" border="#bbf7d0" />
              <StatCard label="Needs Review"       value={summary.totalReview}   color="#ea580c" border="#fed7aa" />
              <StatCard label="Total Amount"       value={`$${summary.totalAmount.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`} color="#2563eb" border="#bfdbfe" />
              <StatCard label="Missing TIN"        value={summary.missingTIN}    color="#dc2626" border="#fecaca" />
            </div>

            {summary.missingTIN > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>{summary.missingTIN} vendor{summary.missingTIN > 1 ? "s" : ""} missing W-9 / TIN</div>
                  <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 2 }}>IRS requires withholding 24% on future payments without a TIN on file</div>
                </div>
                <button onClick={() => setView("vendors")}
                  style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Send W-9 Requests →
                </button>
              </div>
            )}

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>Form Type Breakdown</div>
              {Object.entries(summary.formBreakdown).length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "#64748b" }}>No 1099-eligible entries found. Possible reasons:</div>
                  {[
                    "All payment amounts are below IRS thresholds ($600 for NEC/MISC, $10 for INT/DIV)",
                    "Entry names and account types don't match 1099-reportable categories",
                    "Entries are in excluded account types (payroll, taxes, insurance, COGS)",
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#64748b" }}>
                      <span style={{ color: "#cbd5e1" }}>·</span><span>{r}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", marginTop: 4 }}>
                    Tip: The Rillet Sandbox has $1-$2 test entries — use Demo Mode or connect a real Rillet account to see results.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(summary.formBreakdown).map(([form, count]) => {
                    const fc = FORM_COLORS[form] || FORM_COLORS["REVIEW"];
                    const pct = Math.round((count / entries.length) * 100);
                    return (
                      <div key={form}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                          <Badge label={form} {...fc} />
                          <span style={{ fontSize: 12, color: "#64748b" }}>{count} {count === 1 ? "entry" : "entries"}</span>
                        </div>
                        <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3 }}>
                          <div style={{ height: 5, width: `${pct}%`, background: fc.text, borderRadius: 3, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>IRS Filing Thresholds</div>
              {[
                { form: "1099-NEC",  threshold: "$600", desc: "Nonemployee compensation — contractors, consultants, freelancers" },
                { form: "1099-MISC", threshold: "$600", desc: "Rents, prizes, attorney gross proceeds" },
                { form: "1099-INT",  threshold: "$10",  desc: "Interest income" },
                { form: "1099-DIV",  threshold: "$10",  desc: "Dividends & distributions" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < 3 ? "1px solid #f1f5f9" : "none" }}>
                  <Badge label={r.form} {...(FORM_COLORS[r.form] || FORM_COLORS["REVIEW"])} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", minWidth: 40, fontFamily: "monospace" }}>{r.threshold}</span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{r.desc}</span>
                </div>
              ))}
            </div>

            {/* End-to-end filing workflow */}
            <div style={{ background: "linear-gradient(135deg,#eff6ff,#f8fafc)", border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e40af", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 16 }}>End-to-End 1099 Filing Workflow</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
                {[
                  { icon: "🔍", label: "LedgerLens", sub: "Identify & classify\n1099 vendors", highlight: true },
                  { arrow: true },
                  { icon: "📋", label: "Wiss 1099 Portal", sub: "Generate IRS-ready\nimport templates" },
                  { arrow: true },
                  { icon: "🖥️", label: "Tax1099 Software", sub: "Produce 1099\nforms & files" },
                  { arrow: true },
                  { icon: "🏛️", label: "IRS Filing", sub: "Submit to IRS\nbefore deadline" },
                ].map((step, i) => step.arrow ? (
                  <div key={i} style={{ fontSize: 18, color: "#93c5fd", padding: "0 8px", flexShrink: 0 }}>→</div>
                ) : (
                  <div key={i} style={{
                    flex: 1, minWidth: 100, background: step.highlight ? "#2563eb" : "#ffffff",
                    border: `1px solid ${step.highlight ? "#1d4ed8" : "#e2e8f0"}`,
                    borderRadius: 10, padding: "12px 10px", textAlign: "center",
                    boxShadow: step.highlight ? "0 4px 12px #2563eb30" : "0 1px 3px rgba(0,0,0,0.06)"
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{step.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: step.highlight ? "#fff" : "#0f172a", marginBottom: 4 }}>{step.label}</div>
                    <div style={{ fontSize: 10, color: step.highlight ? "#bfdbfe" : "#94a3b8", lineHeight: 1.5, whiteSpace: "pre-line" }}>{step.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 14, textAlign: "center" }}>
                The <strong>Vendor Summary export</strong> from LedgerLens feeds directly into the Wiss 1099 Portal — no manual reformatting needed.
              </div>
            </div>
          </div>
        )}

        {/* VENDORS */}
        {view === "vendors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 900 }}>
            {vendors.length === 0 ? (
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                No 1099-eligible vendors found.
              </div>
            ) : vendors.map((v, i) => {
              const fc = FORM_COLORS[v.form] || FORM_COLORS["REVIEW"];
              const isSent = sentW9s.has(v.vendor);
              const tinStatus = isSent ? "REQUESTED" : v.tinStatus;
              const tc = RISK_COLORS[tinStatus] || RISK_COLORS["MISSING"];
              return (
                <div key={i} style={{ background: "#ffffff", border: `1px solid ${v.tinStatus === "MISSING" && !isSent ? "#fecaca" : "#e2e8f0"}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 600 }}>{v.vendor}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{v.entries.length} {v.entries.length === 1 ? "entry" : "entries"} · {v.box}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                      ${v.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <Badge label={v.form} {...fc} />
                      <Badge label={isSent ? "W-9 Requested" : tinStatus === "PRESENT" ? "TIN on file" : "TIN Missing"} bg={tc.bg} border={tc.border} text={tc.text} />
                      {v.tinValue && <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{v.tinValue}</span>}
                    </div>
                    {v.tinStatus === "MISSING" && (
                      <button
                        onClick={() => isSent ? null : setW9Modal(v)}
                        style={{ background: isSent ? "#f0fdf4" : "#fef2f2", border: `1px solid ${isSent ? "#bbf7d0" : "#fecaca"}`, borderRadius: 7, padding: "5px 12px", color: isSent ? "#059669" : "#dc2626", fontSize: 12, fontFamily: "inherit", cursor: isSent ? "default" : "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {isSent ? "✓ W-9 Requested" : "✉ Send W-9 Request"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ENTRIES */}
        {view === "entries" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 900 }}>
            {entries.length === 0 ? (
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                No 1099-eligible entries found.
              </div>
            ) : entries.map((e, i) => {
              const fc = FORM_COLORS[e.form] || FORM_COLORS["REVIEW"];
              const isRequested = sentW9s.has(e.vendor);
              const tinStatus = isRequested ? "REQUESTED" : e.tinStatus;
              const tc = RISK_COLORS[tinStatus] || RISK_COLORS["MISSING"];
              const tinLabel = tinStatus === "REQUESTED" ? "W-9 Requested" : tinStatus === "PRESENT" ? `TIN on file` : "TIN Missing";
              return (
                <div key={i} style={{ background: "#ffffff", border: `1px solid ${tinStatus === "MISSING" ? "#fecaca" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{e.vendor}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{e.date} · {e.account}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>${e.amount.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge label={e.form} {...fc} />
                    <Badge label={tinLabel} bg={tc.bg} border={tc.border} text={tc.text} />
                    {e.tinValue && <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{e.tinValue}</span>}
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{e.box}</span>
                  </div>
                  {e.description && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>{e.description.slice(0, 100)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
