/**
 * StrataFlow contact form handler (Cloudflare Worker).
 *
 * Receives POST /api/contact from the marketing site and emails the enquiry
 * through Cloudflare Email Routing's send_email binding. Deployed as a Worker
 * rather than a Pages Function because Pages projects cannot take a
 * send_email binding (the Pages API accepts one and silently discards it).
 */

const TO = "matthew.he@capconnex.com.au";
const FROM = { email: "hello@strataflow.work", name: "StrataFlow Website" };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const headerSafe = (v) => clean(v, 300).replace(/[\r\n]+/g, " ");
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    if (url.pathname === "/health") {
      return json({ ok: true, send_email_bound: Boolean(env.SEND_EMAIL) });
    }

    return json({ ok: false, error: "Not found." }, 404);
  },
};

async function handleContact(request, env) {
  let form;
  try {
    const ct = request.headers.get("content-type") || "";
    form = ct.includes("application/json")
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: "Could not read the submitted form." }, 400);
  }

  // Honeypot — bots fill hidden fields, humans do not.
  if (clean(form["bot-field"], 100)) return json({ ok: true });

  const data = {
    name: clean(form.name, 200),
    email: clean(form.email, 320),
    phone: clean(form.phone, 60),
    company: clean(form.company, 200),
    message: clean(form.message, 5000),
    source: clean(form.source, 120) || "strataflow.work",
    page: headerSafe(form.page || request.headers.get("referer") || ""),
    ip: request.headers.get("cf-connecting-ip") || "",
    at: new Date().toISOString(),
  };

  if (!data.name || !data.email || !data.message) {
    return json({ ok: false, error: "Name, email and message are required." }, 400);
  }
  if (!isEmail(data.email)) {
    return json({ ok: false, error: "That email address doesn't look valid." }, 400);
  }
  if (!env.SEND_EMAIL) {
    return json(
      { ok: false, error: "Email sending is not configured. Please email hello@strataflow.work directly." },
      503,
    );
  }

  const text = [
    "New enquiry from the StrataFlow website",
    "",
    `Name     : ${data.name}`,
    `Email    : ${data.email}`,
    `Phone    : ${data.phone || "(not supplied)"}`,
    `Company  : ${data.company || "(not supplied)"}`,
    `Received : ${data.at}`,
    `Source   : ${data.source}`,
    `Page     : ${data.page}`,
    "",
    "Message",
    "-------",
    data.message,
  ].join("\n");

  const html = `<h2 style="font:600 16px/1.4 system-ui,sans-serif">New enquiry from the StrataFlow website</h2>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font:14px/1.5 system-ui,sans-serif">
<tr><td><b>Name</b></td><td>${esc(data.name)}</td></tr>
<tr><td><b>Email</b></td><td><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></td></tr>
<tr><td><b>Phone</b></td><td>${esc(data.phone) || "&mdash;"}</td></tr>
<tr><td><b>Company</b></td><td>${esc(data.company) || "&mdash;"}</td></tr>
<tr><td><b>Received</b></td><td>${esc(data.at)}</td></tr>
<tr><td><b>Page</b></td><td>${esc(data.page)}</td></tr>
</table>
<h3 style="font:600 15px/1.4 system-ui,sans-serif;margin-top:22px">Message</h3>
<pre style="white-space:pre-wrap;font:14px/1.6 system-ui,sans-serif;margin:0">${esc(data.message)}</pre>`;

  try {
    await env.SEND_EMAIL.send({
      to: TO,
      from: FROM,
      replyTo: { email: data.email, name: data.name },
      subject: `Website enquiry — ${data.name}${data.company ? " (" + data.company + ")" : ""}`,
      text,
      html,
    });
    return json({ ok: true });
  } catch (err) {
    const detail = (err && (err.message || String(err))) || "unknown";
    console.error("contact send failed:", detail);
    // `detail` is logged, not returned: it can name the destination mailbox and
    // is not something a website visitor should see.
    return json(
      { ok: false, error: "We couldn't send your message. Please email hello@strataflow.work directly." },
      502,
    );
  }
}
