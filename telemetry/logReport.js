// logReport — telemetry relay for Chess Trainer.
// The app POSTs diagnostics / error reports here; this function appends them to a
// JSON file in a GitHub repo that Claude can read on its own. The GitHub token
// lives ONLY here as a Functions secret, never in the app (no client-side secret).
//
// Deploy: see telemetry/README.md. After deploy, paste the printed function URL to
// Claude so it can set LOG_ENDPOINT in the app and switch autonomous sending on.

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const GITHUB_TELEMETRY_TOKEN = defineSecret("GITHUB_TELEMETRY_TOKEN");

// EDIT this if your GitHub username is different. Must be a repo the token can write to.
const TELEMETRY_REPO = "LearnToCheckmate/chess-trainer-telemetry";
const LOG_PATH = "reports/log.json";
const MAX_ENTRIES = 200; // rolling window; oldest reports drop off

exports.logReport = onRequest(
  { secrets: [GITHUB_TELEMETRY_TOKEN], cors: true, region: "us-central1", maxInstances: 3 },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("POST only"); return; }
    const token = GITHUB_TELEMETRY_TOKEN.value();
    const api = `https://api.github.com/repos/${TELEMETRY_REPO}/contents/${LOG_PATH}`;
    const gh = (method, body) => fetch(api, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ct-telemetry",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    try {
      let arr = [], sha = null;
      const cur = await gh("GET");
      if (cur.status === 200) {
        const j = await cur.json();
        sha = j.sha;
        try { arr = JSON.parse(Buffer.from(j.content || "", "base64").toString("utf8")) || []; } catch (_) { arr = []; }
        if (!Array.isArray(arr)) arr = [];
      }
      let entry = (req.body && typeof req.body === "object") ? req.body : { raw: String(req.body || "") };
      entry.recvAt = Date.now();
      arr.push(entry);
      if (arr.length > MAX_ENTRIES) arr = arr.slice(arr.length - MAX_ENTRIES);
      const put = await gh("PUT", {
        message: `telemetry ${entry.kind || "report"} ${new Date().toISOString()}`,
        content: Buffer.from(JSON.stringify(arr, null, 1)).toString("base64"),
        sha: sha || undefined,
      });
      if (!put.ok) { const t = await put.text(); res.status(502).send("github " + put.status + " " + t.slice(0, 200)); return; }
      res.status(204).send("");
    } catch (e) {
      res.status(500).send("err " + String((e && e.message) || e).slice(0, 200));
    }
  }
);
