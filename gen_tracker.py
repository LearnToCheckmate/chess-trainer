#!/usr/bin/env python3
# Regenerate chess-tracker.html from the template + the task list below.
# After each build run: edit TASKS/GROUPS, set STAMP, run:  python3 gen_tracker.py
import json, datetime

STAMP = "Updated through build #137 - 2026-06-10"

GROUPS = [
    {"key": "online", "nm": "Online & multiplayer", "color": "#7bd1ff", "isNew": True},
    {"key": "money",  "nm": "Pro & payments",        "color": "#e0b85a"},
    {"key": "ts",     "nm": "Tactics & Strategy",    "color": "#10b981"},
    {"key": "play",   "nm": "Play",                  "color": "#5b8def"},
    {"key": "disc",   "nm": "Discover",              "color": "#7bbf5a"},
    {"key": "review", "nm": "Review",                "color": "#7ab8f0"},
    {"key": "puz",    "nm": "Puzzles",               "color": "#f0a24e"},
    {"key": "theme",  "nm": "Themes",                "color": "#c98ae0"},
    {"key": "infra",  "nm": "Infrastructure / Ops",  "color": "#9aa6b2"},
    {"key": "comm",   "nm": "Community / Social",    "color": "#a855f7"},
    {"key": "polish", "nm": "Polish",                "color": "#cfcfd6"},
    {"key": "coach",  "nm": "Coach & Progress",      "color": "#14b8a6"},
    {"key": "found",  "nm": "Foundation",            "color": "#6fb6c9"},
]

# s: open | part | done ; you: needs Kunal ; b: build tag
TASKS = [
    # Online & multiplayer
    {"g": "online", "id": "on-decline",  "s": "done", "b": "#111", "t": "Show a \u201cDraw declined\u201d message", "n": "Now shows in the side panel and as a board toast to the offerer. Re-test on #111."},
    {"g": "online", "id": "on-btnsize",  "s": "part", "t": "Stop action buttons resizing / shifting the panel", "n": "The control area already has a fixed minimum height. Tell me (screenshot) if it still shifts and I will lock it fully."},
    {"g": "online", "id": "on-prompt",   "s": "done", "t": "Incoming draw prompt at the top as a board overlay", "n": "Already implemented (built after build 81). Re-test on #111."},
    {"g": "online", "id": "on-endscreen","s": "done", "t": "Board-level end screen for draw / resign", "n": "Already implemented: centered result overlay (Draw agreed / You won / You lost) with rematch. Re-test on #111."},
    {"g": "online", "id": "on-rematch",  "s": "done", "t": "Rematch as an offer / accept / decline flow", "n": "Already implemented: offer -> opponent accepts or declines, with notices. Re-test on #111."},
    {"g": "online", "id": "on-invite",   "s": "done", "b": "#112", "t": "Online play by invite code + live clock", "n": "Invite play works; a synced minute-clock now counts down for both players and flags on time (#112). Re-test on two devices."},
    {"g": "online", "id": "on-friends",  "s": "done", "b": "#125", "you": True, "t": "Friends: add by ID, mutual accept, list, challenge", "n": "Built (#125): the Play-with-friends tile opens a Friends screen \u2014 your shareable ID with Copy, add a friend by ID, accept/decline requests, a friends list with Challenge and Remove, plus an \u201cAdd as friend\u201d button on a past online opponent. NEEDS YOU: publish the friendReqs + friends Firestore rules (provided), then test on two devices."}, {"g": "online", "id": "on-premove", "s": "done", "b": "#131", "you": True, "t": "PreMove: queue a move on the opponent's turn", "n": "Built (#131): while you wait, tap or drag a move; the squares tint orange. It plays the instant your turn arrives if legal, otherwise it silently clears. Tap anywhere to cancel; promotions auto-queen. Works online and vs the bots. NEEDS YOU: feel-test it in a fast online game."}, {"g": "online", "id": "on-nav", "s": "done", "b": "#136", "you": True, "t": "Back/forward move review during live games", "n": "Built (#136): the move viewer under the board works in online games too, fed from the synced move list. View-only; it snaps back to LIVE the moment any new move arrives, and tapping the board returns to live. Takeback stays disabled online. NEEDS YOU: scroll back during a live online game and confirm the snap-back."}, {"g": "discover", "id": "dc-gamify", "s": "done", "b": "#132", "you": True, "t": "Gamified lessons: Learned and Mastered", "n": "Built (#132, tightened #133): flawless across the board. One flawless run (hints off, zero wrong tries) earns Learned and banks day 1; 10 flawless days (gaps fine) earns \u2605 Mastered. Wrong-try bounces leak the answer by elimination, so retried runs no longer count for Learned. #134: the Tap-moves multiple-choice buttons count as hints (they only show with hints on), and a 10-dot flawless-day counter now sits under the lesson title. Badges in the Discover lists and on the lesson page, progress synced to your account. Variations count toward their base lesson; off-book early mates do not count. NEEDS YOU: run one lesson with hints off and confirm the day banks."}, {"g": "discover", "id": "dc-coachplan", "s": "done", "b": "#135", "you": True, "t": "Coach mastery plan (Pro)", "n": "Built (#135, redesigned #137): the plan now starts COLLAPSED as a one-line report card (targets, banked today, learned, mastered) and expands on tap. The catalog is split into tiers of 10 starting with a curated friendly Tier 1; learning 5 in a tier unlocks the next, so no wall of red. With zero targets, a quick chooser asks your side, what you face, and the payoff you like (mate traps, win material, solid), then suggests 3 starters. NEEDS YOU: open Coach, answer the chooser, confirm the 3 suggestions feel right."},
    {"g": "online", "id": "on-tourney",  "s": "open", "you": True, "t": "Tournaments (round-robin, knockout, Swiss)", "n": "Decided: all three formats, open to anyone, scheduled start, Claude picks the clock. Stage 1 (create, lobby, detail, countdown) is the next build; stage 2 is the pairing engine and wants two-device testing."},
    {"g": "online", "id": "on-match",    "s": "done", "b": "#113", "you": True, "t": "Online matchmaking: quick match", "n": "Built (#113): a Quick match button pairs you with anyone else searching at the same time control. NEEDS YOU: publish the mm Firestore rule, then test on two devices."},
    {"g": "online", "id": "on-corr",     "s": "done", "you": True, "t": "Daily / correspondence (multi-day) games", "n": "Confirmed built: when you pick Online, the setup shows a \u201cTime per move\u201d picker (No limit / 1 / 3 / 7 days), and create-game carries it. Two-device test still needed."},

    # Pro & payments
    {"g": "money", "id": "mo-extinstall", "s": "done", "you": True, "t": "Stripe extension installed + verified (manual-tasks chat)", "n": "Done + verified: extension installed (us-central1), webhook live (product synced end to end). TEST/sandbox. Final step: tap Upgrade and pay with 4242 4242 4242 4242 to confirm Coach unlocks."},
    {"g": "money", "id": "mo-skins",      "s": "open", "you": True, "t": "Decide: free the Playful / Medieval skins too?", "n": "Still Pro right now."},
    {"g": "money", "id": "mo-wire",       "s": "done", "b": "#124", "t": "App wired + verified vs the live backend", "n": "Verified (#124) the app + host page match your backend exactly: checkout writes customers/{uid}/checkout_sessions and redirects to the url the extension returns (no publishable key needed); Coach unlocks on a customers/{uid}/subscriptions doc with status active/trialing; Manage subscription uses createPortalLink. Error copy cleaned up. Ready to test with card 4242."},
    {"g": "money", "id": "mo-stripeacct", "s": "done", "t": "Stripe account + product + monthly/yearly prices (TEST)"},
    {"g": "money", "id": "mo-blaze",      "s": "done", "t": "Firebase upgraded to Blaze"},
    {"g": "money", "id": "mo-split",      "s": "done", "b": "#107/#108", "t": "Free vs Pro decided + Coach locked + Puzzles freed + pricing"},

    # Tactics & Strategy
    {"g": "ts", "id": "ts-mot", "s": "done", "b": "#115", "t": "More tactical motifs", "n": "Now 10 motifs: added Double attack, Pawn fork, Double check, Hanging piece (all verified with an engine). Can keep adding (X-ray, deflection, decoy, overload) anytime."},
    {"g": "ts", "id": "ts-size", "s": "done", "b": "#121", "t": "Bigger Tactics text + board", "n": "Done (#121): Tactics/Strategy board enlarged (360->400) and the motif title + idea text bumped up."},
    {"g": "ts", "id": "ts-pos", "s": "done", "b": "#115", "t": "More strategy concepts", "n": "Now 12 concepts: added rooks on the 7th, passed pawns, trade when ahead, keep the queen home, doubled pawns, knight on the rim. More can follow anytime."},
    {"g": "ts", "id": "ts-cat", "s": "done", "b": "#104/#109", "t": "Tactics & Strategy category + nav + bigger boards + payoff animation"},

    # Play
    {"g": "play", "id": "pl-feel",   "s": "open", "you": True, "t": "Engine strength feel-test", "n": "Play a few games per level and tell me what feels off."},
    {"g": "play", "id": "pl-board",  "s": "open", "you": True, "t": "Bigger Play board (match Chess.com scale)", "n": "Partly addressed (#121): turning the eval bar off widens the board. Matching Chess.com's exact scale and pushing buttons below the fold still need a screenshot from you to tune."},
    {"g": "play", "id": "pl-evalbar","s": "done", "b": "#121", "t": "Option to hide the eval bar", "n": "Done (#121): \u201cEvaluation bar\u201d ON/OFF toggle added in the \u2630 menu; OFF hides the bar and widens the board."},
    {"g": "play", "id": "pl-btnalign","s": "done", "b": "#136", "you": True, "t": "Tidy bottom button sizing + font alignment (Play)", "n": "Built (#136): the five Play buttons are a balanced 3+2 grid (Takeback, Hint, Resign; New Game, Flip) with equal 44px heights and one font size, no wrap drift. NEEDS YOU: a screenshot so we can fine-tune."},
    {"g": "play", "id": "pl-bots2",  "s": "done", "b": "#116/#118", "you": True, "t": "Stronger bots + personalities (Astrid, Viktor)", "n": "Stronger (#116): Astrid 1900, Viktor 2350, ceiling 2400, longer think time. Personalities (#118): among Stockfish moves within 25cp of its own pick, Astrid leans aggressive and Viktor leans solid, so strength is unchanged. Play each a few games and tell me if the styles come through."},
    {"g": "play", "id": "pl-castle", "s": "done", "b": "#115", "t": "Drag-to-castle", "n": "Both gestures now castle: drag the king two squares OR drag the king onto its own rook. Tapping works the same way. Tell me if you want only one of the two."},
    {"g": "play", "id": "pl-done",   "s": "done", "b": "#105/#106", "t": "Play core: bots + styles, pass & play, time controls, tiles reordered, captured strip, move nav"},

    # Discover
    {"g": "disc", "id": "dc-add",        "s": "done", "b": "#120", "t": "Added 12 curated openings", "n": "Done (#120): you had no list, so I curated 12 missing ones (engine-verified): French Tarrasch, Queen\u2019s Indian, Bogo-Indian, Colle, Stonewall, Torre, Benoni, Tarrasch Defense, Sicilian Alapin, Closed Sicilian, Ponziani, Center Game. (Najdorf, Ruy main, Caro Classical, French Classical were already the main lines.)"},
    {"g": "disc", "id": "dc-gambitsbtn", "s": "done", "b": "#115", "t": "Gambits lesson buttons higher / more compact", "n": "Moved the move-stepper (Play, step, replay) to a compact row just above the board so it is always visible without scrolling; the old below-board copy is gone."},
    {"g": "disc", "id": "dc-vid",        "s": "part", "you": True, "t": "In-lesson video (embedded) + links", "n": "Embedded player built; 22 lessons now have a curated in-app video (batches #126/#128/#130): the main openings plus popular gambits (Evans, Smith-Morra, Danish, Stafford, Budapest) and Scotch, Vienna, English, Scandinavian, Pirc, Dutch, Catalan, Grunfeld. Mostly Remote Chess Academy, plus Eric Rosen (Stafford) and Andras Toth (Danish). Best-guess IDs; swap any you dislike."},
    {"g": "disc", "id": "dc-ipad",       "s": "done", "b": "#123", "t": "iPad landscape Home \u2014 bigger tiles", "n": "Reverted Option C (#123): back to the prior layout you preferred (Colors/Style chips on their own row below the coach), and made the four tiles and their text much bigger in landscape to fill the empty space. Reload the iPad tab (it was stuck on #104). Tell me if you want them bigger still."},
    {"g": "disc", "id": "dc-done",       "s": "done", "t": "Discover core: openings, gambits, endgames, notation, feedback widget"},

    # Review
    {"g": "review", "id": "rv-eng",  "s": "part", "b": "#117", "you": True, "t": "Stronger Review engine (multi-line Great/Miss live; calibrating)", "n": "Done (#117): Stockfish now analyzes two lines, so Review tags Great (the only good move) and Miss (you let a clear win slip), shown in the summary and on the move list and graph. Falls back safely if the engine build ignores multi-line. NEEDS YOU: import one of your games and screenshot the move list + summary so I can tune the thresholds."},
    {"g": "review", "id": "rv-done", "s": "done", "b": "#39-#103", "t": "Review core: import, eval graph, full analysis, Book, single-card summary"},

    # Puzzles
    {"g": "puz", "id": "pz-road", "s": "done", "b": "#109", "t": "Curvy winding roadmap + bigger, spaced nodes"},
    {"g": "puz", "id": "pz-done", "s": "done", "b": "#108", "t": "Puzzles (now free): database, roadmap, tiers, mistakes drill"},

    # Themes
    {"g": "theme", "id": "th-2", "s": "open", "you": True, "t": "Themes phase 2: medieval pieces, icons, backgrounds, gallery", "n": "Decide scope."},
    {"g": "theme", "id": "th-1", "s": "done", "t": "12 board themes grouped + browser"},

    # Infra / Ops
    {"g": "infra", "id": "in-prewarm", "s": "done", "b": "#119", "t": "Pre-warm Firestore to kill the first-move lag", "n": "Done (#119): the app now opens the Firestore connection on load with a throwaway read, so the first cloud action / online move should no longer pause 5-10s. Verify on device."},
    {"g": "infra", "id": "in-dom",   "s": "open", "you": True, "t": "Register a domain", "n": "gambitcoach.com (available, ~$10) or blunderly.com."},
    {"g": "infra", "id": "in-cap",   "s": "open", "you": True, "t": "Native app wrapper (Capacitor)", "n": "iOS needs a Mac + Apple dev account. Also fixes the installed-app sign-in loop."},
    {"g": "infra", "id": "in-photo", "s": "part", "you": True, "t": "Photo-to-board (snap a real board \u2192 play/analyze)", "n": "App side built (#127): New Game screen \u201cScan a board from a photo\u201d \u2014 downsizes the photo, returns a FEN, opens it as \u201cPlay this position.\u201d NEEDS YOU: deploy one Cloud Function (scanBoard) + set your Anthropic API key secret. Full function file + steps provided."},
    {"g": "infra", "id": "in-palm",  "s": "open", "t": "Palm / bottom-edge touch rejection", "n": "Tune on device."},

    # Community / Social
    {"g": "comm", "id": "cm-near", "s": "done", "b": "#129", "you": True, "t": "Play nearby (approx location / ZIP)", "n": "Built (#129): a Play-nearby tile on the New Game screen opens an opt-in screen. You choose to be visible; only a coarse area is shared (GPS rounded to ~11km, or your ZIP), never exact coordinates. It lists other opted-in players in your area with a Challenge button, and a Stop button to opt out. NEEDS YOU: publish the nearby Firestore rule (provided), then test on two accounts. Untestable in my sandbox (no location, no other users). Direct nearby invites + distance are a later pass."},
    {"g": "comm", "id": "cm-soc",  "s": "open", "you": True, "t": "Social / dating angle", "n": "Safety, consent, moderation; pick a direction."},

    # Polish
    {"g": "polish", "id": "po-labels", "s": "done", "b": "#119", "t": "Remove redundant \u201cYou are Black\u201d / \u201cWhite to move\u201d labels", "n": "Done (#119): dropped the \u201cYou are White/Black\u201d line in the online panel (the player bars show it). The plain \u201cto move\u201d banner was already hidden except on check/checkmate."},
    {"g": "polish", "id": "po-avatar", "s": "done", "b": "#121", "t": "Revert the Home avatar to top-right", "n": "Done (#121): the Home avatar is back in the top-right corner."},
    {"g": "polish", "id": "po-bars", "s": "done", "b": "#114", "t": "Chess.com-style player bars (top + bottom)", "n": "Opponent above the board, you below: avatar, name, captured pieces + material, and the clock. Applies to online, vs computer, and pass-and-play. Big board kept. Re-test on device and tell me what to refine."},
    {"g": "polish", "id": "po-home", "s": "done", "b": "#119", "t": "Home screen: even up the icon sizes", "n": "Done (#119): the Play tile was larger than the other three; all four Home tiles now use the same icon size and spacing."},
    {"g": "polish", "id": "po-anim", "s": "part", "you": True, "t": "Confirm the slowed queen animation reads well", "n": "Quick look on device."},
    {"g": "polish", "id": "po-done", "s": "done", "b": "#106", "t": "Avatar moved to bottom-right"},

    # Coach & Progress
    {"g": "coach", "id": "co-done", "s": "done", "b": "#101-#107", "t": "Coach hub + Today\u2019s plan + Achievements (now the Pro section)"},

    # Foundation
    {"g": "found", "id": "fo-done", "s": "done", "t": "PWA on GitHub Pages, Google sign-in + Firestore sync, Stockfish in browser"},
]

tpl = open("/home/claude/chess-tracker.template.html", encoding="utf-8").read()
html = (tpl
        .replace("__GROUPS_JSON__", json.dumps(GROUPS, ensure_ascii=False))
        .replace("__TASKS_JSON__", json.dumps(TASKS, ensure_ascii=False))
        .replace("__STAMP__", STAMP))
open("/mnt/user-data/outputs/chess-tracker.html", "w", encoding="utf-8").write(html)

o = sum(1 for t in TASKS if t["s"] == "open")
p = sum(1 for t in TASKS if t["s"] == "part")
d = sum(1 for t in TASKS if t["s"] == "done")
y = sum(1 for t in TASKS if t.get("you"))
print(f"wrote chess-tracker.html  | open={o} part={p} done={d} needs-you={y} total={len(TASKS)}")
