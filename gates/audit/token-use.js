#!/usr/bin/env node
// gates/audit/token-use.js - COUNT A BUILD RUN'S TOKENS FROM ITS OWN CLAUDE CODE SESSION TRANSCRIPTS.
// Job: the-fleet-has-no-token-or-cost-instrumentation-at-all-2026-10-06. Reads transcripts, prints JSON (and with
// `map` a markdown table too). It writes NOTHING: no tracker, no file. It hard-codes no path; every path is an argument.
//
// WHAT IS COUNTED. Each assistant line's message.usage: input_tokens, cache_creation_input_tokens (cacheWrite),
// cache_read_input_tokens (cacheRead), output_tokens. A streamed message repeats its usage on several lines under one
// message.id, so each id is counted ONCE (the line with the largest output_tokens wins; the call's time is the first
// timestamp seen for that id). A line with no message.id falls back to its uuid. Non-assistant lines and assistant lines
// without a usage object are ignored. weighted = input + 1.25 x cacheWrite + 0.1 x cacheRead + 5 x output. An Agent tool's
// reported total is never used: only the transcript lines are. Transcript layout (measured): the lead's session is
// <session>.jsonl, each seat is <session>/subagents/agent-<id>.jsonl with a sibling agent-<id>.meta.json (description,
// model); every assistant line carries message.model, a timestamp and (in seats) agentId.
//
// USAGE
//   node token-use.js count  <file|dir>... [--from ISO] [--to ISO]
//        one row per transcript x model: {transcript, model, calls, input, cacheWrite, cacheRead, output, weighted, from, to}
//        (a directory means every *.jsonl directly inside it). --from/--to keep calls whose time is in [from, to].
//        A transcript with no assistant messages gives one row with model null and every number 0.
//   node token-use.js window <file> --from ISO --to ISO
//        one {calls, input, cacheWrite, cacheRead, output, weighted} block over ALL models in that window (a workLog entry).
//   node token-use.js map    <mapping.json> [--base DIR]
//        prints {jobs:{<job>:[{part, slot, model, calls, input, cacheWrite, cacheRead, output, weighted, from, to}]},
//        summary:[{job, model, estimateMinutes, wallMinutes, weighted, weightedPerEstimateHour}], lead:{...}} then a markdown table.
//
// MAPPING FILE FORMAT (JSON):
//   { "lead": { "transcript": "<file>", "from": "ISO optional", "to": "ISO optional" },      // optional
//     "entries": [ { "transcript": "<file>",            // path; relative paths resolve against --base, else the mapping's folder
//                    "job": "<job id>", "part": "<part name>", "slot": "<seat slot>",
//                    "estimateMinutes": 150,            // optional; a job's estimate is the largest one given on its entries
//                    "from": "ISO optional", "to": "ISO optional" } ] }   // optional window on that transcript
// wallMinutes of a job = latest call time minus earliest call time over its entries. weightedPerEstimateHour =
// weighted / (estimateMinutes / 60), null when no estimate is given. The lead block reports weighted tokens per hour of
// the lead's own first-to-last call span (or its window).
'use strict';
const fs = require('fs'), path = require('path');

const W = { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 };
const weigh = (t) => t.input * W.input + t.cacheWrite * W.cacheWrite + t.cacheRead * W.cacheRead + t.output * W.output;
const zero = () => ({ calls: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, weighted: 0, from: null, to: null });

// Returns one record per distinct message id: {model, ts, input, cacheWrite, cacheRead, output}.
function readCalls(file) {
  const byId = new Map();
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    if (!o || o.type !== 'assistant' || !o.message || !o.message.usage || typeof o.message.usage !== 'object') continue;
    const u = o.message.usage;
    const id = o.message.id || ('uuid:' + o.uuid);
    const rec = { model: o.message.model || 'unknown', ts: o.timestamp || null,
      input: +u.input_tokens || 0, cacheWrite: +u.cache_creation_input_tokens || 0,
      cacheRead: +u.cache_read_input_tokens || 0, output: +u.output_tokens || 0 };
    const prev = byId.get(id);
    if (!prev) byId.set(id, rec);
    else { rec.ts = prev.ts || rec.ts; if (rec.output >= prev.output) byId.set(id, rec); }
  }
  return [...byId.values()];
}

function add(acc, c) {
  acc.calls++; acc.input += c.input; acc.cacheWrite += c.cacheWrite; acc.cacheRead += c.cacheRead; acc.output += c.output;
  if (c.ts) { if (!acc.from || c.ts < acc.from) acc.from = c.ts; if (!acc.to || c.ts > acc.to) acc.to = c.ts; }
  return acc;
}
const fin = (a) => { a.weighted = Math.round(weigh(a) * 100) / 100; return a; };
const inWin = (c, from, to) => !((from && (!c.ts || c.ts < from)) || (to && (!c.ts || c.ts > to)));

function count(file, from, to) {
  const rows = {};
  for (const c of readCalls(file)) {
    if (!inWin(c, from, to)) continue;
    add(rows[c.model] = rows[c.model] || zero(), c);
  }
  return Object.keys(rows).sort().map((m) => Object.assign({ transcript: path.basename(file), model: m }, fin(rows[m])));
}

function expand(args) {
  const out = [];
  for (const a of args) {
    if (fs.existsSync(a) && fs.statSync(a).isDirectory()) fs.readdirSync(a).filter((f) => f.endsWith('.jsonl')).sort().forEach((f) => out.push(path.join(a, f)));
    else out.push(a);
  }
  return out;
}

function windowBlock(file, from, to) {
  const t = zero();
  for (const c of readCalls(file)) if (inWin(c, from, to)) add(t, c);
  const { calls, input, cacheWrite, cacheRead, output, weighted } = fin(t);
  return { calls, input, cacheWrite, cacheRead, output, weighted };
}

function resolveT(t, base, mapDir) {
  if (path.isAbsolute(t)) return t;
  for (const d of [base, mapDir].filter(Boolean)) { const p = path.join(d, t); if (fs.existsSync(p)) return p; }
  return path.join(base || mapDir, t);
}

function mapRun(mapFile, base) {
  const m = JSON.parse(fs.readFileSync(mapFile, 'utf8')), mapDir = path.dirname(path.resolve(mapFile));
  const jobs = {}, est = {}, span = {}, tot = {};
  for (const e of m.entries || []) {
    const file = resolveT(e.transcript, base, mapDir);
    const rows = {};
    for (const c of readCalls(file)) { if (inWin(c, e.from, e.to)) add(rows[c.model] = rows[c.model] || zero(), c); }
    for (const model of Object.keys(rows).sort()) {
      const r = fin(rows[model]);
      (jobs[e.job] = jobs[e.job] || []).push({ part: e.part, slot: e.slot, model, calls: r.calls, input: r.input, cacheWrite: r.cacheWrite, cacheRead: r.cacheRead, output: r.output, weighted: r.weighted, from: r.from, to: r.to });
      const k = e.job + '\u0000' + model;
      const s = span[e.job] = span[e.job] || { from: null, to: null };
      if (r.from && (!s.from || r.from < s.from)) s.from = r.from;
      if (r.to && (!s.to || r.to > s.to)) s.to = r.to;
      tot[k] = (tot[k] || 0) + r.weighted;
    }
    if (e.estimateMinutes != null) est[e.job] = Math.max(est[e.job] || 0, +e.estimateMinutes);
  }
  const summary = [];
  for (const k of Object.keys(tot).sort()) {
    const [job, model] = k.split('\u0000'), s = span[job];
    const wall = s.from && s.to ? Math.round((Date.parse(s.to) - Date.parse(s.from)) / 600) / 100 : null;
    const e = est[job] != null ? est[job] : null, w = Math.round(tot[k] * 100) / 100;
    summary.push({ job, model, estimateMinutes: e, wallMinutes: wall, weighted: w, weightedPerEstimateHour: e ? Math.round(w / (e / 60)) : null });
  }
  let lead = null;
  if (m.lead && m.lead.transcript) {
    const f = resolveT(m.lead.transcript, base, mapDir), t = zero();
    for (const c of readCalls(f)) if (inWin(c, m.lead.from, m.lead.to)) add(t, c);
    fin(t);
    const hrs = t.from && t.to ? (Date.parse(t.to) - Date.parse(t.from)) / 3600000 : 0;
    lead = { calls: t.calls, input: t.input, cacheWrite: t.cacheWrite, cacheRead: t.cacheRead, output: t.output, weighted: t.weighted, from: t.from, to: t.to, hours: Math.round(hrs * 100) / 100, weightedPerHour: hrs > 0 ? Math.round(t.weighted / hrs) : null };
  }
  return { jobs, summary, lead };
}

function markdown(r) {
  const L = ['| job | model | estimate min | wall min | weighted tokens | weighted per estimate hour |', '|---|---|---|---|---|---|'];
  for (const s of r.summary) L.push(`| ${s.job} | ${s.model} | ${s.estimateMinutes == null ? '-' : s.estimateMinutes} | ${s.wallMinutes == null ? '-' : s.wallMinutes} | ${s.weighted} | ${s.weightedPerEstimateHour == null ? '-' : s.weightedPerEstimateHour} |`);
  if (r.lead) L.push('', `Lead: ${r.lead.calls} calls, weighted ${r.lead.weighted} over ${r.lead.hours} h = ${r.lead.weightedPerHour == null ? '-' : r.lead.weightedPerHour} per hour.`);
  return L.join('\n');
}

function main(argv) {
  const mode = argv[0], rest = [], opt = {};
  for (let i = 1; i < argv.length; i++) { if (argv[i].startsWith('--')) opt[argv[i].slice(2)] = argv[++i]; else rest.push(argv[i]); }
  if (mode === 'count' && rest.length) {
    console.log(JSON.stringify(expand(rest).flatMap((f) => { const r = count(f, opt.from, opt.to); return r.length ? r : [Object.assign({ transcript: path.basename(f), model: null }, fin(zero()))]; }), null, 2));
  } else if (mode === 'window' && rest.length === 1 && opt.from && opt.to) {
    console.log(JSON.stringify(windowBlock(rest[0], opt.from, opt.to), null, 2));
  } else if (mode === 'map' && rest.length === 1) {
    const r = mapRun(rest[0], opt.base);
    console.log(JSON.stringify(r, null, 2)); console.log('\n' + markdown(r));
  } else { console.error('usage: token-use.js count <file|dir>... [--from ISO --to ISO] | window <file> --from ISO --to ISO | map <mapping.json> [--base DIR]'); process.exit(2); }
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { readCalls, count, windowBlock, mapRun, weigh };
