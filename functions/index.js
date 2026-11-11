// Chess Trainer feedback relay (Firebase Functions v2).
// Receives feedback (and JS error) reports POSTed by the app's postReport()
// and appends them to FEEDBACK-INBOX.md in the GitHub repo, so Claude can read
// them at the start of every build run with no manual pasting.
//
// #550 item (122) [jobs/feedback-relay-to-a-dead-file]: this wrote to the LOWERCASE feedback-inbox.md, a 350-byte file
// unchanged since 2026-06-20 that no process reads - every build run, CLAUDE.md's table and the orchestrator read
// FEEDBACK-INBOX.md - so every message a player sent from inside the app was lost (186 rows in the tracker's feedback
// collection, ZERO from the relay). It now appends to FEEDBACK-INBOX.md, which is append-only by this project's rule, so an
// append is the only write it may make; entries land under its "FROM THE APP" heading, newest at the bottom, each with its
// timestamp and status open. The lowercase file is retired (a note appended to it, nothing deleted: records-gate.sh holds
// it NOSHRINK). THE TRACKER'S feedback COLLECTION IS STILL THE HOME (prompts/common R37); a Cloud Function cannot write to
// it, so moving a relayed entry from this file into that collection is the orchestrator's sweep. NOT DEPLOYED: deploying
// needs Kunal's Firebase credentials (firebase deploy --only functions), recorded as the job's whatIsLeft.
//
// Two secrets are required (set them before deploy, see deploy steps):
//   GH_PAT        - a fine-grained GitHub PAT, Contents: Read and write, this repo only
//   RELAY_SECRET  - any random string; the app must send the same value as `key`
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

const GH_PAT = defineSecret("GH_PAT");
const RELAY_SECRET = defineSecret("RELAY_SECRET");

const REPO = "LearnToCheckmate/chess-trainer";
const FILE = "FEEDBACK-INBOX.md";   // #550 item (122): was "feedback-inbox.md", which nothing reads
const BRANCH = "main";

exports.feedbackRelay = onRequest(
  {secrets: [GH_PAT, RELAY_SECRET], cors: true, region: "us-central1", maxInstances: 3},
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).json({ok: false, err: "POST only"}); return; }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || typeof body !== "object") body = {};

    const expected = RELAY_SECRET.value();
    const key = body.key || req.get("x-relay-key") || "";
    if (expected && key !== expected) { res.status(403).json({ok: false, err: "bad key"}); return; }

    const kind = String(body.kind || "feedback");
    if (kind !== "feedback" && kind !== "error") { res.status(200).json({ok: true, skipped: kind}); return; }

    const ts = new Date().toISOString();
    const build = String(body.build || "").slice(0, 80);
    const ctx = String(body.ctx || body.screen || "").slice(0, 1000);
    let entry;
    if (kind === "feedback") {
      const note = String(body.note || "").slice(0, 2000);
      entry = "\n### " + ts + "  |  " + build + "  |  status: open\n- ctx: " + ctx + "\n- note: " + note + "\n";
    } else {
      const msg = String(body.msg || "").slice(0, 400);
      entry = "\n### " + ts + "  |  ERROR  |  " + build + "  |  status: open\n- " + msg + "\n- ctx: " + ctx + "\n";
    }

    try {
      const pat = GH_PAT.value();
      const api = "https://api.github.com/repos/" + REPO + "/contents/" + FILE;
      const H = {
        "Authorization": "Bearer " + pat,
        "User-Agent": "ct-feedback-relay",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      let sha = null, content = "";
      const g = await fetch(api + "?ref=" + BRANCH, {headers: H});
      if (g.status === 200) {
        const j = await g.json();
        sha = j.sha;
        content = Buffer.from(j.content, "base64").toString("utf-8");
      } else if (g.status !== 404) {
        const tx = await g.text();
        logger.error("github GET failed " + g.status + " " + tx);
        res.status(502).json({ok: false, err: "github get " + g.status});
        return;
      }
      const updated = Buffer.from(content + entry, "utf-8").toString("base64");
      const putBody = {message: "feedback " + ts, content: updated, branch: BRANCH};
      if (sha) putBody.sha = sha;
      const put = await fetch(api, {
        method: "PUT",
        headers: Object.assign({}, H, {"Content-Type": "application/json"}),
        body: JSON.stringify(putBody),
      });
      if (!put.ok) {
        const tx = await put.text();
        logger.error("github PUT failed " + put.status + " " + tx);
        res.status(502).json({ok: false, err: "github put " + put.status});
        return;
      }
      res.status(200).json({ok: true});
    } catch (e) {
      logger.error("relay error", e);
      res.status(500).json({ok: false, err: String((e && e.message) || e)});
    }
  }
);
