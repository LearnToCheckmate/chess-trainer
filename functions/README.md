# functions

Cloud Functions for the feedback relay and the board scan (`scanBoard`).

Runtime: Node.js 22 (`engines.node` in `package.json`). Node.js 20 was decommissioned by Google on 2026-10-30 and a
deploy on it stops with "Runtime Node.js 20 was decommissioned". Node.js 22 is deprecated on 2027-04-30 (decommissioned
2028-10-31), so before April 2027 move `engines.node` to 24 and check that gate 126 is still green.
