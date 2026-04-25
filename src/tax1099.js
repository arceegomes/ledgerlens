// ── 1099 Rules Engine ─────────────────────────────────────────────────────────

const FORM_RULES = [
  {
    form: "1099-NEC", box: "Box 1 - Nonemployee Compensation",
    threshold: 600,
    keywords: ["consulting fee", "contractor", "freelance", "professional fee", "accounting fee", "advisory fee", "subcontractor", "commission", "referral fee", "service fee", "contract labor", "recruiting", "staffing fee"],
    accounts: ["consulting fees", "professional services", "contract labor", "accounting & audit", "recruiting"],
    description: "Payments to non-employees for services rendered"
  },
  {
    form: "1099-MISC", box: "Box 1 - Rents",
    threshold: 600,
    keywords: ["rent", "lease", "office rent", "equipment lease", "property lease"],
    accounts: ["rent expense", "lease expense", "office rent", "rent - office"],
    description: "Payments for rent of office space, equipment, or property"
  },
  {
    form: "1099-MISC", box: "Box 2 - Royalties",
    threshold: 10,
    keywords: ["royalty", "royalties", "license fee", "licensing"],
    accounts: ["royalties", "licensing"],
    description: "Royalty payments of $10 or more"
  },
  {
    form: "1099-MISC", box: "Box 6 - Medical & Health Care",
    threshold: 600,
    keywords: ["medical", "healthcare", "physician", "doctor", "hospital", "clinic"],
    accounts: ["medical", "healthcare", "health care"],
    description: "Payments to medical providers"
  },
  {
    form: "1099-MISC", box: "Box 10 - Gross Proceeds to Attorney",
    threshold: 600,
    keywords: ["attorney", "lawyer", "law firm", "settlement", "legal settlement", "legal fees", "legal &"],
    accounts: ["legal & professional", "legal fees", "attorney", "law firm"],
    description: "Gross proceeds paid to attorneys"
  },
  {
    form: "1099-INT", box: "Box 1 - Interest Income",
    threshold: 10,
    keywords: ["interest income", "interest earned", "money market interest"],
    accounts: ["interest income", "interest payable"],
    description: "Interest payments of $10 or more"
  },
  {
    form: "1099-DIV", box: "Box 1a - Total Ordinary Dividends",
    threshold: 10,
    keywords: ["dividend", "distribution", "profit sharing"],
    accounts: ["dividends", "distributions"],
    description: "Dividend and distribution payments"
  }
];

// Terms that disqualify an entry from 1099 consideration
const EXCLUDED_TERMS = [
  "payroll", "salary", "salaries", "wages", "employee benefit",
  "payroll tax", "health insurance", "depreciation", "amortization",
  "cogs", "cost of goods", "inventory",
  "accounts payable", "accounts receivable",
  "credit card", "mortgage", "equipment loan",
  "software subscription", "saas", "cloud infrastructure", "hosting",
  "marketing", "advertising", "travel", "meals",
  "utilities", "office supplies",
];

function isExcluded(entry) {
  const name    = (entry.name        || "").toLowerCase().trim();
  const memo    = (entry.memo        || "").toLowerCase();
  const desc    = (entry.description || "").toLowerCase();
  const lineTxt = (entry.lines || []).map(l => l.account?.name || "").join(" ").toLowerCase();
  const full    = `${name} ${desc} ${memo} ${lineTxt}`;

  // Revenue / income receipts — payments IN, not payments OUT
  if (name.startsWith("revenue") || name.startsWith("income")) return true;

  // Hard-exclude payroll no matter what
  if (full.includes("payroll") || full.includes("salaries") || full.includes("salary") || full.includes("wages")) return true;

  return EXCLUDED_TERMS.some(ex => full.includes(ex));
}

function getAmount(entry) {
  // Sum debit side of expense lines (payments out)
  if (entry.lines && Array.isArray(entry.lines) && entry.lines.length > 0) {
    const sum = entry.lines.reduce((s, l) => {
      return s + Math.abs(parseFloat(l.debit_amount || l.debit || l.credit_amount || l.credit || 0));
    }, 0);
    if (sum > 0) return sum / 2; // debit + credit are mirror, so halve to get actual payment
  }
  return Math.abs(parseFloat(
    (entry.amount?.amount || entry.amount || entry.total_amount || entry.debit || "0")
      .toString().replace(/[,$]/g, "")
  ) || 0);
}

function classifyEntry(entry) {
  if (isExcluded(entry)) return null;

  const lineTxt = (entry.lines || []).map(l => l.account?.name || "").join(" ");
  const text = `${entry.name || ""} ${entry.description || ""} ${lineTxt} ${entry.memo || ""}`.toLowerCase();
  const amount = getAmount(entry);

  if (amount <= 0) return null;

  for (const rule of FORM_RULES) {
    const keywordMatch = rule.keywords.some(k => text.includes(k));
    const accountMatch = rule.accounts.some(a => text.includes(a));

    if ((keywordMatch || accountMatch) && amount >= rule.threshold) {
      return { form: rule.form, box: rule.box, threshold: rule.threshold, description: rule.description, amount, eligible: true };
    }
  }

  // Flag large unclassified payments for manual review
  if (amount >= 600) {
    return { form: "REVIEW", box: "Needs Manual Classification", threshold: 600, description: "Payment may be 1099-eligible - manual review required", amount, eligible: "maybe" };
  }

  return null;
}

export function analyze1099Eligibility(glData) {
  const entries = glData.journalEntries?.journal_entries || [];
  const results = [];
  const vendorMap = {};

  entries.forEach(entry => {
    const classification = classifyEntry(entry);
    if (!classification) return;

    const vendor = entry.contact?.name
      || entry.vendor?.name
      || entry.payee
      || extractVendorFromDescription(entry.name || entry.description || "")
      || "Unknown Vendor";

    const date = entry.date || entry.posting_date || entry.created_at?.split("T")[0] || "";
    const je = entry.name || entry.journal_entry_number || entry.id || "";
    const account = entry.lines?.[0]?.account?.name || entry.account?.name || "";

    const row = {
      vendor, date, je, account,
      amount: classification.amount,
      form: classification.form,
      box: classification.box,
      eligible: classification.eligible,
      description: entry.description || entry.memo || "",
      tinStatus: getTINStatus(entry),
      tinValue: entry.contact?.tax_id || entry.vendor?.tin || entry.tax_id || null
    };

    results.push(row);

    if (!vendorMap[vendor]) {
      vendorMap[vendor] = { vendor, totalAmount: 0, entries: [], form: classification.form, box: classification.box, tinStatus: row.tinStatus, tinValue: row.tinValue };
    }
    vendorMap[vendor].totalAmount += classification.amount;
    vendorMap[vendor].entries.push(row);
  });

  const vendors = Object.values(vendorMap).sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    entries: results,
    vendors,
    summary: {
      totalEligible: results.filter(r => r.eligible === true).length,
      totalReview: results.filter(r => r.eligible === "maybe").length,
      totalAmount: results.reduce((s, r) => s + r.amount, 0),
      missingTIN: vendors.filter(v => v.tinStatus === "MISSING").length,
      formBreakdown: getFormBreakdown(results)
    }
  };
}

function extractVendorFromDescription(desc) {
  const patterns = [
    /payment to (.+?)(?:\s+-|\s+for|$)/i,
    /(.+?) invoice/i,
    /(.+?) consulting/i,
    /(.+?) services/i,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m) return m[1].trim().slice(0, 40);
  }
  return desc.slice(0, 30) || null;
}

function getTINStatus(entry) {
  const tin = entry.contact?.tax_id || entry.vendor?.tin || entry.tax_id;
  if (!tin) return "MISSING";
  if (tin.replace(/\D/g, "").length === 9) return "PRESENT";
  return "INVALID";
}

function getFormBreakdown(entries) {
  const breakdown = {};
  entries.forEach(e => { breakdown[e.form] = (breakdown[e.form] || 0) + 1; });
  return breakdown;
}

// CSV with UTF-8 BOM so Excel renders special characters correctly
function downloadCSV(content, filename) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadXLSX(workbook, filename) {
  const XLSX = window.__XLSX__;
  const buf = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// State lookup — best-guess state from TIN prefix (first 2 digits are IRS district, not state)
// We use a simple lookup on known EINs from the mock data; for real data leave blank.
const KNOWN_STATES = {
  "82": "CA", "94": "CA", "36": "IL", "76": "TX",
  "47": "NJ", "93": "OR", "91": "WA", "20": "NJ",
};
function guessState(tin) {
  if (!tin) return "";
  const prefix = tin.replace(/\D/g, "").slice(0, 2);
  return KNOWN_STATES[prefix] || "";
}

const XLSX_HEADERS = [
  "Vendor", "Amount", "FormType", "Box", "Notes", "TIN",
  "State1", "State1ID", "State1Amount", "State1TaxWithheld",
  "State2", "State2ID", "State2Amount", "State2TaxWithheld"
];


function buildVendorRow(v) {
  const formCode = v.form === "REVIEW" ? "" : v.form.replace("1099-", "");
  const tin = v.tinValue || "";
  const hasTin = v.tinStatus === "PRESENT" && tin;
  const state = hasTin ? guessState(tin) : "";
  const stateId = hasTin && state ? tin : "";          // use EIN as state ID placeholder
  const stateAmt = hasTin ? v.totalAmount : "";
  const stateTax = hasTin ? 0 : "";
  const notes = v.tinStatus === "MISSING"
    ? "W-9 REQUIRED — Collect TIN before filing"
    : v.form === "REVIEW"
    ? "NEEDS MANUAL CLASSIFICATION"
    : "Ready to file";

  return [
    v.vendor,
    v.totalAmount,
    formCode,
    v.box,
    notes,
    tin,
    state,
    stateId,
    stateAmt,
    stateTax,
    "", "", "", ""                                      // State2 always blank — fill manually if needed
  ];
}

function buildEntryRow(e) {
  const formCode = e.form === "REVIEW" ? "" : e.form.replace("1099-", "");
  const tin = e.tinValue || "";
  const hasTin = e.tinStatus === "PRESENT" && tin;
  const state = hasTin ? guessState(tin) : "";
  const stateId = hasTin && state ? tin : "";
  const stateAmt = hasTin ? e.amount : "";
  const stateTax = hasTin ? 0 : "";
  const notes = (e.eligible === "maybe" ? "NEEDS REVIEW — " : "") + (e.description || "").slice(0, 80);

  return [
    e.vendor,
    e.amount,
    formCode,
    e.box,
    notes,
    tin,
    state,
    stateId,
    stateAmt,
    stateTax,
    "", "", "", ""
  ];
}

// Call the local Python excel_server.py to generate a properly-formatted
// Excel file from the template (preserving Table1, dropdowns, validations).
async function exportViaServer(endpoint, dataRows, filename) {
  const res = await fetch(`/excel-api/${endpoint}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ rows: dataRows }),
  });
  if (!res.ok) throw new Error(`Excel server error: ${res.status}`);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportVendorSummaryXLSX(data1099) {
  const rows = data1099.vendors.map(buildVendorRow);
  exportViaServer(
    "generate-vendor-summary",
    rows,
    `LedgerLens_1099_VendorSummary_${new Date().toISOString().split("T")[0]}.xlsx`
  ).catch(err => {
    console.error("Export failed:", err);
    alert("Excel server not running.\nStart it with: python excel_server.py");
  });
}

export function exportDetailXLSX(data1099) {
  const rows = data1099.entries.map(buildEntryRow);
  exportViaServer(
    "generate-detail",
    rows,
    `LedgerLens_1099_Detail_${new Date().toISOString().split("T")[0]}.xlsx`
  ).catch(err => {
    console.error("Export failed:", err);
    alert("Excel server not running.\nStart it with: python excel_server.py");
  });
}

// Keep CSV exports as fallback
const CSV_HEADERS = XLSX_HEADERS;

export function exportToCSV(data1099) {
  const rows = data1099.entries.map(buildEntryRow).map(r =>
    r.map((v, i) => i === 0 || i === 3 || i === 4 ? `"${String(v).replace(/"/g,"'")}"` : v).join(",")
  );
  downloadCSV([CSV_HEADERS.join(","), ...rows].join("\n"),
    `LedgerLens_1099_Detail_${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportVendorSummaryCSV(data1099) {
  const rows = data1099.vendors.map(buildVendorRow).map(r =>
    r.map((v, i) => i === 0 || i === 3 || i === 4 ? `"${String(v).replace(/"/g,"'")}"` : v).join(",")
  );
  downloadCSV([CSV_HEADERS.join(","), ...rows].join("\n"),
    `LedgerLens_1099_VendorSummary_${new Date().toISOString().split("T")[0]}.csv`);
}
