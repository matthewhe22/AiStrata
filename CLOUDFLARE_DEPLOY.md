# StrataFlow → Cloudflare Pages

**Status: deployed and live at <https://strataflow.pages.dev>.**
DNS still points at Netlify — the cutover has not been made.

`strataflow.work` is already on Cloudflare DNS (`jake.ns.cloudflare.com`,
`noor.ns.cloudflare.com`), so this is a DNS-record swap inside a zone already
owned — no registrar or nameserver change needed. The site is static
HTML/CSS/JS, the ideal case for Pages.

---

## What is deployed

| Piece | Where | Notes |
|---|---|---|
| Marketing site (`website/`) | **Cloudflare Pages** project `strataflow` | live at `strataflow.pages.dev`; still served on `strataflow.work` by Netlify until the cutover |
| Demo app (`web/` + `api/` + `server/`) | **Vercel** project `aistrata` | `aistrata.vercel.app` |
| Contact form backend (`worker/`) | **Cloudflare Worker** `strataflow-form` | live at `strataflow-form.strataflow.workers.dev`; the site falls back to this URL until the cutover makes the same-origin `/api/contact` route live |

Deploy / redeploy the site:

```bash
cd ~/Documents/strataflows
export CLOUDFLARE_API_TOKEN=...            # token with Pages:Edit
export CLOUDFLARE_ACCOUNT_ID=2cbce9c1dba758a4a824d9a777ddc8b2
npx wrangler pages deploy website --project-name=strataflow --branch=main
```

---

## Hard-won constraints (verified — do not re-litigate)

**1. Direct Upload does not support a `functions/` directory.**
`wrangler pages deploy <dir>` uploads static assets only; there is no
`--functions-directory` flag. Server-side code with Direct Upload requires
Advanced Mode (`_worker.js`).

**2. Pages projects cannot take a `send_email` binding.**
`PATCH /accounts/{id}/pages/projects/{name}` with `send_email` returns
`success: true` and then reads back as `null`. Tried both the object and the
array shape. The binding has to live on a **Worker**.

**3. `web/` (the demo) needs a build step.**
`web/index.html` loads `/app.js`, but the repo only contained `web/app.jsx`
(React source) — no bundler, no `build` script, no committed `app.js`. So
Vercel was failing the build *and* serving an empty shell. Fixed with
`esbuild.config.mjs`, run by `npm run build`.

> Gotcha: `--define:process.env.NODE_ENV=production` on the CLI substitutes the
> bare *identifier* `production`, which throws a ReferenceError inside React.
> The config file uses `JSON.stringify()` so the value is a real string.

**4. The contact form is delivered by a Worker, not by the host.**
`POST /` with `form-name=contact` returns **404 on Netlify** (Forms never handled
it) and **405 on Pages**. The form posts same-origin to `/api/contact`, and
falls back to the Worker URL while the hostname is still on Netlify. It fails
loudly rather than reporting a false "sent", so no lead is silently lost.

**5. Zoho refuses mail from Cloudflare Email Routing.**
`matthew.he@capconnex.com.au` is hosted on Zoho. Both the forward path and the
`send_email` binding fail with `temporary delivery failure`, retried and
persistently failing, while a direct SMTP probe of `mx.zoho.com` accepts the
same mailbox with `250`. Outlook (`matthew.he@outlook.com`) accepts the same
mail without complaint, so the routing destination is Outlook for now.

> Allow for a few minutes of propagation after verifying a destination — sends
> immediately after verification failed, then succeeded a minute later.

---

## Step 1 — The form Worker (deployed)

Live as `strataflow-form`. Redeploy after any change to `worker/`:

```bash
cd ~/Documents/strataflows/worker
export CLOUDFLARE_API_TOKEN=...            # needs Account -> Workers Scripts -> Edit
export CLOUDFLARE_ACCOUNT_ID=2cbce9c1dba758a4a824d9a777ddc8b2
npx wrangler deploy
```

> A `workers.dev` subdomain had to be registered first (`strataflow.workers.dev`);
> without one `wrangler deploy` refuses unless the Worker has a route.

Then route it on the site's own domain:

- Workers route: `strataflow.work/api/*` → Worker `strataflow-form`

`wrangler.toml` already declares the binding:

```toml
[[send_email]]
name = "SEND_EMAIL"
```

The recipient must be an address **already verified in Email Routing**;
`matthew.he@capconnex.com.au` is. Sending as `hello@strataflow.work` needs
Email Routing enabled on the zone (it is).

Sanity check after deploy: `GET /health` should return
`{"ok":true,"send_email_bound":true}`.

---

## Step 2 — Cut over DNS

Once `strataflow.pages.dev` and the Worker both look right:

1. Add `strataflow.work` and `www.strataflow.work` under **Pages → Custom domains**
2. Let Cloudflare provision SSL
3. **Remove the Netlify records** — both names are currently `CNAME` →
   `nervous-perlman-239168.netlify.app` (`proxied=false`). They will otherwise
   keep taking precedence and the site will keep serving from Netlify.
4. Disconnect the site in Netlify so it stops auto-deploying.

Do the steps in that order to avoid downtime.

---

## Step 3 — Email routing

Already configured on the zone:

```
MX     route1/2/3.mx.cloudflare.net                      (21/22/23)
TXT    v=spf1 include:_spf.mx.cloudflare.net ~all
TXT    cf2024-1._domainkey   <Cloudflare Email Routing DKIM>
TXT    _dmarc  "v=DMARC1; p=none; rua=mailto:matthew.he@capconnex.com.au; fo=1"
```

Routes (`/zones/{id}/email/routing/rules`):

| From | To |
|---|---|
| `hello@strataflow.work` | `matthew.he@capconnex.com.au` |
| `info@strataflow.work` | `matthew.he@capconnex.com.au` |
| `accounts@strataflow.work` | `matthew.he@capconnex.com.au` |

**Outstanding:** a test message was accepted by Cloudflare's MX
(`RCPT TO -> 250 2.1.0 Ok`) and produced no bounce, but arrival is not yet
confirmed. `capconnex.com.au` is hosted on **Zoho** (`mx.zoho.com`) with
`DMARC p=quarantine`, and forwarded mail is a common spam-filter casualty —
check Zoho's Spam folder before assuming the routing is broken.

Email Routing is **receive-and-forward only**: no outbound SMTP. Replying *as*
`hello@strataflow.work` would need a sending service (Resend/Brevo) or the
Worker's `send_email` path.

---

## Step 4 — Costs

All free at this scale, per Cloudflare's Pages Functions pricing page:

- Static asset requests: **free and unlimited** on every plan
- Pages Functions / Worker requests: **100,000/day** on the Workers Free plan, resetting midnight UTC
- Email Routing: free

A request only counts against the quota when it invokes server-side code
(`a request is considered static when it does not invoke Functions`), so normal
page views are free regardless of volume.

---

## Change log

| Commit | What |
|---|---|
| `ae3c75f` | Remove gradients; emails → `hello@strataflow.work`; pause Stripe behind `pricing-paused.html`; add Supplier Invoice & Contract Audit feature; Pages config |
| `ada545d` | This deployment guide |
| `34ea7be` | Separate demo from marketing site; fix the broken Vercel build (esbuild pipeline + `.vercelignore`) |
| `76ec470` | Contact form → `/api/contact` with a Netlify Forms fallback; add `worker/` |

Repo hygiene done along the way: 6 site pages restored from git (they had been
deleted from the working tree) and 3 stray `Avant_AGM_Minutes_*.docx` files
moved out to `~/Documents/avant_agm_minutes/`.
