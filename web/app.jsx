import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const api = async (path, opts) => {
  const r = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, ...opts });
  return r.json();
};

/* ── tiny icons ── */
const I = {
  home: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>,
  inbox: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5 5h14l3 7v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z"/></svg>,
  flow: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.5 6H15a3 3 0 013 3v3M16.5 18H9a3 3 0 01-3-3v-3"/></svg>,
  shield: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>,
  users: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/><path d="M16 4.6a3.5 3.5 0 010 6.8M17.5 15.2c2 .7 3.5 2.2 4 4.8"/></svg>,
  cog: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.15-1.4l2.1-1.6-2-3.4-2.5 1a7 7 0 00-2.4-1.4L13.6 2h-3.2l-.5 2.6a7 7 0 00-2.4 1.4l-2.5-1-2 3.4 2.1 1.6A7 7 0 005 12c0 .5.05 1 .15 1.4l-2.1 1.6 2 3.4 2.5-1a7 7 0 002.4 1.4l.5 2.6h3.2l.5-2.6a7 7 0 002.4-1.4l2.5 1 2-3.4-2.1-1.6c.1-.5.15-.9.15-1.4z"/></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z"/></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4"><path d="M4 12.5l5 5L20 7"/></svg>,
};

const prioColor = { Urgent: "var(--red)", High: "var(--amber)", Medium: "var(--teal)", Low: "var(--muted-2)" };
const Prio = ({ p }) => <span className="prio" style={{ "--pc": prioColor[p] }} title={p + " priority"}/>;
const Bands = () => null; // signature moved to the activity ring (see Ring component)
const Ring = ({ pct, color = "var(--green)", size = 56 }) => (
  <span className="ring" style={{ "--ring-p": pct, "--ring-c": color, width: size, height: size }}>
    <span className="ring-inner" style={{ width: size - 14, height: size - 14 }}>{pct}%</span>
  </span>
);
const daysTo = (iso) => Math.ceil((new Date(iso) - new Date()) / 86400000);

/* ══════════ Dashboard ══════════ */
function Dashboard({ data, go }) {
  const open = data.tickets.filter((t) => t.status !== "Closed").length;
  const newMail = data.emails.filter((e) => e.status === "new").length;
  const dueSoon = data.deadlines.filter((x) => x.status === "open" && daysTo(x.due) <= 14).length;
  const next = data.deadlines.filter((x) => x.status === "open").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Good morning, Dana</h1>
          <p className="sub">Here's what needs your attention across Bayview Strata's 3 schemes today.</p>
        </div>
      </div>
      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <div className="card kpi" style={{ "--kc": "var(--coral)" }}><div className="k-label">Inbox awaiting triage</div><div className="k-val">{newMail}</div><div className="k-note"><button className="btn ghost sm" onClick={() => go("inbox")}>Run AI triage →</button></div></div>
        <div className="card kpi" style={{ "--kc": "var(--amber)" }}><div className="k-label">Deadlines within 14 days</div><div className="k-val">{dueSoon}</div><div className="k-note"><button className="btn ghost sm" onClick={() => go("compliance")}>Open calendar →</button></div></div>
        <div className="card kpi"><div className="k-label">Open tickets</div><div className="k-val">{open}</div><div className="k-note"><button className="btn ghost sm" onClick={() => go("workflows")}>View workflows →</button></div></div>
        <div className="card kpi"><div className="k-label">Chatbot deflection · 30d</div>
          <div className="ring-wrap" style={{ marginTop: 6 }}><Ring pct={57} color="var(--green)"/><div><div className="k-note" style={{ color: "var(--green)", fontWeight: 600, margin: 0 }}>≈ 9.5 hrs saved</div><div className="meta">of resident queries</div></div></div>
        </div>
      </div>
      <div className="grid cols-2">
        <div className="card">
          <div className="card-h"><h3>Next compliance deadlines</h3><span className="hint">auto-generated from state rule packs</span></div>
          <div className="card-b">
            {next.map((x) => <DeadlineRow key={x.id} x={x} data={data} compact/>)}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h3>Activity</h3><span className="hint">all products, one feed</span></div>
          <div className="card-b">
            {data.activity.slice(0, 6).map((a, i) => (
              <div className="row" key={i}>
                <span className={`chip ${a.kind === "ai" ? "teal" : a.kind === "compliance" ? "amber" : "grey"}`}>{a.kind === "ai" ? <>{I.spark} AI</> : a.kind}</span>
                <div className="grow"><div style={{ fontSize: 13.5 }}>{a.text}</div><div className="meta">{a.at}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════ Inbox / AI triage ══════════ */
function Inbox({ data, refresh, toast, go }) {
  const [selId, setSelId] = useState(data.emails.find((e) => e.status === "new")?.id || data.emails[0]?.id);
  const [busy, setBusy] = useState(false);
  const email = data.emails.find((e) => e.id === selId);
  const scheme = email && data.schemes.find((s) => s.id === email.schemeId);

  const runTriage = async () => { setBusy(true); await api(`/emails/${email.id}/triage`, { method: "POST" }); setBusy(false); refresh(); };
  const accept = async () => {
    const r = await api(`/emails/${email.id}/accept`, { method: "POST" });
    toast(`Ticket ${r.ticket.id} created — routed to “${r.ticket.workflow}”`);
    refresh();
  };
  const t = email?.triage;
  return (
    <>
      <div className="page-head">
        <div><span className="eyebrow">AI triage</span><h1>Inbox</h1>
        <p className="sub">Connected mailboxes: <b>admin@ (Gmail)</b> and <b>maintenance@ (Microsoft 365)</b>. Every email lands here; AI triage classifies it and proposes the workflow — you stay in control with one click to accept.</p></div>
      </div>
      <div className="split">
        <div className="card" style={{ overflow: "hidden" }}>
          {data.emails.map((e) => (
            <button key={e.id} className={`mail-item ${e.id === selId ? "sel" : ""}`} onClick={() => setSelId(e.id)}>
              <span className="from"><span className="ellipsis">{e.name}</span>
                <span style={{ marginLeft: "auto" }} className={`chip ${e.status === "new" ? "coral" : e.status === "triaged" ? "amber" : "green"}`}>{e.status === "converted" ? "ticketed" : e.status}</span></span>
              <span className="subj ellipsis">{e.subject}</span>
              <span className="prev ellipsis">{e.body}</span>
            </button>
          ))}
        </div>
        {email && (
          <div className="card"><div className="card-b" style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <h3 style={{ font: "600 18px var(--display)", margin: 0 }}>{email.subject}</h3>
                <span className="chip navy">{scheme?.name}</span>
              </div>
              <div className="meta">{email.name} · {email.from} · {email.received}</div>
            </div>
            <div className="mail-body">{email.body}</div>

            {!t && !busy && (
              <div className="triage-box">
                <b style={{ fontFamily: "var(--display)" }}>AI triage</b>
                <p style={{ margin: "4px 0 12px", color: "var(--muted)" }}>Classify this email, extract the lot and urgency, and propose the right workflow. Nothing happens until you accept.</p>
                <button className="btn primary" onClick={runTriage}>{I.spark} Run AI triage</button>
              </div>
            )}
            {busy && <div className="triage-box"><span className="thinking">Analysing with {data.settings.llm.provider === "anthropic" ? "Claude" : data.settings.llm.provider} <i/><i/><i/></span></div>}
            {t && !busy && (
              <div className="triage-box done">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="chip teal">{I.spark} Triage result</span>
                  <span className="chip grey">{Math.round(t.confidence * 100)}% confidence · {t.model}</span>
                </div>
                <p style={{ margin: "10px 0 0" }}>{t.summary}</p>
                <div className="tr-grid">
                  <div><div className="lab">Category</div><div className="val">{t.category} · {t.subcategory}</div></div>
                  <div><div className="lab">Priority</div><div className="val" style={{ display: "flex", gap: 8, alignItems: "center" }}><Prio p={t.priority}/>{t.priority}</div></div>
                  <div><div className="lab">Lot</div><div className="val">{t.lot || "Common / n.a."}</div></div>
                  <div><div className="lab">Workflow</div><div className="val">{t.suggestedWorkflow}</div></div>
                </div>
                <div className="lab" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)" }}>Proposed actions</div>
                {t.actions.map((a, i) => <div className="action-li" key={i}><span className="n">{i + 1}</span><span>{a}</span></div>)}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  {email.status !== "converted"
                    ? <><button className="btn primary" onClick={accept}>Accept & create ticket</button><button className="btn" onClick={runTriage}>Re-run</button></>
                    : <button className="btn" onClick={() => go("workflows")}>Ticket {email.ticketId} created — view workflow →</button>}
                </div>
              </div>
            )}
          </div></div>
        )}
      </div>
    </>
  );
}

/* ══════════ Workflows / tickets ══════════ */
function Workflows({ data, refresh, toast }) {
  const [sel, setSel] = useState(data.tickets[0]?.id);
  useEffect(() => { if (!data.tickets.find((t) => t.id === sel)) setSel(data.tickets[0]?.id); }, [data.tickets.length]);
  const ticket = data.tickets.find((t) => t.id === sel);
  const scheme = ticket && data.schemes.find((s) => s.id === ticket.schemeId);
  const advance = async () => { const r = await api(`/tickets/${ticket.id}/advance`, { method: "POST" }); toast(r.status === "Closed" ? `${r.id} completed 🎉` : "Step completed"); refresh(); };
  return (
    <>
      <div className="page-head"><div><span className="eyebrow">Automation</span><h1>Workflows</h1><p className="sub">Every ticket runs a workflow with a full audit trail. Complete the next step, or let automations do it for you.</p></div></div>
      <div className="split" style={{ gridTemplateColumns: "380px 1fr" }}>
        <div className="card" style={{ overflow: "hidden" }}>
          {data.tickets.map((tk) => (
            <button key={tk.id} className={`mail-item ${tk.id === sel ? "sel" : ""}`} onClick={() => setSel(tk.id)}>
              <span className="from"><Prio p={tk.priority}/><span className="ellipsis">{tk.title}</span>
                <span style={{ marginLeft: "auto" }} className={`chip ${tk.status === "Closed" ? "green" : tk.status === "Waiting" ? "amber" : "teal"}`}>{tk.status}</span></span>
              <span className="prev">{tk.id} · {data.schemes.find((s) => s.id === tk.schemeId)?.name} · {tk.workflow}</span>
            </button>
          ))}
        </div>
        {ticket && (
          <div className="card"><div className="card-b">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <h3 style={{ font: "600 18px var(--display)", margin: 0 }}>{ticket.title}</h3>
              <span className="chip navy">{scheme?.name}</span><span className="chip grey">Lot {ticket.lot}</span>
            </div>
            <div className="meta" style={{ margin: "3px 0 16px" }}>{ticket.id} · {ticket.workflow} · assigned to {ticket.assignee} · opened {ticket.createdAt}</div>
            <div className="steps">
              {ticket.steps.map((s, i) => (
                <div className={`step ${s.done ? "done" : ""}`} key={i}>
                  <span className="bullet">{s.done && I.check}</span>
                  <div><div className="s-label">{s.label}</div>{s.at && <div className="s-at">{s.at}</div>}</div>
                </div>
              ))}
            </div>
            {ticket.status !== "Closed" && <button className="btn primary" onClick={advance}>Complete next step</button>}
          </div></div>
        )}
      </div>
    </>
  );
}

/* ══════════ Compliance ══════════ */
function DeadlineRow({ x, data, refresh, toast, compact }) {
  const n = daysTo(x.due);
  const done = x.status === "done";
  const tone = done ? { bx: "var(--green-soft)", bc: "var(--green)" } : n <= 5 ? { bx: "var(--coral-soft)", bc: "var(--coral)" } : n <= 14 ? { bx: "var(--amber-soft)", bc: "#9A6A12" } : {};
  const scheme = data.schemes.find((s) => s.id === x.schemeId);
  const complete = async () => { await api(`/deadlines/${x.id}/complete`, { method: "POST" }); toast("Marked complete — logged to audit trail"); refresh(); };
  return (
    <div className="dl-row">
      <div className="due-box" style={{ "--bx": tone.bx, "--bc": tone.bc }}>
        {done ? <><small>DONE</small><div className="n">✓</div></> : <><small>{n < 0 ? "OVERDUE" : "DUE IN"}</small><div className="n">{Math.abs(n)}d</div></>}
      </div>
      <div className="grow">
        <div className="title">{x.title}</div>
        <div className="meta">{scheme?.name} · <b>{scheme?.state}</b> · {x.rule}</div>
        {!compact && <div className="meta">Source: {x.source}</div>}
      </div>
      {!compact && !done && <button className="btn sm" onClick={complete}>Mark done</button>}
    </div>
  );
}
function Compliance({ data, refresh, toast }) {
  const [state, setState] = useState("All");
  const list = data.deadlines.filter((x) => state === "All" || data.schemes.find((s) => s.id === x.schemeId)?.state === state).sort((a, b) => (a.status === "done") - (b.status === "done") || a.due.localeCompare(b.due));
  return (
    <>
      <div className="page-head">
        <div><span className="eyebrow">Stay compliant</span><h1>Compliance calendar</h1>
        <p className="sub">Deadlines are generated automatically from each scheme's state rule pack, plus live events from the OC Order Portal and AGM Platform. Alerts fire at 30 / 14 / 7 / 1 days.</p></div>
        <div className="spacer"/>
        <div style={{ display: "flex", gap: 8 }}>
          {["All", "NSW", "VIC", "QLD"].map((s) => <button key={s} className={`btn sm ${state === s ? "primary" : ""}`} onClick={() => setState(s)}>{s}</button>)}
        </div>
      </div>
      <div className="card"><div className="card-b">
        {list.map((x) => <DeadlineRow key={x.id} x={x} data={data} refresh={refresh} toast={toast}/>)}
      </div></div>
    </>
  );
}

/* ══════════ Committee (chat, meetings, orders) ══════════ */
function Committee({ data, refresh }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef();
  useEffect(() => { logRef.current?.scrollTo(0, 1e6); }, [data.chat.length, busy]);
  const send = async (text) => {
    const m = text || msg; if (!m.trim()) return;
    setMsg(""); setBusy(true);
    data.chat.push({ role: "user", text: m });
    await api("/chat", { method: "POST", body: JSON.stringify({ message: m }) });
    setBusy(false); refresh();
  };
  return (
    <>
      <div className="page-head"><div><span className="eyebrow">Engagement</span><h1>Committee & residents</h1>
      <p className="sub">The resident assistant answers from each scheme's own documents — by-laws, minutes, levy schedules — with citations, and escalates to you when it isn't sure. Meetings come from the AGM Platform; certificates from the OC Order Portal.</p></div></div>
      <div className="grid cols-2">
        <div className="card chat">
          <div className="card-h"><h3>Resident assistant — Harbourline Apartments</h3><span className="hint">answers cite source documents</span></div>
          <div className="chat-log" ref={logRef}>
            {data.chat.map((c, i) => (
              <div key={i} className={`bubble ${c.role === "user" ? "user" : "ai"}`}>
                {c.text}
                {c.citation && <div><span className="cite">📄 {c.citation}</span></div>}
                {c.escalated && <div><span className="esc">↗ Escalated to your manager</span></div>}
              </div>
            ))}
            {busy && <div className="bubble ai"><span className="thinking">Checking scheme documents <i/><i/><i/></span></div>}
          </div>
          <div className="suggest">
            {["Can I keep a dog?", "Why did my levy go up?", "When is the next AGM?", "What's the weather tomorrow?"].map((s) => <button key={s} className="btn sm" onClick={() => send(s)}>{s}</button>)}
          </div>
          <div className="chat-input">
            <input value={msg} placeholder="Ask about by-laws, levies, meetings…" onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}/>
            <button className="btn primary" onClick={() => send()}>Send</button>
          </div>
        </div>
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="card">
            <div className="card-h"><h3>Meetings</h3><span className="hint">from AGM Meeting Platform</span></div>
            <div className="card-b">
              {data.meetings.map((m) => (
                <div className="row" key={m.id}>
                  <span className={`chip ${m.status === "Notice pending" ? "amber" : m.status === "Scheduled" ? "teal" : "green"}`}>{m.status}</span>
                  <div className="grow"><div className="title">{m.type} — {data.schemes.find((s) => s.id === m.schemeId)?.name}</div>
                  <div className="meta">{m.date} · {m.agendaItems} agenda items · quorum {m.quorum}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Certificate orders</h3><span className="hint">from OC Order Portal</span></div>
            <div className="card-b">
              {data.orders.map((o) => (
                <div className="row" key={o.id}>
                  <span className={`chip ${o.status === "Fulfilled" ? "green" : o.status === "New" ? "coral" : "amber"}`}>{o.status}</span>
                  <div className="grow"><div className="title">{o.type} · Lot {o.lot}</div>
                  <div className="meta">{o.id} · {o.requester} · due {o.due} · {o.paid ? "paid" : "unpaid"}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════ Settings ══════════ */
const PROVIDERS = [
  { id: "anthropic", name: "Claude", by: "Anthropic", models: ["claude-sonnet-4-6", "claude-haiku-4-5"] },
  { id: "gemini", name: "Gemini", by: "Google", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  { id: "deepseek", name: "DeepSeek", by: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  { id: "openai", name: "OpenAI", by: "OpenAI", models: ["gpt-5.1", "gpt-5-mini"] },
  { id: "custom", name: "Custom endpoint", by: "OpenAI-compatible", models: ["set base URL + model"] },
];
const markColor = { gmail: "#D14836", microsoft: "#0F6CBD", smtp: "#5D7078", internal: "var(--teal)", trust: "var(--navy-2)", accounting: "#0E6BA8" };

function Settings({ data, refresh, toast }) {
  const llm = data.settings.llm;
  const setLLM = async (patch) => { await api("/settings/llm", { method: "PUT", body: JSON.stringify(patch) }); refresh(); };
  const provider = PROVIDERS.find((p) => p.id === llm.provider) || PROVIDERS[0];
  return (
    <>
      <div className="page-head"><div><span className="eyebrow">Configuration</span><h1>Settings</h1>
      <p className="sub">Bring your own AI provider, your own mailboxes and your existing strata platform — StrataFlow is the layer on top.</p></div></div>
      <div style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <div className="card-h"><h3>AI provider</h3><span className="hint">applies to triage, drafting & chatbot · per-feature overrides available</span></div>
          <div className="card-b" style={{ display: "grid", gap: 14 }}>
            <div className="providers">
              {PROVIDERS.map((p) => (
                <button key={p.id} className={`provider ${llm.provider === p.id ? "sel" : ""}`} onClick={() => setLLM({ provider: p.id, model: p.models[0] })}>
                  <b>{p.name}</b><small>{p.by}</small>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ fontWeight: 600 }}>Model</label>
              <select value={llm.model} onChange={(e) => setLLM({ model: e.target.value })}>
                {provider.models.map((m) => <option key={m}>{m}</option>)}
              </select>
              <label style={{ fontWeight: 600 }}>API key</label>
              <input type="password" placeholder={llm.apiKeySet ? "•••••••••••• (saved)" : "Paste your key (bring your own key)"} onBlur={(e) => e.target.value && (setLLM({ apiKeySet: true }), toast("API key saved (encrypted at rest)"))}/>
              <span className="chip grey">Fallback: platform default if provider errors</span>
            </div>
            <p className="meta" style={{ margin: 0 }}>Demo runs in simulation mode — no key needed. In production, every AI action records the provider and model in the audit trail, and costs are tracked per provider.</p>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="card">
            <div className="card-h"><h3>Email connections</h3><span className="hint">replies send from your own mailbox</span></div>
            <div className="card-b">
              {data.settings.email.map((mb) => (
                <div className="set-row" key={mb.id}>
                  <span className="mark" style={{ background: markColor[mb.kind] }}>{mb.kind === "gmail" ? "G" : mb.kind === "microsoft" ? "M" : "@"}</span>
                  <div className="grow">
                    <div className="title">{mb.kind === "gmail" ? "Gmail / Google Workspace" : mb.kind === "microsoft" ? "Microsoft 365 / Outlook" : "Other provider (IMAP + SMTP)"}</div>
                    <div className="meta">{mb.status === "connected" ? `${mb.address} · ${mb.scope} · OAuth` : mb.kind === "smtp" ? "Any mailbox via IMAP/SMTP credentials" : "Connect with OAuth — least-privilege scopes"}</div>
                  </div>
                  {mb.status === "connected" ? <span className="chip green"><span className="dot"/>Connected</span> : null}
                  <button className="btn sm" onClick={async () => { await api(`/settings/email/${mb.id}/toggle`, { method: "POST" }); toast(mb.status === "connected" ? "Mailbox disconnected" : "Mailbox connected"); refresh(); }}>
                    {mb.status === "connected" ? "Disconnect" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Integrations</h3><span className="hint">your existing products & platforms</span></div>
            <div className="card-b">
              {data.settings.integrations.map((it) => (
                <div className="set-row" key={it.id}>
                  <span className="mark" style={{ background: markColor[it.kind] }}>{it.name[0]}</span>
                  <div className="grow"><div className="title">{it.name}</div><div className="meta">{it.detail}{it.kind === "internal" ? " · built in-house" : ""}</div></div>
                  {it.status === "connected"
                    ? <span className="chip green"><span className="dot"/>Connected</span>
                    : <button className="btn sm" onClick={async () => { await api(`/settings/integrations/${it.id}/toggle`, { method: "POST" }); toast(`${it.name} connected`); refresh(); }}>Connect</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════ App shell ══════════ */
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: I.home },
  { id: "inbox", label: "Inbox", icon: I.inbox },
  { id: "workflows", label: "Workflows", icon: I.flow },
  { id: "compliance", label: "Compliance", icon: I.shield },
  { id: "committee", label: "Committee", icon: I.users },
  { id: "settings", label: "Settings", icon: I.cog },
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const refresh = async () => setData(await api("/bootstrap"));
  useEffect(() => { refresh(); }, []);
  const toast = (m) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 2600); };
  if (!data) return <div className="empty" style={{ paddingTop: 120 }}>Loading StrataFlow…</div>;
  const newMail = data.emails.filter((e) => e.status === "new").length;
  const props = { data, refresh, toast, go: setPage };
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><span className="bands"><span/><span/><span/></span><b>Strata<em>Flow</em></b></div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
            {n.icon}{n.label}{n.id === "inbox" && newMail > 0 && <span className="pill">{newMail}</span>}
          </button>
        ))}
        <div className="foot"><b>Bayview Strata Group</b>3 schemes · 124 lots · demo data</div>
      </aside>
      <main className="main">
        {page === "dashboard" && <Dashboard {...props}/>}
        {page === "inbox" && <Inbox {...props}/>}
        {page === "workflows" && <Workflows {...props}/>}
        {page === "compliance" && <Compliance {...props}/>}
        {page === "committee" && <Committee {...props}/>}
        {page === "settings" && <Settings {...props}/>}
      </main>
      <nav className="bottom-nav">
        {NAV.map((n) => <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => setPage(n.id)}>{n.icon}{n.label}</button>)}
      </nav>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
