# StrataFlow → Cloudflare Pages

**Feasibility: yes.** `strataflow.work` is **already on Cloudflare DNS**
(`jake.ns.cloudflare.com`, `noor.ns.cloudflare.com`), so moving hosting from
Netlify to Cloudflare Pages needs no registrar or nameserver change — it is a
DNS-record swap inside a zone you already own. The site is pure static
HTML/CSS/JS with no build step, which is the ideal case for Pages.

---

## Why it fits

| Requirement | Status |
|---|---|
| Domain already on Cloudflare | ✅ `strataflow.work` |
| Build step | ✅ none — static files only, no `npm install` needed |
| Largest file | ✅ `logo-512.png` at 241 KB (Pages limit is 25 MiB/file) |
| Total files | ✅ ~18 files |
| Server-side functions | ⚠️ `functions/checkout.js` is a **Netlify** function — it does not run on Pages. It is currently unused because checkout is paused, so nothing breaks. |
| Email routing | ✅ Cloudflare Email Routing is free and the domain is already on Cloudflare |

## Free plan notes

Cloudflare Pages on the free plan has no bandwidth or request charges (that is
the model — Cloudflare does not bill for static egress). The practical ceilings
are around 500 builds/month, 100 custom domains per project, and unlimited
projects. For a brochure site of this size, cost is $0/month.

> Could not re-verify these numbers against the docs during this session — the
> machine's DNS resolver was failing on `developers.cloudflare.com`. Treat the
> figures as to-be-confirmed in the Cloudflare dashboard.

---

## What was already done (committed `ae3c75f`, pushed to GitHub)

Content and UI changes are **already live** on the current Netlify host:

- ✅ All contact/form emails → `hello@strataflow.work` (was `hello@strataflows.com.au` — a domain that does not exist, NXDOMAIN)
- ✅ Every gradient removed — hero, buttons, badges, cards now use flat solid colours
  (`--gradient-hero: #0F172A`, `--gradient-accent: #2563EB`); 0 `linear-gradient`/`radial-gradient` functions remain
- ✅ Stripe checkout paused — plan buttons now route to `/pricing-paused.html`;
  zero `buy.stripe.com` references remain
- ✅ New holding page `pricing-paused.html` (noindex) with a manual-onboarding route
- ✅ "Online signup is temporarily paused" notice on the pricing section
- ✅ New feature shipped: **Supplier Invoice & Contract Audit** — service card 05 +
  a full `#audit` section + nav link ("Invoice Audit")
- ✅ `_headers` and `_redirects` rewritten for Cloudflare Pages
- ✅ Repo hygiene: 6 site pages restored from git (they had been deleted from the
  working tree), 3 stray `Avant_AGM_Minutes_*.docx` files moved to
  `~/Documents/avant_agm_minutes/`

---

## Step 1 — Deploy to Cloudflare Pages

### Option A — Git integration (recommended; auto-deploys on push)

In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**:

- Repository: `matthewhe22/AiStrata`
- Branch: `main`
- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: `website`

Every future `git push` then redeploys automatically.

### Option B — Direct upload from this machine

Needs a Cloudflare API token (see Step 3) or `wrangler login`:

```bash
cd ~/Documents/strataflows
npx wrangler pages deploy website --project-name=strataflow
```

---

## Step 2 — Point the domain at Pages

Once the project exists, in **Pages → your project → Custom domains** add
`strataflow.work`. Because the zone is already on Cloudflare this creates the
DNS record automatically.

**Then remove the old Netlify DNS records** — the current `A` record
(`54.253.94.210`, Netlify) will otherwise still win and the site will keep
serving from Netlify.

Cutover order that avoids downtime:
1. Add the custom domain in Pages and let it provision SSL (usually minutes)
2. Test against the `*.pages.dev` URL first
3. Only then delete the Netlify `A`/`CNAME` records
4. Once confirmed, disconnect the site in Netlify so it stops auto-deploying

---

## Step 3 — Email routing: `hello@strataflow.work` → `matthew.he@capconnex.com.au`

Email Routing is free and takes about five minutes **but needs zone access**,
which the current API token does not have.

In the Cloudflare dashboard:

1. Select the **strataflow.work** zone → **Email → Email Routing**
2. Click **Enable Email Routing** — Cloudflare auto-adds the required `MX` and
   `TXT` (SPF) records. If the zone currently has any existing `MX` records for
   that domain, they must be removed first.
3. Under **Destination addresses** add `matthew.he@capconnex.com.au` — Cloudflare
   sends a verification email to that address; click the link to confirm.
4. Under **Routes → Custom addresses** create:
   - `hello@strataflow.work` → `matthew.he@capconnex.com.au`
   - (optional but tidy) `accounts@strataflow.work` → same destination
5. Optionally enable **Catch-all** → `matthew.he@capconnex.com.au` so nothing sent
   to the domain is ever silently dropped.

> Note: route verification is only needed once per custom address in `to` (the
> `hello@` side needs no verification — only the destination inbox does).

Verify afterwards from an external mailbox:
`hello@strataflow.work` should arrive at `matthew.he@capconnex.com.au`.

---

## Step 4 — What still needs your credentials

| Task | Blocker |
|---|---|
| Create the Pages project | Token lacks **Account → Cloudflare Pages → Edit** |
| Attach `strataflow.work` to Pages | Token lacks **Zone → strataflow.work** access |
| Enable Email Routing + custom address | Same — token only grants `capconnex.com.au` |
| Disconnect Netlify | Netlify CLI is broken locally (`Cannot find module .../netlify-cli/bin/run.js`) |

To let me finish Steps 1–3 unattended, create an API token at
<https://dash.cloudflare.com/profile/api-tokens> with:

- **Account → Cloudflare Pages → Edit**
- **Zone → DNS → Edit** (scoped to `strataflow.work`)
- **Zone → Email Routing Rules → Edit** (scoped to `strataflow.work`)

The existing token on this machine (`cfut_…`) is scoped to
`capconnex.com.au` only — it verifies as active but returns an empty zone list
for `strataflow.work`.
