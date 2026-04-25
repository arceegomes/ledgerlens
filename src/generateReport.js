import { jsPDF } from "jspdf";

export async function generateAuditReport(glData, findings, claudeKey) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210; // A4 width
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 0;

  const colors = {
    dark:    [8, 13, 22],
    blue:    [14, 165, 233],
    white:   [255, 255, 255],
    light:   [241, 245, 249],
    muted:   [100, 116, 139],
    red:     [239, 68, 68],
    yellow:  [234, 179, 8],
    green:   [16, 185, 129],
    border:  [226, 232, 240],
  };

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkY = (needed = 20) => {
    if (y + needed > 277) addPage();
  };

  // ── Cover Page ──────────────────────────────────────────────────────────────
  // Dark header band
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, W, 80, "F");

  // Accent line
  doc.setFillColor(...colors.blue);
  doc.rect(0, 78, W, 2, "F");

  // Logo area
  doc.setFillColor(...colors.blue);
  doc.roundedRect(margin, 18, 14, 14, 2, 2, "F");
  doc.setTextColor(...colors.white);
  doc.setFontSize(10);
  doc.text("LL", margin + 4, 27.5);

  // Title
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.white);
  doc.text("LedgerLens", margin + 18, 27);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.blue);
  doc.text("AI-POWERED AUDIT REPORT", margin + 18, 34);

  // Subtitle block
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("Powered by Claude · Built on Rillet", margin, 55);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}`, margin, 62);
  doc.text("Data Source: Rillet Sandbox GL", margin, 69);

  // Summary boxes with real GL stats
  y = 95;
  const jeCount = glData.journalEntries?.journal_entries?.length || 0;
  const acctCount = glData.trialBalance?.accounts?.length || 0;
  const boxes = [
    { label: "JOURNAL ENTRIES", value: String(jeCount) },
    { label: "GL ACCOUNTS",     value: String(acctCount) },
    { label: "FINDINGS",        value: String(findings.length) },
    { label: "STATUS",          value: "For Review" },
  ];

  const boxW = (contentW - 9) / 4;
  boxes.forEach((b, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(...colors.light);
    doc.roundedRect(x, y, boxW, 22, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.muted);
    doc.text(b.label, x + 4, y + 8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.dark);
    doc.text(b.value, x + 4, y + 17);
  });

  y = 130;

  // Disclaimer box
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, "F");
  doc.setFillColor(234, 179, 8);
  doc.rect(margin, y, 3, 18, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(133, 100, 4);
  doc.text("IMPORTANT NOTICE", margin + 7, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("This report is AI-generated for informational purposes only. All findings should be independently verified by a qualified CPA.", margin + 7, y + 13);

  y = 160;

  // ── Findings ────────────────────────────────────────────────────────────────
  // Section header
  doc.setFillColor(...colors.dark);
  doc.rect(margin, y, contentW, 10, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.white);
  doc.text("AUDIT FINDINGS SUMMARY", margin + 4, y + 7);
  y += 16;

  const riskColors = {
    HIGH:   colors.red,
    MEDIUM: colors.yellow,
    LOW:    colors.green,
  };

  findings.forEach((f, idx) => {
    const riskColor = riskColors[f.risk] || colors.muted;
    const textW = contentW - 28;

    // Pre-calculate line counts to set card height dynamically
    doc.setFontSize(8.5);
    const descLines = doc.splitTextToSize(f.description || "", textW);
    doc.setFontSize(7.5);
    const recLines  = f.recommendation ? doc.splitTextToSize(`> ${f.recommendation}`, textW) : [];

    const descH = descLines.length * 4.5;
    const recH  = recLines.length  * 4;
    const cardH = 14 + descH + (recLines.length ? recH + 3 : 0) + 5;

    checkY(cardH + 4);

    // Card background
    doc.setFillColor(...colors.light);
    doc.roundedRect(margin, y, contentW, cardH, 2, 2, "F");

    // Left accent bar
    doc.setFillColor(...riskColor);
    doc.rect(margin, y, 3, cardH, "F");

    // Finding number circle
    doc.setFillColor(...riskColor);
    doc.circle(margin + 11, y + 8, 4, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.white);
    doc.text(String(idx + 1), margin + 9.5, y + 10.5);

    // Risk badge
    doc.setFillColor(...riskColor);
    doc.roundedRect(W - margin - 22, y + 4, 20, 7, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.white);
    doc.text(f.risk, W - margin - 18, y + 9);

    // Title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.dark);
    doc.text((f.title || "").slice(0, 60), margin + 18, y + 10);

    // Description
    let textY = y + 17;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(descLines, margin + 18, textY);
    textY += descH + 3;

    // Recommendation (use ASCII ">" instead of arrow to avoid encoding issues)
    if (recLines.length) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...colors.muted);
      doc.text(recLines, margin + 18, textY);
    }

    y += cardH + 4;
  });

  // ── Narrative Section ───────────────────────────────────────────────────────
  checkY(20);
  y += 4;

  doc.setFillColor(...colors.dark);
  doc.rect(margin, y, contentW, 10, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.white);
  doc.text("AUDITOR NARRATIVE", margin + 4, y + 7);
  y += 16;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const narrative = findings.map(f => f.narrative).filter(Boolean).join(" ");
  const narLines = doc.splitTextToSize(narrative || "No additional narrative available.", contentW);
  narLines.forEach(line => {
    checkY(6);
    doc.text(line, margin, y);
    y += 5.5;
  });

  // ── Footer on all pages ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...colors.light);
    doc.rect(0, 285, W, 12, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.muted);
    doc.text("LedgerLens · AI-Powered GL Audit · Powered by Claude & Rillet", margin, 292);
    doc.text(`Page ${i} of ${pageCount}`, W - margin - 15, 292);
  }

  return doc;
}
