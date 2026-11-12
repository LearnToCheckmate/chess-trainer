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
// #550 item (32), jobs/scan-orientation-double-check, from jobs/build-spec-board-scan-server's Part 1 as written, with two changes,
// both named here: (1) fenCheck is required from ./fen.js rather than copied (the spec's own R-BS-7); (2) prompt rule 3 no longer
// refuses an unknown orientation - since #549 item (67) the client reads every photo twice (as shot and turned 180 degrees) and asks
// the player when the readings disagree, which only works if each reading assumes White at the bottom when the photo does not say.
// NOT DEPLOYED and never deployed by a build run: the vision key is Kunal's (decisions scan-in-scope; Desk R2-SCAN-SECRET says
// which vendor's key he holds - this is the Gemini form the spec's forKunal deploys; if his key is Anthropic's, the one outbound
// call changes and nothing else). The deploy steps are the spec's forKunal.

// ── Board scan (Firebase Functions v2, CALLABLE — the client reaches this with
// httpsCallable, index.html:282, not with fetch). Takes a base64 JPEG of a chess
// board, asks Gemini for a FEN, VALIDATES the FEN before returning it, and fails
// with a message the client can put on screen.
//
// One secret is required:
//   GEMINI_API_KEY - a Google AI Studio key with the Generative Language API enabled
const {onCall, HttpsError} = require("firebase-functions/v2/https");

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/" +
  GEMINI_MODEL + ":generateContent";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;   // the client caps its JPEG at 1024px/q0.85; this is the ceiling
const GEMINI_TIMEOUT_MS = 25000;

// FEN validation lives in ./fen.js (R-BS-7: the validator lives in one place), which gate 27 requires in plain Node.
const {fenCheck} = require("./fen.js");

// The prompt. See the spec for why it is shaped this way; the short version is that
// every clause in it exists to make an honest refusal more likely than a confident
// wrong answer, because the player plays the position we hand back.
const SCAN_PROMPT = [
  "You are reading a single photograph of a chess position. Return the position as FEN.",
  "",
  "HOW TO READ THE BOARD",
  "1. Find the 8x8 grid. Ignore everything outside it: hands, table, clock, scoresheet, phone bezel, captured pieces beside the board.",
  "2. The photo may be taken from any angle. Correct for perspective before you name squares: the rank nearest the camera is not necessarily rank 1.",
  "3. Decide the ORIENTATION before you read any piece. Use, in this order of trust: (a) coordinate letters or numbers printed on the board edge; (b) a light square in the right-hand corner nearest each player; (c) the direction the pawns have advanced. State which one you used. If none of them tells you, do NOT refuse for that alone: assume White sits at the BOTTOM of the image and set orientation to unknown. The app reads every photo twice, once turned 180 degrees, and asks the player when the two readings disagree.",
  "4. If the board is photographed from Black's side, the image is rotated 180 degrees relative to FEN. Rotate it yourself. FEN is ALWAYS written from White's side, rank 8 first.",
  "5. Read square by square, rank 8 down to rank 1, file a to file h. Do not guess a piece you cannot see; an occluded square is a reason to refuse, not to invent.",
  "6. Pieces may be a non-standard set. Judge by silhouette and height, not by ornament. A piece you cannot identify is a reason to refuse.",
  "",
  "WHAT TO RETURN",
  "Return the placement field only, plus the side to move if and only if something in the photo actually tells you (a clock with one side running, an arrow, a caption). Do NOT invent castling rights, en passant or move numbers: they cannot be seen in a photograph and the caller derives them.",
  "",
  "WHEN TO REFUSE, AND YOU MUST",
  "Set confident to false, leave fen empty, and say why in reason if ANY of these is true: part of the board is out of frame; glare, blur or a shadow hides a square; a hand or an arm covers squares; you cannot identify a piece; you are reading a diagram of something other than a chess position.",
  "A refusal costs the player one more photograph. A confident wrong answer makes them play a position that was never on the board, and they will not notice until the game has gone wrong. REFUSING IS THE BETTER ERROR. If you are below about 90 percent sure of every single square, refuse.",
].join("\n");

const SCAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    confident: {type: "BOOLEAN"},
    fen: {type: "STRING"},
    orientation: {type: "STRING", enum: ["white-bottom", "black-bottom", "unknown"]},
    orientationEvidence: {type: "STRING"},
    reason: {type: "STRING"},
  },
  required: ["confident", "fen", "orientation", "reason"],
};

exports.scanBoard = onCall(
  {secrets: [GEMINI_API_KEY], region: "us-central1", maxInstances: 5, timeoutSeconds: 60, memory: "256MiB"},
  async (req) => {
    // The client's catch at chess.jsx:3593 tests e.message === "unauthenticated",
    // so the MESSAGE is load-bearing, not only the code. Do not reword it without
    // changing that line too.
    if (!req.auth || !req.auth.uid) {
      throw new HttpsError("unauthenticated", "unauthenticated");
    }

    const d = req.data || {};
    let b64 = typeof d.image === "string" ? d.image : "";
    if (b64.startsWith("data:")) b64 = b64.slice(b64.indexOf(",") + 1);   // tolerate a whole data URI
    b64 = b64.replace(/\s/g, "");
    if (!b64) {
      throw new HttpsError("invalid-argument", "No image was sent.");
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) {
      throw new HttpsError("invalid-argument", "That image could not be read.");
    }
    if (Buffer.byteLength(b64, "utf-8") * 3 / 4 > MAX_IMAGE_BYTES) {
      throw new HttpsError("invalid-argument", "That photo is too large. Try again — the app normally shrinks it for you.");
    }

    const body = {
      contents: [{
        role: "user",
        parts: [
          {text: SCAN_PROMPT},
          {inline_data: {mime_type: "image/jpeg", data: b64}},
        ],
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: SCAN_SCHEMA,
      },
    };

    let j;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), GEMINI_TIMEOUT_MS);
      let r;
      try {
        r = await fetch(GEMINI_URL, {
          method: "POST",
          headers: {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value()},
          body: JSON.stringify(body),
          signal: ctl.signal,
        });
      } finally { clearTimeout(t); }
      if (!r.ok) {
        const tx = await r.text();
        logger.error("gemini " + r.status + " " + tx.slice(0, 500));
        // Never leak the upstream body to the client: it can echo the key's project.
        throw new HttpsError("internal", "The board reader is not answering right now. Try again in a moment.");
      }
      j = await r.json();
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("gemini call failed", e);
      throw new HttpsError("internal", "The board reader is not answering right now. Try again in a moment.");
    }

    const txt = (((j.candidates || [])[0] || {}).content || {}).parts;
    const rawText = (txt && txt[0] && txt[0].text) || "";
    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch (e) { parsed = null; }
    if (!parsed || typeof parsed !== "object") {
      logger.error("gemini returned unparseable json: " + rawText.slice(0, 300));
      throw new HttpsError("internal", "The board reader gave an answer we could not use. Try another photo.");
    }

    if (parsed.confident !== true) {
      logger.info("scan refused: " + String(parsed.reason || "").slice(0, 200));
      // NOT an error: an honest refusal is a successful call with a null fen, so the
      // client can say something specific instead of falling into a generic catch.
      return {fen: null, ok: false, reason: String(parsed.reason || "").slice(0, 200) || "unclear"};
    }

    const v = fenCheck(parsed.fen);
    if (!v.ok) {
      logger.warn("scan produced an invalid fen (" + v.err + "): " + String(parsed.fen).slice(0, 120));
      return {fen: null, ok: false, reason: "invalid-position", detail: v.err};
    }

    logger.info("scan ok " + v.fen + (v.repaired.length ? "  [" + v.repaired.join(",") + "]" : ""));
    return {
      fen: v.fen,
      ok: true,
      orientation: String(parsed.orientation || "unknown"),
      repaired: v.repaired,
    };
  }
);
