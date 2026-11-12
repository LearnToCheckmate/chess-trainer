// logReport — telemetry relay for Chess Trainer.
// The app POSTs diagnostics / error reports here; this function appends them to a
// JSON file in a GitHub repo that Claude can read on its own. The GitHub token
// lives ONLY here as a Functions secret, never in the app (no client-side secret).
//
// #550 SEC-11 [docs/security-privacy-2026-11-12, Kunal "All 20, serious first"]: as first written this took ANY caller's whole JSON
// body, of any shape and size, with no authentication, and published it to a repository the README called public. Now: the caller
// must be a signed-in player (their Firebase ID token in the Authorization header, verified here), each player may send at most
// PER_DAY reports, only the named diagnostic fields are kept (each type-checked and size-capped - nothing else from the body is
// stored), no uid or user agent string is stored, CORS is limited to the app's origins, and the repository must be PRIVATE (README
// step 1). NOT part of functions/index.js, so `firebase deploy` does not deploy it; nothing calls it while LOG_ENDPOINT is empty.
//
// Deploy: see telemetry/README.md. After deploy, paste the printed function URL to
// Claude so it can set LOG_ENDPOINT in the app and switch autonomous sending on.

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const GITHUB_TELEMETRY_TOKEN = defineSecret("GITHUB_TELEMETRY_TOKEN");

// EDIT this if your GitHub username is different. Must be a PRIVATE repo the token can write to.
const TELEMETRY_REPO = "LearnToCheckmate/chess-trainer-telemetry";
const LOG_PATH = "reports/log.json";
const MAX_ENTRIES = 200; // rolling window; oldest reports drop off
const PER_DAY = 30;
const ORIGINS = ["https://learntocheckmate.github.io"];   // [PLACEHOLDER: add the custom domain here if the app gets one]

const str = (v, n) => (typeof v === "string" ? v.replace(/[\r\n\u2028\u2029]+/g, " ").slice(0, n) : undefined);
const num = (v) => (typeof v === "number" && isFinite(v) ? Math.round(v * 100) / 100 : undefined);
// the fields a report may carry; everything else in the body is dropped
function pick(b) {
  const o = { kind: str(b.kind, 20) || "report", build: str(b.build, 80), t: num(b.t), msg: str(b.msg, 300), src: str(b.src, 80),
    screen: str(b.screen, 80), ctx: str(b.ctx, 400) };
  for (const k of ["vw", "vh", "dpr", "sw", "sh"]) { const v = num(b[k]); if (v !== undefined) o[k] = v; }
  Object.keys(o).forEach((k) => { if (o[k] === undefined) delete o[k]; });
  return o;
}
async function underLimit(uid) {
  const day = new Date().toISOString().slice(0, 10), key = "telemetry_" + day;
  const ref = admin.firestore().collection("_limits").doc(uid);
  return admin.firestore().runTransaction(async (tx) => {
    const cur = await tx.get(ref); const n = (cur.exists && typeof cur.data()[key] === "number") ? cur.data()[key] : 0;
    if (n >= PER_DAY) return false; tx.set(ref, { [key]: n + 1 }, { merge: true }); return true;
  });
}

exports.logReport = onRequest(
  { secrets: [GITHUB_TELEMETRY_TOKEN], cors: ORIGINS, region: "us-central1", maxInstances: 3 },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("POST only"); return; }
    const m = String(req.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
    let uid = null;
    try { uid = m ? (await admin.auth().verifyIdToken(m[1])).uid : null; } catch (e) { uid = null; }
    if (!uid) { res.status(401).send("sign in first"); return; }
    if (Number(req.get("content-length") || 0) > 16000) { res.status(413).send("too large"); return; }
    if (!(await underLimit(uid))) { res.status(429).send("daily limit"); return; }
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
      const entry = pick((req.body && typeof req.body === "object") ? req.body : {});
      entry.recvAt = Date.now();
      arr.push(entry);
      if (arr.length > MAX_ENTRIES) arr = arr.slice(arr.length - MAX_ENTRIES);
      const put = await gh("PUT", {
        message: `telemetry ${entry.kind} ${new Date().toISOString()}`,
        content: Buffer.from(JSON.stringify(arr, null, 1)).toString("base64"),
        sha: sha || undefined,
      });
      if (!put.ok) { res.status(502).send("github " + put.status); return; }
      res.status(204).send("");
    } catch (e) {
      res.status(500).send("error");
    }
  }
);
