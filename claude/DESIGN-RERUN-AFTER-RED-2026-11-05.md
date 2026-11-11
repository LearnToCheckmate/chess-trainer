<!-- Copied into the repository at #550 item (102) from tracker docs/design-rerun-after-red-2026-11-05 (v1), so a build session
     can read it (#549's receipt: it lived only in the claude.ai project). Kunal answered "build" on questions/B9-RERUN-AFTER-RED,
     Thu 5 Nov 2026, 9:33am ET. What was built from it, and what was not, is the section at the end. -->

# After a red suite, rerun only what can have changed (design, Thu 5 Nov 2026)

For jobs/after-a-red-suite-rerun-only-the-checks-that-read-what-the-dropped-fixes-changed-instead-of-the-whole-suite-2026-10-28. Written by the orchestrator during batch 8 on Kunal's word to front load what is needed from my end. Times are Eastern.

## The cost today

A build run's full suite takes about 190 minutes. When the final suite is red, the run fixes or drops the culprit and runs the whole suite again, so each red costs about 215 minutes (the reserve's red cycle). Batch 7 ran four full suites, three of them red, about 13 hours of suite time in a 21.6 hour run. Batch 8's brief reserves three red cycles, 645 minutes, out of a 2850 minute window.

## The idea

The project already accepts one rule here: every browser gate reads only the built bundle, so a commit that leaves app.js byte identical cannot change a browser gate's verdict except through that gate's own files (Kunal's tiered gate, 6 Oct 2026, the fast pass). Apply the same rule after a red:

1. If the fix for a red changes the bundle (any app code), rerun the whole suite, as today.
2. If the bundle's md5 is unchanged since the red suite, rerun only (a) every gate that was red, (b) every gate whose own files the fix changed (its gate file, the drive and lib files it loads, its fixtures), read from the suite's manifest, and (c) the unit layer and the non browser checks, which are seconds. Every other gate keeps its green from the red suite, because nothing it reads has changed.
3. The push still needs one log that says GATES GREEN for the pushed tree: the rerun writes a combined log that carries the red suite's greens with that suite's bundle md5 and the rerun's results, and gates/verify-log.sh accepts it only when the md5 matches and the manifest's list of gates is complete.

## What it saves, measured

- Batch 7: its second and fourth suites (claude/agents/gatelogs/547b-all.log and 547d-all.log on main) gated the same bundle, md5 c7f6a1228e43. The suites after the second were run for records that postdated its green and for a footer red after a container restart, none of them app code, so under this rule they would have been partial reruns, saving about 5 to 6 hours of a 21.6 hour run.
- Batch 8's round 1 red included an app fix (gate 67's capture anchor), so under this rule it still needs a full rerun. No saving there.
- So the saving is real only when a red is about the gates themselves, which has been the common case in process heavy batches and less common in product batches.

## Risks, and the answers

- A gate's verdict could depend on something outside its listed files (a shared helper, a font, the container). Answer: the manifest lists every file a gate loads; a change to a shared helper puts every gate that loads it in (b). The font regime is a known gap (jobs/the-harness-has-two-font-regimes...), so a change of toolchain between suites forces a full rerun.
- A combined log is easier to forge or misread than one suite. Answer: verify-log.sh checks the md5, the manifest and both runs' ids, with a control for each refusal, before any run may use it.

## How it would be built

One reviewed build job in batch 9 or 10: the manifest reader, the combined log, the verify-log.sh arm and its controls, read by the blind pair and landed on a full suite of its own. The rule then goes into prompts/build-run in a reviewed prompt batch.

## My recommendation

Build it, limited to reruns where the bundle md5 is unchanged. It cannot help a red caused by app code, and it never lets a push rest on a gate that did not run against the pushed bundle.


## What #550 built from this (item (102)), and what it did not

- `gates/rerun-after-red.js plan <red-log>` - rule 1 (bundle md5 moved: FULL) and rule 2's set: the red gates, every gate whose
  READ SET changed since the red suite's `ref: HEAD` (its file, local `require()`s transitively, and every tracked file its code
  names as a path literal), and every gate the red suite did not run. FULL also when the harness changed (`gates/gates.sh`,
  `gates/package.json`, `gates/package-lock.json`), when the red log has no `gates ran` footer, or when a gate it ran is gone.
- `combine <red-log> <subset-log> [out]` - re-derives the plan, requires the subset rerun (`gates/gates.sh '#N' '<set>'`) to be
  SUBSET OK over the same build, the same bundle md5 and the same toolchain line, with a green section for every gate in the set,
  reruns the three fast layers itself (unit-drill-why, unit-held-guard, fastgate-drive - "the fast layers", defined here because
  the design left them undefined), and writes one log of kept and rerun sections.
- `selftest` - 24 controls over constructed logs in a scratch repository.
- **NOT BUILT: the gates/verify-log.sh arm.** The combined log ends `RERUN-AFTER-RED COMBINED GREEN #N - NOT A PUSH AUTHORITY`
  and never carries `GATES GREEN`, so every push consumer refuses it today. Accepting it is a change to the push-gate tool and is
  left to its own reviewed run, as the design's last section asks. Then the prompts/build-run rule (the orchestrator's).
