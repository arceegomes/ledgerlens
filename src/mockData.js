// Realistic mock GL data for demo purposes
// Simulates a mid-size professional services firm: Meridian Advisory Group

export const MOCK_GL = {
  trialBalance: {
    accounts: [
      { id: "10100", name: "Cash - Operating (Mercury)", type: "Asset", subtype: "Bank", balance: 284750.00 },
      { id: "10200", name: "Cash - Payroll Account", type: "Asset", subtype: "Bank", balance: 42100.00 },
      { id: "10300", name: "Money Market Reserve", type: "Asset", subtype: "Bank", balance: 150000.00 },
      { id: "11100", name: "Accounts Receivable", type: "Asset", subtype: "Receivable", balance: 187500.00 },
      { id: "11200", name: "Unbilled Revenue", type: "Asset", subtype: "Receivable", balance: 64200.00 },
      { id: "12100", name: "Prepaid Insurance", type: "Asset", subtype: "Prepaid", balance: 18400.00 },
      { id: "12200", name: "Prepaid Rent", type: "Asset", subtype: "Prepaid", balance: 8500.00 },
      { id: "15100", name: "Office Equipment", type: "Asset", subtype: "Fixed Asset", balance: 94000.00 },
      { id: "15200", name: "Accumulated Depreciation - Equipment", type: "Asset", subtype: "Fixed Asset", balance: -28200.00 },
      { id: "15300", name: "Leasehold Improvements", type: "Asset", subtype: "Fixed Asset", balance: 45000.00 },
      { id: "20100", name: "Accounts Payable", type: "Liability", subtype: "Payable", balance: -92300.00 },
      { id: "20200", name: "Accrued Expenses", type: "Liability", subtype: "Accrued", balance: -34100.00 },
      { id: "20300", name: "Accrued Payroll", type: "Liability", subtype: "Accrued", balance: -28400.00 },
      { id: "20400", name: "Deferred Revenue", type: "Liability", subtype: "Deferred", balance: -55000.00 },
      { id: "24100", name: "Line of Credit - SVB", type: "Liability", subtype: "Credit Line", balance: -200000.00 },
      { id: "24200", name: "Equipment Loan", type: "Liability", subtype: "Loan", balance: -41200.00 },
      { id: "30100", name: "Common Stock", type: "Equity", subtype: "Stock", balance: -10000.00 },
      { id: "32100", name: "Retained Earnings", type: "Equity", subtype: "Retained Earnings", balance: -218750.00 },
      { id: "40100", name: "Consulting Revenue - Advisory", type: "Revenue", subtype: "Revenue", balance: -890000.00 },
      { id: "40200", name: "Consulting Revenue - Implementation", type: "Revenue", subtype: "Revenue", balance: -420000.00 },
      { id: "40300", name: "Training & Workshop Revenue", type: "Revenue", subtype: "Revenue", balance: -95000.00 },
      { id: "40400", name: "Software Licensing Revenue", type: "Revenue", subtype: "Revenue", balance: -180000.00 },
      { id: "41100", name: "Interest Income", type: "Revenue", subtype: "Other Income", balance: -3840.00 },
      { id: "50100", name: "Salaries - Full Time", type: "Expense", subtype: "Payroll", balance: 624000.00 },
      { id: "50200", name: "Salaries - Part Time", type: "Expense", subtype: "Payroll", balance: 84000.00 },
      { id: "50300", name: "Payroll Taxes", type: "Expense", subtype: "Payroll", balance: 62400.00 },
      { id: "50400", name: "Employee Benefits & Health Insurance", type: "Expense", subtype: "Payroll", balance: 78000.00 },
      { id: "60100", name: "Contract Labor - IT Development", type: "Expense", subtype: "Professional Services", balance: 148500.00 },
      { id: "60200", name: "Legal & Professional Fees", type: "Expense", subtype: "Professional Services", balance: 87400.00 },
      { id: "60300", name: "Consulting Fees - Strategy", type: "Expense", subtype: "Professional Services", balance: 72000.00 },
      { id: "60400", name: "Accounting & Audit Fees", type: "Expense", subtype: "Professional Services", balance: 38500.00 },
      { id: "60500", name: "Recruiting & Staffing Fees", type: "Expense", subtype: "Professional Services", balance: 24000.00 },
      { id: "61100", name: "Rent - Office Space", type: "Expense", subtype: "Facilities", balance: 102000.00 },
      { id: "61200", name: "Utilities", type: "Expense", subtype: "Facilities", balance: 14400.00 },
      { id: "61300", name: "Office Supplies", type: "Expense", subtype: "Facilities", balance: 8200.00 },
      { id: "62100", name: "Software Subscriptions (SaaS)", type: "Expense", subtype: "Technology", balance: 42600.00 },
      { id: "62200", name: "IT Infrastructure & Hosting", type: "Expense", subtype: "Technology", balance: 28800.00 },
      { id: "63100", name: "Marketing & Advertising", type: "Expense", subtype: "Marketing", balance: 38000.00 },
      { id: "63200", name: "Business Development", type: "Expense", subtype: "Marketing", balance: 12400.00 },
      { id: "64100", name: "Travel & Entertainment", type: "Expense", subtype: "G&A", balance: 28600.00 },
      { id: "64200", name: "Meals & Entertainment", type: "Expense", subtype: "G&A", balance: 9800.00 },
      { id: "64300", name: "Business Insurance", type: "Expense", subtype: "G&A", balance: 22000.00 },
      { id: "64400", name: "Depreciation Expense", type: "Expense", subtype: "G&A", balance: 18800.00 },
      { id: "64500", name: "Interest Expense", type: "Expense", subtype: "G&A", balance: 12400.00 },
      { id: "64600", name: "Bank Fees & Charges", type: "Expense", subtype: "G&A", balance: 2100.00 },
    ]
  },
  journalEntries: {
    journal_entries: [
      // === RENT (1099-MISC eligible, $102k total) ===
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `je-rent-${String(i+1).padStart(3,"0")}`,
        name: `Office Rent - ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]} 2025`,
        date: `2025-${String(i+1).padStart(2,"0")}-01`,
        contact: { name: "Harborview Properties LLC", tax_id: null },
        memo: "Monthly office lease - Suite 400, 350 Mission St",
        lines: [
          { account: { id: "61100", name: "Rent - Office Space" }, debit_amount: "8500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "8500.00" },
        ]
      })),

      // === IT CONTRACTOR - Apex Dev Studio (1099-NEC eligible) ===
      {
        id: "je-contractor-001",
        name: "Contract Labor - Apex Dev Studio Q1",
        date: "2025-03-31",
        contact: { name: "Apex Dev Studio LLC", tax_id: "82-4719203" },
        memo: "Software development - client portal redesign",
        lines: [
          { account: { id: "60100", name: "Contract Labor - IT Development" }, debit_amount: "18500.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "18500.00" },
        ]
      },
      {
        id: "je-contractor-002",
        name: "Contract Labor - Apex Dev Studio Q2",
        date: "2025-06-30",
        contact: { name: "Apex Dev Studio LLC", tax_id: "82-4719203" },
        memo: "API integration and security audit",
        lines: [
          { account: { id: "60100", name: "Contract Labor - IT Development" }, debit_amount: "22000.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "22000.00" },
        ]
      },
      {
        id: "je-contractor-003",
        name: "Contract Labor - Apex Dev Studio Q3",
        date: "2025-09-30",
        contact: { name: "Apex Dev Studio LLC", tax_id: "82-4719203" },
        memo: "Mobile application development - Phase 2",
        lines: [
          { account: { id: "60100", name: "Contract Labor - IT Development" }, debit_amount: "28000.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "28000.00" },
        ]
      },
      {
        id: "je-contractor-004",
        name: "Contract Labor - Apex Dev Studio Q4",
        date: "2025-12-15",
        contact: { name: "Apex Dev Studio LLC", tax_id: "82-4719203" },
        memo: "Year-end platform hardening and documentation",
        lines: [
          { account: { id: "60100", name: "Contract Labor - IT Development" }, debit_amount: "15000.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "15000.00" },
        ]
      },

      // === FREELANCE DATA ANALYST (1099-NEC eligible) ===
      {
        id: "je-freelance-001",
        name: "Freelance - Priya Nair Data Analytics",
        date: "2025-02-14",
        contact: { name: "Priya Nair", tax_id: null },
        memo: "Market analysis report - Q4 2024 findings",
        lines: [
          { account: { id: "60100", name: "Contract Labor - IT Development" }, debit_amount: "7500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "7500.00" },
        ]
      },
      {
        id: "je-freelance-002",
        name: "Freelance - Priya Nair Data Analytics",
        date: "2025-07-31",
        contact: { name: "Priya Nair", tax_id: null },
        memo: "Competitive intelligence and dashboard build",
        lines: [
          { account: { id: "60100", name: "Contract Labor - IT Development" }, debit_amount: "9500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "9500.00" },
        ]
      },

      // === LEGAL FEES - Morrison & Webb LLP (1099-MISC eligible) ===
      {
        id: "je-legal-001",
        name: "Legal Fees - Morrison & Webb LLP - Employment Contracts",
        date: "2025-01-28",
        contact: { name: "Morrison & Webb LLP", tax_id: "94-2837461" },
        memo: "Employment agreement drafting - 3 senior hires",
        lines: [
          { account: { id: "60200", name: "Legal & Professional Fees" }, debit_amount: "12500.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "12500.00" },
        ]
      },
      {
        id: "je-legal-002",
        name: "Legal Fees - Morrison & Webb LLP - Client Contract Dispute",
        date: "2025-05-12",
        contact: { name: "Morrison & Webb LLP", tax_id: "94-2837461" },
        memo: "Settlement negotiation - Acme Corp contract dispute",
        lines: [
          { account: { id: "60200", name: "Legal & Professional Fees" }, debit_amount: "28400.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "28400.00" },
        ]
      },
      {
        id: "je-legal-003",
        name: "Legal Fees - Morrison & Webb LLP - IP Registration",
        date: "2025-09-05",
        contact: { name: "Morrison & Webb LLP", tax_id: "94-2837461" },
        memo: "Trademark registration - LedgerSuite platform",
        lines: [
          { account: { id: "60200", name: "Legal & Professional Fees" }, debit_amount: "8500.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "8500.00" },
        ]
      },

      // === STRATEGY CONSULTING - Clearwater Advisory (1099-NEC) ===
      {
        id: "je-consult-001",
        name: "Consulting Fee - Clearwater Advisory - Growth Strategy",
        date: "2025-04-01",
        contact: { name: "Clearwater Advisory Inc", tax_id: "76-3912840" },
        memo: "Series B fundraise preparation and pitch deck",
        lines: [
          { account: { id: "60300", name: "Consulting Fees - Strategy" }, debit_amount: "25000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "25000.00" },
        ]
      },
      {
        id: "je-consult-002",
        name: "Consulting Fee - Clearwater Advisory - Market Entry",
        date: "2025-10-15",
        contact: { name: "Clearwater Advisory Inc", tax_id: "76-3912840" },
        memo: "European market expansion strategy",
        lines: [
          { account: { id: "60300", name: "Consulting Fees - Strategy" }, debit_amount: "22000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "22000.00" },
        ]
      },

      // === ACCOUNTING FEES - Grant Thornton (1099-NEC) ===
      {
        id: "je-audit-001",
        name: "Accounting Fee - Grant Thornton LLP - Annual Audit",
        date: "2025-03-15",
        contact: { name: "Grant Thornton LLP", tax_id: "36-1488566" },
        memo: "FY2024 financial statement audit",
        lines: [
          { account: { id: "60400", name: "Accounting & Audit Fees" }, debit_amount: "35000.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "35000.00" },
        ]
      },

      // === RECRUITING FEE (1099-NEC) ===
      {
        id: "je-recruit-001",
        name: "Recruiting Fee - TalentBridge Partners - VP Engineering",
        date: "2025-06-01",
        contact: { name: "TalentBridge Partners", tax_id: null },
        memo: "Executive search fee - VP Engineering hire (20% of $160k)",
        lines: [
          { account: { id: "60500", name: "Recruiting & Staffing Fees" }, debit_amount: "32000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "32000.00" },
        ]
      },

      // === INTEREST INCOME (1099-INT eligible) ===
      ...["Mar","Jun","Sep","Dec"].map((mo, i) => ({
        id: `je-interest-${String(i+1).padStart(3,"0")}`,
        name: `Interest Income - Money Market - ${mo} 2025`,
        date: `2025-${[3,6,9,12][i].toString().padStart(2,"0")}-30`,
        contact: { name: "SVB / First Citizens Bank", tax_id: "94-1347922" },
        memo: "Quarterly money market interest",
        lines: [
          { account: { id: "10300", name: "Money Market Reserve" }, debit_amount: `${[960, 960, 960, 960][i]}.00`, credit_amount: "0" },
          { account: { id: "41100", name: "Interest Income" }, debit_amount: "0", credit_amount: `${[960, 960, 960, 960][i]}.00` },
        ]
      })),

      // === ROUND NUMBER TRANSACTIONS (audit flag) ===
      {
        id: "je-round-001",
        name: "Marketing Campaign - Q3 Digital Advertising",
        date: "2025-07-01",
        contact: { name: "Velocity Digital Media", tax_id: null },
        memo: "Q3 digital advertising campaign",
        lines: [
          { account: { id: "63100", name: "Marketing & Advertising" }, debit_amount: "50000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "50000.00" },
        ]
      },
      {
        id: "je-round-002",
        name: "Technology Infrastructure Upgrade",
        date: "2025-08-15",
        contact: { name: "CloudScale Technologies", tax_id: null },
        memo: "Annual cloud infrastructure commitment",
        lines: [
          { account: { id: "62200", name: "IT Infrastructure & Hosting" }, debit_amount: "25000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "25000.00" },
        ]
      },

      // === DUPLICATE ENTRIES (audit flag) ===
      {
        id: "je-dup-001a",
        name: "Software Subscription - Salesforce CRM Annual",
        date: "2025-01-10",
        contact: { name: "Salesforce Inc", tax_id: "94-3320358" },
        memo: "CRM platform - annual license",
        lines: [
          { account: { id: "62100", name: "Software Subscriptions (SaaS)" }, debit_amount: "18000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "18000.00" },
        ]
      },
      {
        id: "je-dup-001b",
        name: "Software Subscription - Salesforce CRM Annual",
        date: "2025-01-14",
        contact: { name: "Salesforce Inc", tax_id: "94-3320358" },
        memo: "CRM platform - annual license",
        lines: [
          { account: { id: "62100", name: "Software Subscriptions (SaaS)" }, debit_amount: "18000.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "18000.00" },
        ]
      },

      // === REVENUE ENTRIES (excluded from 1099 — income received, not payments made) ===
      {
        id: "je-rev-001",
        name: "Revenue - Acme Corp Q1 Advisory Retainer",
        date: "2025-03-31",
        contact: { name: "Acme Corp" },
        memo: "Q1 advisory retainer - recognized",
        lines: [
          { account: { id: "11100", name: "Accounts Receivable" }, debit_amount: "75000.00", credit_amount: "0" },
          { account: { id: "40100", name: "Consulting Revenue - Advisory" }, debit_amount: "0", credit_amount: "75000.00" },
        ]
      },
      {
        id: "je-rev-002",
        name: "Revenue - NovaTech Q2 Implementation",
        date: "2025-06-30",
        contact: { name: "NovaTech Systems" },
        memo: "ERP implementation - Phase 1 milestone",
        lines: [
          { account: { id: "11100", name: "Accounts Receivable" }, debit_amount: "120000.00", credit_amount: "0" },
          { account: { id: "40200", name: "Consulting Revenue - Implementation" }, debit_amount: "0", credit_amount: "120000.00" },
        ]
      },

      // === FREELANCE GRAPHIC DESIGNER - Jordan Kim (1099-NEC eligible) ===
      {
        id: "je-design-001",
        name: "Freelance - Jordan Kim Design - Brand Identity Refresh",
        date: "2025-04-14",
        contact: { name: "Jordan Kim Design", tax_id: null },
        memo: "Logo redesign, brand guidelines, icon set",
        lines: [
          { account: { id: "60100", name: "Contract Labor - Creative Services" }, debit_amount: "8500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "8500.00" },
        ]
      },
      {
        id: "je-design-002",
        name: "Freelance - Jordan Kim Design - Investor Deck Design",
        date: "2025-10-02",
        contact: { name: "Jordan Kim Design", tax_id: null },
        memo: "Series B investor presentation deck - 42 slides",
        lines: [
          { account: { id: "60100", name: "Contract Labor - Creative Services" }, debit_amount: "4200.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "4200.00" },
        ]
      },

      // === VIDEO PRODUCTION - Stellar Frame Studios (1099-NEC eligible) ===
      {
        id: "je-video-001",
        name: "Contract Services - Stellar Frame Studios - Brand Video",
        date: "2025-02-28",
        contact: { name: "Stellar Frame Studios LLC", tax_id: null },
        memo: "Brand story video production - 3 deliverables",
        lines: [
          { account: { id: "63100", name: "Contract Labor - Creative Services" }, debit_amount: "14500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "14500.00" },
        ]
      },
      {
        id: "je-video-002",
        name: "Contract Services - Stellar Frame Studios - Product Demo Reel",
        date: "2025-08-20",
        contact: { name: "Stellar Frame Studios LLC", tax_id: null },
        memo: "SaaS product demo video for website and sales enablement",
        lines: [
          { account: { id: "63100", name: "Contract Labor - Creative Services" }, debit_amount: "9800.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "9800.00" },
        ]
      },

      // === HR CONSULTING - PeopleFirst Consulting (1099-NEC eligible) ===
      {
        id: "je-hr-001",
        name: "Consulting Fee - PeopleFirst Consulting - Compensation Study",
        date: "2025-03-10",
        contact: { name: "PeopleFirst Consulting Group", tax_id: "47-2819034" },
        memo: "Annual compensation benchmarking and equity analysis",
        lines: [
          { account: { id: "60300", name: "Consulting Fees - Strategy" }, debit_amount: "11000.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "11000.00" },
        ]
      },
      {
        id: "je-hr-002",
        name: "Consulting Fee - PeopleFirst Consulting - Culture Assessment",
        date: "2025-09-22",
        contact: { name: "PeopleFirst Consulting Group", tax_id: "47-2819034" },
        memo: "Organizational culture assessment and manager training design",
        lines: [
          { account: { id: "60300", name: "Consulting Fees - Strategy" }, debit_amount: "8500.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "8500.00" },
        ]
      },

      // === CYBERSECURITY - RedTeam Security Partners (1099-NEC eligible) ===
      {
        id: "je-sec-001",
        name: "Professional Fee - RedTeam Security Partners - Pen Test",
        date: "2025-05-15",
        contact: { name: "RedTeam Security Partners Inc", tax_id: null },
        memo: "Annual penetration test and vulnerability assessment report",
        lines: [
          { account: { id: "60200", name: "Legal & Professional Fees" }, debit_amount: "18000.00", credit_amount: "0" },
          { account: { id: "20100", name: "Accounts Payable" }, debit_amount: "0", credit_amount: "18000.00" },
        ]
      },

      // === PR AGENCY - Narrative Arc Communications (1099-NEC eligible) ===
      {
        id: "je-pr-001",
        name: "Consulting Fee - Narrative Arc Communications - PR Retainer Q1",
        date: "2025-03-31",
        contact: { name: "Narrative Arc Communications LLC", tax_id: null },
        memo: "Q1 PR retainer - media relations and thought leadership",
        lines: [
          { account: { id: "63200", name: "Consulting Fees - PR & Communications" }, debit_amount: "7500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "7500.00" },
        ]
      },
      {
        id: "je-pr-002",
        name: "Consulting Fee - Narrative Arc Communications - PR Retainer Q2",
        date: "2025-06-30",
        contact: { name: "Narrative Arc Communications LLC", tax_id: null },
        memo: "Q2 PR retainer - Series B announcement and media tour",
        lines: [
          { account: { id: "63200", name: "Consulting Fees - PR & Communications" }, debit_amount: "7500.00", credit_amount: "0" },
          { account: { id: "10100", name: "Cash - Operating (Mercury)" }, debit_amount: "0", credit_amount: "7500.00" },
        ]
      },
    ]
  }
};
