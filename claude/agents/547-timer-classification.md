# #547 item (115): every auto-dismiss timer, classified before anything was changed

Job: `jobs/explanation-boxes-must-not-time-out-2026-09-24`, work item 1. The rule comes from the job's `theRuleToBuildTo`:
- a box that ACKNOWLEDGES what the player just did may time out;
- a box that EXPLAINS something stays until it is dismissed, or until the next real action clears it.

## How the timers were found

Enumerated on HEAD with this grep over chess.jsx:

```
grep -noE "setTimeout\(\(\)=>set[A-Z][A-Za-z]*\((null|''|false|\[\]|0)\),[0-9a-zA-Z.,()]+\)" chess.jsx
```

A second pass looked for timers of any other shape whose setter ends in Msg, Info, Err, Toast, Note, Cap, Celebr or Banner.

`toast()`, the app's generic toast helper with a 3200ms life, has **no call site**, so it is dead code and nothing below depends on it.

| timer | ms | what it shows | class | after #547 |
|---|---|---|---|---|
| `pzCelebrate` | 5000 | the RANK UP card: "You've climbed to a new rank. Keep solving to reach the next one!" | **explanation** | timer removed; Continue and a backdrop tap already close it (TC-R82) |
| `onlineInfo`, explanatory lines | 4500 | "That position needs a fix and is unavailable right now." / "Move not saved (...). Check your connection" / "Game created. Send ... your invite code to start." / "Could not copy the link — share the code instead." | **explanation** | no timer; a close control (`online-info-close`); the next move on the board clears it (TC-R82 U3) |
| `onlineInfo`, acknowledgement and status lines | 4500 | "Code copied!" / "Invite link copied — ..." / "Creating game…" / "Joining…" / "Opening your game…" / "Syncing… ..." | acknowledgement or passing status | unchanged, matched by `ONLINE_ACK_RE` (TC-R82 U2) |
| `celebrate`, kind `bank` | 2800 | "Line learned · flawless", the lesson and its line count | acknowledgement: its words stay on screen in the lesson note ("Flawless · this line is Learned ✓. Lines learned: ...") | unchanged |
| `diagMsg` | 5000 | "Sent to Claude (and copied)" | acknowledgement | unchanged |
| `copyMsg` | 1800 | copied | acknowledgement | unchanged |
| `pgnCopied` (x3) | 1800 | PGN copied | acknowledgement | unchanged |
| `shareMsg` | 2600 | shared or copied | acknowledgement | unchanged |
| `pzPinErr` | 2000 | "Wrong code." on the developer PIN | acknowledgement of a failed attempt | unchanged |
| `resignArm`, `drawArm`, `resetArm` | 4000 | the "tap again to ..." arming window | not a box; a confirmation window | unchanged |
| `anim`, `pzBurst`, `revAuto`, `introCard` (60) | - | animation and sequencing | not a box | unchanged |
| `recCap` | max(5000, h) | the preview gallery's own recording caption | the harness's own UI, which steps its recording on purpose | unchanged |

## Work item 3, the gallery hook

No explanation box keeps a product timer, so nothing is now timed for the harness's benefit. The new close control carries `data-ct="online-info-close"`, which gives a harness a deliberate way to dismiss the box.
