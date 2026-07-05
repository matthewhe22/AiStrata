// StrataFlow demo datastore — in-memory, seeded, optionally persisted to disk.
// Persists to the OS temp dir (not __dirname) since serverless platforms like
// Vercel ship a read-only filesystem outside of /tmp.
const fs = require("fs");
const os = require("os");
const path = require("path");
const DB_FILE = path.join(os.tmpdir(), "strataflow-data.json");

const today = new Date();
const d = (offsetDays) => {
  const x = new Date(today);
  x.setDate(x.getDate() + offsetDays);
  return x.toISOString().slice(0, 10);
};

const seed = () => ({
  schemes: [
    { id: "SP-48211", name: "Harbourline Apartments", state: "NSW", lots: 64, fyEnd: "30 Jun", plan: "SP 48211", address: "12 Quayside Ave, Pyrmont NSW" },
    { id: "OC-77102", name: "Elm & Ivy Residences", state: "VIC", lots: 38, fyEnd: "31 Mar", plan: "OC 77102", address: "5 Elm Grove, Brunswick VIC" },
    { id: "CTS-30944", name: "Reefside Terraces", state: "QLD", lots: 22, fyEnd: "30 Sep", plan: "CTS 30944", address: "88 Coraki St, Coolangatta QLD" },
  ],
  emails: [
    { id: "em-1", schemeId: "SP-48211", from: "j.tan@lot12mail.com", name: "Jessica Tan (Lot 12)", subject: "Water leaking through bathroom ceiling — urgent", body: "Hi, water has started dripping through my bathroom ceiling this morning, it looks like it's coming from the unit above or the common riser. It's getting worse. Can someone send a plumber today please? I'm in Lot 12.", received: d(0) + " 08:42", status: "new", triage: null },
    { id: "em-2", schemeId: "OC-77102", from: "conveyancing@hbllegal.com.au", name: "HBL Legal", subject: "OC certificate request — Lot 7, settlement 24 July", body: "We act for the purchaser of Lot 7. Please provide an owners corporation certificate under s151 at your earliest convenience. Settlement is booked for 24 July.", received: d(0) + " 09:15", status: "new", triage: null },
    { id: "em-3", schemeId: "SP-48211", from: "m.okafor@gmail.com", name: "Michael Okafor (Lot 31)", subject: "Question about my levy notice", body: "Hi, my quarterly levy seems higher than last quarter. Can you explain what changed? Also can I switch to monthly payments?", received: d(0) + " 10:03", status: "new", triage: null },
    { id: "em-4", schemeId: "CTS-30944", from: "chair@reefside.org", name: "Priya Nair (Chair)", subject: "Items for the AGM agenda", body: "Hi, the committee would like to add two motions to the AGM agenda: (1) quotes for repainting the pool fence, (2) updating the pet by-law. Can you confirm the notice deadline?", received: d(-1) + " 16:20", status: "new", triage: null },
    { id: "em-5", schemeId: "OC-77102", from: "accounts@brightspark.net.au", name: "BrightSpark Electrical", subject: "Invoice 8841 — emergency light testing", body: "Please find attached invoice 8841 for $1,265.00 incl GST for six-monthly emergency lighting testing completed 28 June.", received: d(-1) + " 11:47", status: "new", triage: null },
    { id: "em-6", schemeId: "SP-48211", from: "s.woods@lot4mail.com", name: "Sarah Woods (Lot 4)", subject: "Broken intercom at lobby B", body: "The intercom panel at lobby B hasn't worked for a week. Visitors can't buzz in. Not urgent-urgent but please arrange a fix.", received: d(-2) + " 14:10", status: "new", triage: null },
  ],
  tickets: [
    { id: "T-1041", schemeId: "SP-48211", title: "Garage door motor intermittent", category: "Maintenance", priority: "Medium", status: "In progress", lot: "Common", assignee: "Dana W.", workflow: "Maintenance triage", createdAt: d(-4), steps: [
      { label: "Ticket created from email", done: true, at: d(-4) },
      { label: "AI triage → Maintenance / Access systems", done: true, at: d(-4) },
      { label: "Work order sent to SecureLift P/L", done: true, at: d(-3) },
      { label: "Contractor scheduled — " + d(1), done: false },
      { label: "Owner notified & ticket closed", done: false },
    ]},
    { id: "T-1038", schemeId: "OC-77102", title: "Insurance renewal — building & liability", category: "Insurance", priority: "High", status: "In progress", lot: "—", assignee: "Marco P.", workflow: "Insurance renewal", createdAt: d(-9), steps: [
      { label: "Renewal window opened (60 days out)", done: true, at: d(-9) },
      { label: "Broker quote requested", done: true, at: d(-8) },
      { label: "Valuation currency check (VIC 5-yr rule)", done: true, at: d(-6) },
      { label: "Committee approval", done: false },
      { label: "Certificate of currency filed", done: false },
    ]},
    { id: "T-1035", schemeId: "CTS-30944", title: "Levy arrears — Lot 9 (2 quarters)", category: "Levies", priority: "Medium", status: "Waiting", lot: "9", assignee: "Dana W.", workflow: "Arrears follow-up", createdAt: d(-12), steps: [
      { label: "Arrears detected in trust sync", done: true, at: d(-12) },
      { label: "Friendly reminder emailed", done: true, at: d(-11) },
      { label: "Second notice + payment plan offer", done: true, at: d(-4) },
      { label: "Await response (7-day window)", done: false },
      { label: "Escalate to committee if unpaid", done: false },
    ]},
  ],
  deadlines: [
    { id: "dl-1", schemeId: "SP-48211", title: "Issue s184 certificate — Lot 12 sale", rule: "NSW SSMA s184 — 14 days from request", due: d(3), status: "open", severity: "urgent", source: "OC Order Portal #ORD-2291" },
    { id: "dl-2", schemeId: "OC-77102", title: "AGM notice must be sent", rule: "VIC OC Act — 14 days' notice before AGM", due: d(6), status: "open", severity: "soon", source: "AGM Platform — meeting 20 Jul" },
    { id: "dl-3", schemeId: "SP-48211", title: "Fire safety statement (AFSS) lodgement", rule: "NSW EP&A Reg — annual", due: d(12), status: "open", severity: "soon", source: "Compliance rule pack NSW" },
    { id: "dl-4", schemeId: "OC-77102", title: "Insurance valuation review", rule: "VIC OC Act — every 5 years", due: d(21), status: "open", severity: "normal", source: "Compliance rule pack VIC" },
    { id: "dl-5", schemeId: "CTS-30944", title: "Hold AGM (FY ended 30 Sep)", rule: "QLD BCCM — within 3 months of FY end", due: d(34), status: "open", severity: "normal", source: "Compliance rule pack QLD" },
    { id: "dl-6", schemeId: "SP-48211", title: "Capital Works Fund plan 10-yr review", rule: "NSW SSMA s80 — review at year 5", due: d(52), status: "open", severity: "normal", source: "Compliance rule pack NSW" },
    { id: "dl-7", schemeId: "OC-77102", title: "Emergency lighting 6-monthly test", rule: "AS 2293.2", due: d(-2), status: "done", severity: "normal", source: "Maintenance workflow", completedAt: d(-2) },
  ],
  orders: [
    { id: "ORD-2291", schemeId: "SP-48211", type: "s184 Certificate", lot: "12", requester: "HBL Legal", status: "In progress", due: d(3), paid: true },
    { id: "ORD-2288", schemeId: "OC-77102", type: "OC Certificate (s151)", lot: "7", requester: "HBL Legal", status: "New", due: d(8), paid: true },
    { id: "ORD-2279", schemeId: "SP-48211", type: "Records inspection", lot: "31", requester: "Owner", status: "Fulfilled", due: d(-3), paid: true },
  ],
  meetings: [
    { id: "MTG-501", schemeId: "OC-77102", type: "AGM", date: d(16), status: "Notice pending", quorum: "25%", agendaItems: 7, platform: "AGM Meeting Platform" },
    { id: "MTG-498", schemeId: "CTS-30944", type: "Committee meeting", date: d(9), status: "Scheduled", quorum: "—", agendaItems: 4, platform: "AGM Meeting Platform" },
    { id: "MTG-490", schemeId: "SP-48211", type: "AGM", date: d(-28), status: "Minutes published", quorum: "Met (31%)", agendaItems: 9, platform: "AGM Meeting Platform" },
  ],
  broadcasts: [
    { id: "bc-1", schemeId: "SP-48211", channel: "Email + SMS", subject: "Water shut-off — Tower A, Thu 9am–12pm", sent: d(-1), delivery: "97% delivered" },
  ],
  activity: [
    { at: d(0) + " 09:20", text: "AI triage classified “OC certificate request — Lot 7” and pre-filled OC Order Portal order ORD-2288.", kind: "ai" },
    { at: d(0) + " 08:50", text: "Urgent plumbing email from Lot 12 (Harbourline) awaiting triage.", kind: "inbox" },
    { at: d(-1) + " 16:40", text: "AGM Platform: notice deadline for Elm & Ivy AGM added to compliance calendar (due " + d(6) + ").", kind: "compliance" },
    { at: d(-1) + " 11:50", text: "Invoice 8841 received — OCR extracted amount $1,265.00, matched to Emergency lighting workflow.", kind: "ai" },
    { at: d(-2) + " 14:20", text: "Broadcast “Water shut-off — Tower A” delivered to 61 of 63 contacts.", kind: "comms" },
  ],
  settings: {
    llm: {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      apiKeySet: false,
      perFeature: { triage: "anthropic", chatbot: "anthropic", drafting: "anthropic" },
      byok: true,
    },
    email: [
      { id: "mb-1", kind: "gmail", address: "admin@bayviewstrata.com.au", status: "connected", scope: "Read + send" },
      { id: "mb-2", kind: "microsoft", address: "maintenance@bayviewstrata.com.au", status: "connected", scope: "Read + send" },
      { id: "mb-3", kind: "smtp", address: "", status: "not_connected", scope: "" },
    ],
    integrations: [
      { id: "int-oc", name: "OC Order Portal", kind: "internal", status: "connected", detail: "3 open orders syncing" },
      { id: "int-agm", name: "AGM Meeting Platform", kind: "internal", status: "connected", detail: "3 meetings syncing" },
      { id: "int-sm", name: "StrataMaster", kind: "trust", status: "connected", detail: "CSV sync · nightly" },
      { id: "int-piq", name: "Property IQ", kind: "trust", status: "not_connected", detail: "CSV or API sync" },
      { id: "int-is", name: "Intellistrata", kind: "trust", status: "not_connected", detail: "CSV sync" },
      { id: "int-xero", name: "Xero", kind: "accounting", status: "not_connected", detail: "Invoices & bills" },
    ],
  },
  chat: [
    { role: "assistant", text: "Hi! I'm the Harbourline resident assistant. I can answer questions about by-laws, levies, meetings and maintenance — and I'll hand you to the manager whenever a human is needed." },
  ],
});

let db;
function load() {
  if (fs.existsSync(DB_FILE)) {
    try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); return; } catch (e) {}
  }
  db = seed();
  save();
}
function save() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function reset() { db = seed(); save(); }
load();

module.exports = { get db() { return db; }, save, reset };
