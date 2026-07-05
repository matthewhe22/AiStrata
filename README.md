# StrataFlow — Demo

AI workflow automation for strata managers. Full-stack demo: Express REST API backend + React frontend, installable as a PWA.

## Run it locally

```bash
npm install
npm run dev        # builds the frontend and starts the server
```

Open **http://localhost:4180** (set a different port with `PORT=3000 npm start`).

## Deploying to Vercel

The app is structured for Vercel out of the box:

- `vercel.json` builds the frontend (`npm run build`) and serves `web/` as static output.
- `api/index.js` exposes the Express API (`server/app.js`) as a serverless function; `/api/*` requests are rewritten to it.
- The JSON data store persists to the OS temp directory rather than the repo, since serverless filesystems are read-only outside `/tmp`. This means data resets whenever a serverless instance cold-starts — fine for a demo, but swap in a real database for anything long-lived.

Deploy with the Vercel CLI or by importing the repo in the Vercel dashboard; no environment variables or API keys are required.

## Demo walkthrough (5 minutes)

1. **Dashboard** — the "what needs my attention" view: inbox awaiting triage, deadlines within 14 days, chatbot deflection rate.
2. **Inbox** — select the urgent leak email → **Run AI triage** → review the classification, extracted lot and proposed workflow → **Accept & create ticket**. Try the certificate-request and AGM emails too; each routes to a different workflow.
3. **Workflows** — open the new ticket; every step is an audit-trail entry. Click **Complete next step** to advance it.
4. **Compliance** — deadlines auto-generated per state rule pack (NSW/VIC/QLD), fed by the OC Order Portal and AGM Platform. Filter by state, mark items done.
5. **Committee** — the resident chatbot answers with **document citations** (try "Can I keep a dog?") and **escalates to a human** when it doesn't know (try the weather question). Meetings sync from the AGM Platform, certificate orders from the OC Order Portal.
6. **Settings** — switch the AI provider (Claude / Gemini / DeepSeek / OpenAI / custom endpoint), connect Gmail / Microsoft 365 / SMTP mailboxes, and connect Property IQ.

## PWA (app-like on phones)

Serve over HTTPS (or localhost) → browser menu → **Add to Home Screen**. It launches standalone with the StrataFlow icon and the app shell works offline. On iOS, use Share → Add to Home Screen in Safari.

## Notes

- AI triage and the chatbot run in **simulation mode** (deterministic rules) so the demo needs no API key. In production these route through the pluggable `LLMService` per the design plan (section 6.7).
- Data persists to a temp JSON file for the life of the running process/instance. Reset anytime: `curl -X POST localhost:4180/api/reset` (or restart the process).

## Structure

```
server/app.js      Express API (triage, tickets, compliance, chat, settings) — exported app
server/server.js   Local dev entry: serves web/ + mounts the API, listens on a port
server/data.js     Seed data + JSON-file store
api/index.js       Vercel serverless function entry point (wraps server/app.js)
web/app.jsx        React app source (built with esbuild → web/app.js)
web/styles.css     Design system (harbour navy / teal / amber, strata-bands identity)
web/manifest.json  PWA manifest · web/sw.js service worker · icons
```
