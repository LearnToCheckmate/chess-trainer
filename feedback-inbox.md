# Chess Trainer feedback inbox

Feedback from the app's feedback button is appended here by the Firebase feedback relay (functions/index.js). Claude reads this file at the start of every build run, folds new items into chess-trainer-backlog.md, then clears them here. Newest entries are at the bottom.

<!-- relay appends entries below this line -->

<!-- RETIRED at #550 item (122), 2026-11-11: the feedback relay (functions/index.js) now appends to FEEDBACK-INBOX.md, which every process reads. Nothing is appended here any more, and nothing here was ever relayed. Kept, not deleted, because gates/records-gate.sh holds this file NOSHRINK. -->

<!-- CORRECTION at #553 (jobs/feedback-relay-to-a-dead-file), measured 2026-11-24 [R18]: the RETIRED note above says the relay "now
appends to FEEDBACK-INBOX.md, which every process reads". That stopped being true at 451ae2d5 (#550 SEC-10): the relay now writes
FEEDBACK-INBOX.md in a SEPARATE private repository named at deploy time (INBOX_REPO) and refuses to write to this one, and no
process reads that repository. It is also not called at all: chess.jsx sets LOG_ENDPOINT to "", so postReport() returns at once and
the feedback sheet only copies the note to the clipboard and keeps the last 50 in that device's localStorage (ct_feedback_notes).
The tracker's feedback collection (prompts/common R37's home) holds 186 rows, none after 29 Sep 2026 and none from the relay.
Where in-app feedback should go is an open question on the job; nothing is appended here. -->
