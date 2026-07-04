// StrataFlow demo — Express API. Exported as an app so it can run either as
// a long-lived local server (server/server.js) or as a Vercel serverless
// function (api/index.js).
const express = require("express");
const store = require("./data");

const app = express();
app.use(express.json());

const db = () => store.db;

// ---------- Read endpoints ----------
app.get("/api/bootstrap", (req, res) => {
  const { schemes, emails, tickets, deadlines, orders, meetings, broadcasts, activity, settings, chat } = db();
  res.json({ schemes, emails, tickets, deadlines, orders, meetings, broadcasts, activity, settings, chat });
});

// ---------- AI triage (simulated provider call) ----------
// In production this routes through the pluggable LLMService (Claude / Gemini / DeepSeek / OpenAI).
// The demo classifies with deterministic rules so it runs with no API key.
function triageEmail(email) {
  const text = (email.subject + " " + email.body).toLowerCase();
  const provider = db().settings.llm.perFeature.triage || db().settings.llm.provider;
  const lotMatch = email.body.match(/lot\s*(\d+)/i) || email.subject.match(/lot\s*(\d+)/i);
  const base = { provider, model: db().settings.llm.model, confidence: 0.93, lot: lotMatch ? lotMatch[1] : null };

  if (/(leak|plumb|water|burst|drip)/.test(text)) return { ...base, category: "Maintenance", subcategory: "Plumbing", priority: /urgent|worse|today/.test(text) ? "Urgent" : "High", suggestedWorkflow: "Maintenance triage", actions: ["Create work order — plumber (preferred: PipeRight P/L)", "SMS assigned manager", "Auto-reply to owner with ticket number"], summary: "Active water leak reported through bathroom ceiling; likely common riser. Owner requests same-day attendance." };
  if (/(certificate|s151|s184|settlement|conveyanc)/.test(text)) return { ...base, category: "Certificate request", subcategory: "OC certificate", priority: "High", suggestedWorkflow: "Certificate fulfilment", actions: ["Create order in OC Order Portal (pre-filled)", "Add statutory deadline to compliance calendar", "Send payment link to requester"], summary: "Solicitor requests an owners corporation certificate ahead of settlement. Statutory turnaround applies." };
  if (/(levy|arrears|payment plan|invoice.*levy|quarterly)/.test(text)) return { ...base, category: "Levies", subcategory: "Owner query", priority: "Medium", suggestedWorkflow: "Levy query", actions: ["Draft reply with levy breakdown from trust sync", "Offer monthly payment option", "Log query against lot"], summary: "Owner queries an increase in the quarterly levy and asks about monthly payments." };
  if (/(agm|agenda|motion|meeting|notice)/.test(text)) return { ...base, category: "Meetings", subcategory: "AGM agenda", priority: "Medium", suggestedWorkflow: "AGM preparation", actions: ["Push 2 motions to draft agenda in AGM Platform", "Confirm notice deadline from compliance calendar", "Reply to chair with deadline"], summary: "Committee chair submits two motions for the AGM and asks for the notice deadline." };
  if (/(invoice|attached.*\$|incl gst)/.test(text)) return { ...base, category: "Accounts", subcategory: "Invoice", priority: "Low", suggestedWorkflow: "Invoice approval", actions: ["OCR extract: $1,265.00 · BrightSpark Electrical", "Match to Emergency lighting workflow", "Queue for approval"], summary: "Contractor invoice for emergency lighting test; matched to an existing maintenance workflow." };
  return { ...base, category: "Maintenance", subcategory: "General", priority: "Medium", suggestedWorkflow: "Maintenance triage", actions: ["Create ticket", "Notify assigned manager"], summary: "General maintenance request identified from the message body.", confidence: 0.81 };
}

app.post("/api/emails/:id/triage", (req, res) => {
  const email = db().emails.find((e) => e.id === req.params.id);
  if (!email) return res.status(404).json({ error: "Email not found" });
  email.triage = triageEmail(email);
  email.status = "triaged";
  store.save();
  setTimeout(() => res.json(email), 900); // simulate model latency
});

app.post("/api/emails/:id/accept", (req, res) => {
  const email = db().emails.find((e) => e.id === req.params.id);
  if (!email || !email.triage) return res.status(400).json({ error: "Triage first" });
  const t = email.triage;
  const id = "T-" + (1042 + db().tickets.length);
  const nowDate = new Date().toISOString().slice(0, 10);
  const ticket = {
    id, schemeId: email.schemeId, title: email.subject, category: t.category,
    priority: t.priority, status: "Open", lot: t.lot || "—", assignee: "Dana W.",
    workflow: t.suggestedWorkflow, createdAt: nowDate,
    steps: [
      { label: "Ticket created from email", done: true, at: nowDate },
      { label: `AI triage → ${t.category} / ${t.subcategory}`, done: true, at: nowDate },
      ...t.actions.map((a) => ({ label: a, done: false })),
    ],
  };
  db().tickets.unshift(ticket);
  email.status = "converted";
  email.ticketId = id;
  db().activity.unshift({ at: nowDate, text: `Ticket ${id} created from “${email.subject}” — routed to ${t.suggestedWorkflow}.`, kind: "ai" });
  store.save();
  res.json({ ticket, email });
});

// ---------- Tickets ----------
app.post("/api/tickets/:id/advance", (req, res) => {
  const ticket = db().tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Not found" });
  const next = ticket.steps.find((s) => !s.done);
  if (next) { next.done = true; next.at = new Date().toISOString().slice(0, 10); }
  if (ticket.steps.every((s) => s.done)) ticket.status = "Closed";
  else if (ticket.status === "Open") ticket.status = "In progress";
  store.save();
  res.json(ticket);
});

// ---------- Compliance ----------
app.post("/api/deadlines/:id/complete", (req, res) => {
  const dl = db().deadlines.find((x) => x.id === req.params.id);
  if (!dl) return res.status(404).json({ error: "Not found" });
  dl.status = "done";
  dl.completedAt = new Date().toISOString().slice(0, 10);
  store.save();
  res.json(dl);
});

// ---------- Resident chatbot (simulated RAG with citations) ----------
const kb = [
  { doc: "By-laws (consolidated 2024), by-law 14", topics: /pet|dog|cat|animal/, answer: "Pets are allowed with written approval from the owners corporation. Approval can't be unreasonably refused for a small pet kept within the lot. Submit the pet application form and the committee responds within 21 days." },
  { doc: "AGM minutes — 6 Jun 2026, item 4", topics: /levy|levies|fee|quarterly|increase/, answer: "At the last AGM the owners corporation approved a 6% increase to administrative fund levies to cover higher insurance premiums, effective this quarter. Monthly payment plans are available — the manager can set one up for you." },
  { doc: "By-laws, by-law 9 (noise)", topics: /noise|party|loud|music/, answer: "Residents must not create noise likely to interfere with the peaceful enjoyment of other lots, particularly between 10pm and 7am. Persistent issues can be reported to the manager for a by-law breach notice." },
  { doc: "Maintenance register", topics: /leak|repair|broken|maintenance|fix|intercom/, answer: "Common property repairs are handled by the owners corporation. I can log a maintenance request for you now — reply with your lot number and a short description, and it goes straight into the manager's triage queue." },
  { doc: "AGM Platform — meeting schedule", topics: /agm|meeting|vote|proxy/, answer: "The next general meeting for your scheme is shown in the meetings tab. Notices are emailed at least 14 days ahead, and you can vote online or appoint a proxy through the meeting link in your notice." },
];

app.post("/api/chat", (req, res) => {
  const { message } = req.body || {};
  db().chat.push({ role: "user", text: message });
  const hit = kb.find((k) => k.topics.test((message || "").toLowerCase()));
  const provider = db().settings.llm.perFeature.chatbot || db().settings.llm.provider;
  let reply;
  if (hit) reply = { role: "assistant", text: hit.answer, citation: hit.doc, provider };
  else reply = { role: "assistant", text: "I couldn't find that in your scheme's documents, so I won't guess — I've flagged this for your strata manager, who will reply by email within one business day.", escalated: true, provider };
  db().chat.push(reply);
  store.save();
  setTimeout(() => res.json(reply), 800);
});

// ---------- Settings ----------
app.put("/api/settings/llm", (req, res) => {
  Object.assign(db().settings.llm, req.body);
  store.save();
  res.json(db().settings.llm);
});
app.post("/api/settings/email/:id/toggle", (req, res) => {
  const mb = db().settings.email.find((m) => m.id === req.params.id);
  if (!mb) return res.status(404).json({ error: "Not found" });
  const connecting = mb.status !== "connected";
  mb.status = connecting ? "connected" : "not_connected";
  if (connecting && !mb.address) mb.address = req.body?.address || "office@bayviewstrata.com.au";
  mb.scope = connecting ? "Read + send" : "";
  store.save();
  res.json(mb);
});
app.post("/api/settings/integrations/:id/toggle", (req, res) => {
  const it = db().settings.integrations.find((m) => m.id === req.params.id);
  if (!it) return res.status(404).json({ error: "Not found" });
  it.status = it.status === "connected" ? "not_connected" : "connected";
  if (it.id === "int-piq" && it.status === "connected") it.detail = "API sync · every 4h";
  store.save();
  res.json(it);
});

app.post("/api/reset", (req, res) => { store.reset(); res.json({ ok: true }); });

module.exports = app;
