// Local dev entry point: serves the built web assets + the API on one port.
// On Vercel, the API is served by api/index.js and static assets are served
// directly from the build output, so this file isn't used in production.
const path = require("path");
const express = require("express");
const app = require("./app");

app.use(express.static(path.join(__dirname, "..", "web")));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, "..", "web", "index.html")));

const PORT = process.env.PORT || 4180;
app.listen(PORT, () => console.log(`StrataFlow demo running → http://localhost:${PORT}`));
