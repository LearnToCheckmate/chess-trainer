# Chess Trainer - Status Tracker

Living doc: what is DONE and what is OPEN. Updated each time we ship.

- Last updated: 2026-06-06, build #85 live. THIS file is the single source of truth; the Feedback chat and manual-tasks chat are input only (swept into here at the start of every build run).
- App: https://learntocheckmate.github.io/chess-trainer/
- Confirmed working on device: username persistence + auto-load (27 merged games with dates), White's/Black's openings split, pawn app icon.

Legend: [x] done · [ ] open · build number in (parentheses)

---

## DONE

### Foundation (earlier)
- [x] Self-contained React PWA on GitHub Pages; installable; cross-device sign-in + Firestore sync.
- [x] Play vs computer (real Stockfish), pass-and-play, and online-by-invite.
- [x] Learn: openings, gambits & endgames, taught move by move, engine-verified.
- [x] Puzzles: Lichess CC0 DB, winding roadmap with tiers, XP/streak.
- [x] Review: import a PGN, eval graph, blunder/mistake/inaccuracy labels, tap-to-jump moves.

### Look and feel (#23 - #34)
- [x] 3D buttons / cards / boxes with deeper shadows (#23, deepened #31). (#31)
- [x] Colorful icon tiles on Home and Learn. (#23)
- [x] Home redesigned: gray boxes removed, big colorful 3D icon tiles, bigger pawn wordmark, account chip + Theme/Texture toggles. (#31)
- [x] Result banner colored by winner; checkmate banner distinct from check. (#23)
- [x] Learn renamed "Discover" (telescope); Openings=rocket, Gambits=swords, Endgames=crown. (#27)
- [x] App icon + wordmark changed from knight to light-blue PAWN (knight read as Lichess). (#31 / icons)
- [x] Home wordmark pawn redrawn as an inline light-blue SVG (was the dark ♟ glyph that merged into the dark background). (#40)
- [x] Home title forced onto ONE line again (was wrapping to two), and the whole Home screen scales up on tablet-width screens (bigger title, tiles, fonts, wider layout) to use the iPad real estate. (#43)
- [x] Texture toggle removed from the Home screen (it showed no visible effect with no board on screen); theme + texture both already live in the in-app menu, reachable on any board screen. (#43)
- [x] Home in LANDSCAPE now fits one screen (was scrolling/cut off): the four option tiles drop to a single row, the intro animation is compact, and the tablet scale-up applies only in portrait. (#45)
- [x] Texture (cell depth) persists; flashy theme-cycle removed. (#27 / #31)
- [x] Roadmap: tier colors, bigger 3D nodes, thicker path. (#30)
- [x] Roadmap: tier piece icons always shown; locked tiers keep icon + small lock badge. (#34)
- [x] Dedicated HOME button in header (phone + iPad); Home removed from menu. (#34)
- [x] Fixed offset Play icon in the menu. (#34)
- [x] App-wide button polish: rounder corners, a subtle glossy top sheen, a touch more padding and a consistent icon gap. (#41)
- [x] Buttons given a deeper, more tactile 3D finish (stronger sheen + raised bottom lip + inner shading). (#42)
- [x] Wordmark pawn redrawn as a premium 3D ivory/gold piece (#42). Then REPLACED by the QUEEN as the app's mark (#50/#51): the Home wordmark pawn was removed (the queen intro animation is the motif there) and the in-app header pawn is now the queen. The toppling pawns in the intro stay (the queen topples them). Queen made bigger + gold glow (#50).

### Content / structure
- [x] Openings reorganized into visible White's / Black's sections + "After King's Pawn (1.e4)" / "Defences to 1.e4" sublabels + per-row B/W color tiles. (#32)
- [x] Gambits bucketed by first move. (#28)
- [x] Gambits buckets now use prominent headers (accent bar + swords icon + count) matching the Openings section treatment; kept first-move buckets per decision (19 / 5 / 1 across 1.e4 / 1.d4 / other). (#36)
- [x] Variation replay resets at the branch hub. (#25)
- [x] Halloween Gambit intro says "Aarav's favorite gambit." (#23)
- [x] ECO codes hidden from lesson titles (kept in data). (#23/#25)
- [x] Bigger, better-aligned Discover list titles: home heading enlarged; group header row now has the group icon + a Playfair title + a count chip. (#35)
- [x] Removed the orphaned MOVES + Analyze / Copy strip that was persisting on the Discover landing page (a leftover line from a previously opened lesson). Now only shows inside an actual lesson. (#43)

### Review / import
- [x] Lichess game import next to Chess.com; "review from anywhere" call-out. (#29)
- [x] Persists both usernames, auto-loads on open, merges Chess.com + Lichess into one date-sorted list (source + date per row) + search box. (#33)
- [x] Import section icons made larger and consistent. (#34)
- [x] Chess.com + Lichess collapsed into ONE import row: a site dropdown + one username field + Fetch (both usernames still saved and auto-loaded on open). (#42)
- [x] Review move list is now ONE horizontal scrollable strip; tap-to-jump kept, current move auto-centers. (#35)
- [x] Bigger eval graph: taller, white-above / black-below shading, thicker line + bigger current marker. (#35)
- [x] Bigger move-quality readout: large colored badge (star / check / ?! / ? / ??) next to the move, plus bigger summary chips. (#35)
- [x] Eval graph now marks key moments as tap-to-jump dots: brilliant (cyan), blunder (red), mistake (orange), inaccuracy (yellow). (#41)
- [x] Summary chips (brilliant / blunders / mistakes / inaccuracies) are now tappable and jump to the next move of that type, cycling through them. (#42)
- [x] "Better was X" line made much bigger and tappable (tapping shows the best move on the board). (#42)

### Play
- [x] Time controls relabelled "1 min / 2 min / 3 min / 5 min / 10 min" (increments still 1+1 / 2+1 / 3+1). (#34)

### Fixes
- [x] Join-by-CODE fixed (was passing the click event as the code). (#26)

---

## OPEN

### Swept from Feedback chat - OPEN (2026-06-07)
New items logged in the Feedback chat after builds #88-#95; deduped against Done.
- [x] (in:2026-06-07) Move the Train section out of Discover and onto the Home page (its own Home tile). DONE #96: added a teal "Train" Home tile (🎯, "Drill your openings") that opens the Train hub; Play now spans full width so the five tiles stay even; removed the Train card from the Discover landing.
- [x] (in:2026-06-07) Remove redundant board-state labels. DONE #97: on the local play board, dropped the "White/Black to move" text (the turn dots still show whose move it is) while keeping the meaningful states (in check, checkmate, stalemate, resigned, out of time). JUDGMENT CALL: kept the online "You are White/Black" label since in a remote game you otherwise can't tell your colour; easy to remove if Kunal wants.
- [x] (in:2026-06-07) Captured-pieces display. DONE #97: replaced the "Material even / You're up N" text with a Chess.com-style strip showing the pieces each side has captured (♔ row = pieces White took, ♚ row = pieces Black took) plus a green +N for whoever is ahead.
- [x] (in:2026-06-07) Back/forward navigation in a live game. DONE #97: a ⏮ ‹ ›  ⏭ bar above the move list lets you step through earlier positions read-only (board, last-move and check highlights all follow); a "● LIVE / Move n/N" readout shows where you are; tapping the board or making any move snaps back to live, so play can never get stuck. NOTE: built blind, not yet device-tested.
- [x] (in:2026-06-07) Minute time controls "missing" - VERIFIED in code, no regression: the 1/2/3/5/10 min options (plus 1+1/2+1/3+1) are present in New Game setup for Computer and Pass & play. Online intentionally shows multi-day "time per move" until live online clocks ship. Almost certainly a stale cached build on the device; needs a full close/reopen. No code change.
- [x] (in:2026-06-07) In-lesson control hierarchy. DONE #98 (Kunal clarified: the controls INSIDE a lesson). Reworked the practice-view button stack: primary actions first as tidy pairs (Watch again / Try again, then Hint / Flip), the two settings condensed into one short toggle row (Hints on/off, Tap moves / Drag piece) instead of two full-width sentence buttons, then Play vs Computer. Fewer rows, shorter labels, applies to every lesson including gambits.
- [x] (in:2026-06-07) Game Review summary as ONE card with two columns. DONE #98: replaced the two separate White/Black cards with a single card - two accuracy/rating columns split by a divider (the user's side highlighted), then one move-quality table with ♔/♚ count columns for each category. Key Moments and the buttons below are unchanged.
- [x] (in:2026-06-07) Declutter Discover / bunch the shortcuts. DONE #99 (clarified via two screenshots: Kunal wanted the loose cards bunched, not the category tiles removed). Moved Read-notation, Coach-says, and Continue off the Discover landing and bunched them WITH Train into one compact list on Home, directly under the coach tip box; each is a small row with its own colored icon. Folded the standalone Train tile into that bunch and reverted Play to a normal 2x2 tile. Discover landing is now just the three category cards. #100: merged the coach tip box and the four shortcut rows into ONE single tile (tip on top with a divider, the four rows below) per Kunal's "all under one singular horizontal tile". #101: restructured per Kunal's fuller vision - Home now shows just the four icon tiles plus ONE compact "Your coach" tile at the bottom. Tapping it opens a full Coach hub (its own screen) where the coach collects everything coaching/learning related: the contextual nudge with its action, plus Train your openings, Continue where you left off, Coach's pick, and Read chess notation. Fixed the confusing double "Train": the puzzle-goal nudge button now reads "Solve puzzles" instead of "Train", and "Train" now means only the opening drills. JUDGMENT CALLS to veto: Train sits in the bunch rather than as a big tile; Coach-says appears just under the Home coach tip (slight overlap); the bunch sits above the Colors/Style chips.
- [x] (in:2026-06-07) Chess-notation learning module. DONE #97: a "Read chess notation" card on the Discover landing opens a tabbed trainer - Squares (interactive "tap the named square" quiz on a labelled mini-board with a running score), Pieces (K/Q/R/B/N letters with glyphs, pawns have none), and Symbols (x + # O-O O-O-O =Q e.p. reference plus a "what does this move mean?" multiple-choice quiz). #102: randomized the quiz answer order (the correct option was always first); now shuffled deterministically per question.
- [ ] (in:2026-06-07) Library expansion: Kunal to send the openings from his "not in the library yet" list so Claude adds his real repertoire.
- [ ] (in:2026-06-07, non-build) Kunal's personal to-do: create a separate Gmail account for AI work.

### Process (adopted 2026-06-07, from Feedback chat)
- Before starting a build, state a rough processing-time estimate; after, report the actual elapsed time so estimates improve over time.
- Carry unanswered open questions forward across turns rather than dropping them (already in practice).

### Open decisions - quickest first (2026-06-06 working session)
Things that need Kunal's call; Claude can execute each immediately once decided (no device needed unless noted).
- [x] **Saved brilliancies** - cleared once on next load (#73); they now rebuild with the stricter post-#59 detector as games are reviewed.
- [x] **Daily-puzzle screen** - daily now auto-loads when the online-puzzles screen opens (#73); dev panel left as dev-only (already hidden from normal users).
- [x] **Classic icons** - Puzzles & Play tiles now render the app's crisp SVG knight/king; Discover/Review stay as book/chart emoji (#73).
- [x] **Review summary "estimated rating" (#69)** - KEEP as a labeled rough estimate (Kunal).
- [ ] **Opponent tiles (Computer / Pass&Play / Online)** - keep the new accent line icons (#68) or theme them per skin? (still open)
- [x] **Avatar position** - KEEP top-right (Kunal).
- [x] **Skins** - Playful + Medieval gated behind Pro; Classic is the free default; non-Pro falls back to Classic; PRO badges + upsell routing on the selectors (#74).
- [ ] (larger, needs YOUR device) Review-engine upgrade direction: all-Stockfish higher depth + multi-PV (unlocks Great/Miss/Book + mate), play-out-the-suggested-line, and the in-app "why this move is better" explanations you asked about.
- [x] Firebase authorized domains + Firestore rules: done (online + sign-in confirmed working in the 2026-06-06 two-device test). STILL OPEN: domain purchase (blunderly.com / learntocheckmate.com); Stripe + free-vs-Pro feature set.

### Shipped this session (2026-06-06, #63-#72)
- [x] Review "back to your games" button + scroll restore (#63).
- [x] Colors/Style reverted to tap-to-cycle; inline swatch grid in menu (#64).
- [x] Account-based multi-day (correspondence) games + "Your games" lobby + claim-win-on-time (#65 + host bridge).
- [x] Online move-sync hardening (rebuild authoritative position before pushing) (#66).
- [x] Illegal-puzzle fix: reject saved practice positions where the side-not-to-move is in check, skip to next valid; verified vs python-chess (#67).
- [x] Consistent, larger, deeper puzzle nav buttons (#67).
- [x] Custom SVG line-icon set for opponent tiles (#68); home tiles reverted to themed per-skin emoji per Kunal (#71); classic set made cohesive (#72).
- [x] Chess.com-style Game Review SUMMARY screen: per-side accuracy + rough estimated rating + move-quality breakdown + "Start review" into the stepper (#69); tappable Key Moments (#70).
- [x] Blue bottom-strip fixed: neutralized host page background (#0e1626 -> #0e0e12) and the app now keeps the page background synced to the current skin (#72 + host edit).

### Shipped this session (2026-06-06, #73-#85)
- [x] One-time clear of stale saved brilliancies; daily puzzle auto-loads on open; classic Puzzles/Play tiles render the SVG knight/king (#73).
- [x] Pro-gated Playful + Medieval skins; Classic free default; non-Pro falls back to Classic; PRO badges + upsell routing (#74).
- [x] Opponent tiles (Computer / Pass&Play / Online) themed per skin (per-skin tints + trim) (#75).
- [x] "Your progress" dashboard card on the Review landing: games reviewed, puzzles solved, rank, XP, best streak, brilliancies (#76).
- [x] Daily challenge: 5-per-day goal progress bar + consecutive-day streak on the roadmap (#77).
- [x] Coach in a dismissible Home tip bar with rating/progress-aware tips (#78); REWORKED from a pawn-character into an illustrated human mentor, iterated to a clean-shaven fair-skinned combed-back look with shirt collar + glasses (#80, #82, #84). Four styles were rendered for Kunal to pick (side-part / receding / clean-shaven / combed-back); combed-back is the default, and an in-menu "Coach look" picker (Side part / Receding / Balding / Combed back, each a live mini-face) now lets Kunal switch it himself, persisted (#87).
- [x] "Cell depth & texture" toggle now also embosses cards + buttons (#79).
- [x] Review fonts enlarged across the landing, the in-review header, and the summary (three passes) (#81, #82, #83); estimated rating restyled into a clear headline stat beside accuracy (#83).
- [x] Five named bot opponents (Pip 500, Rosa 900, Milo 1300, Astrid 1700, Viktor 2000), each a distinct face, in the New Game "Choose your opponent" picker; tapping sets strength, the slider still fine-tunes, the chosen bot's face + name show during the game, choice persists (#85).

### Online play polish - DONE #86 (verified working, two-device test 2026-06-06)
The draw / resign / rematch flows are built and confirmed working across two devices. Polish #88 (from a screenshot): enlarged the online panel text, standardized the in-game buttons into uniform colored 3D buttons in even grids (Resign red, Draw blue, Flip violet, Leave gray, primary actions in the theme accent), and made the in-app "Chess Trainer" header left-aligned and larger (app-wide).
- [x] (in:2026-06-06) Draw DECLINE now shows the offerer a dismissible "Draw declined" notice (synced via a doc `notice` field). (#86)
- [x] (in:2026-06-06) Online controls wrapped in a fixed min-height container so the panel no longer jumps on state change. (#86)
- [x] (in:2026-06-06) Incoming draw offer now appears as a top banner over the board (position still visible) instead of a low box, plus Accept/Decline in the side panel. (#86)
- [x] (in:2026-06-06) Game over now shows a prominent on-board overlay ("Draw agreed" / "You won!" / "You lost" with the end reason) and the rematch action there; resign and checkmate use the same overlay. (#86)
- [x] (in:2026-06-06) Rematch is now an OFFER mirroring the draw flow: requester taps Rematch -> opponent gets Accept/Decline -> on Accept both reset, on Decline requester gets "Rematch declined." New doc fields: rematchBy, notice, endBy, resignedBy. (#86)

### Open question (decide before building)
- [x] Gambits ordering: RESOLVED. Keep first-move buckets (#36), and (Kunal 2026-06-06) add White / Black sub-groups inside each bucket plus a per-gambit payoff badge - Checkmate (mate traps), Wins queen (queen-winning traps), or Better game (the rest, for initiative/attack). Shipped #89. NOTE: payoff categorization is Claude's best call (5 mate, 4 queen-win, 16 better-game) and easy for Kunal to correct.

### Quick wins - next build (solo, low risk)
- [x] All five quick wins shipped: bigger Discover list titles, horizontal review move strip, bigger eval graph, bigger move-quality readout (all #35), and prominent Gambits headers (#36). Next up is the Bigger builds list below.

### Bigger builds (each its own session)
- [~] Curvy roadmap: winding road DONE - switched to a clean two-column serpentine so every connector curves with no straight verticals (#87, render-verified). STILL OPEN (needs your device): iPad spacing and even bigger / more-spaced nodes.
- [x] Review "Import from" restructure (#37): single "Import from" header with Chess.com + Lichess provider rows; cell-style game rows with a Won/Lost/Draw badge (from your username's perspective), opponent, your color, time class, and date; search box de-emphasized (quiet, only shown past 6 games); latest games on top; library now persists when you start a new review. Per-game move-quality counts (great / mistake / blunder) appear on rows you have reviewed this session, cached on demand. STILL OPEN: populating those counts for EVERY game up front (background pass) - see the per-game-counts decision item below.
- [~] Broad iPad / large-screen real-estate use. PARTIAL: landscape board enlarged + rail fills leftover width (#41); Home screen scaled up on tablets (#43). STILL OPEN: the Discover landing and other screens still feel small / empty on iPad. See "Next builds" grouping below.

### Next builds (grouped, proposed order)

**Build A - Theme system / SKINS. PHASE 2 IN PROGRESS (#51, deepened #53).** Reworked from "just colours" into real SKINS (full looks). v1 ships three skins in the menu (Appearance > Skin) and a Skin quick-button on Home: Playful (bright), Classic (clean green, muted earthy tiles), Medieval (parchment + gold, heraldic tiles, gold tile trim, Cinzel heading font, warm stone background, medieval icons). Each skin sets the board palette + app background texture + heading font + home tile colours + home icon set together. The standalone 12-colour picker is retired (skins reference palettes internally). #53 deepened it: the skin background/texture now shows on EVERY screen incl Home (was Home-only-colour before); Medieval pieces get a subtle depth shadow (still the standard set, just shadowed); Playful now uses a rounded font (Baloo) and Classic an elegant serif on a cooler near-black background, so Classic/Playful/Medieval are clearly distinct (was: Classic looked too like Playful). STILL OPEN (deeper skinning): hand-drawn custom PIECE art per skin, custom-drawn icons (currently emoji swaps - medieval uses scroll/key/shield/swords, flag for veto), in-app textures beyond Home, and an optional board-colour sub-choice within a skin. PHASE 1 (#46) was: 12 board themes now tagged into three groups and shown under grouped headings in the menu:
  - Classic / sober: Forest, Walnut, Graphite, Slate.
  - Medieval (Game of Thrones vibe): Stone Keep, Parchment, Dragonstone, Royal.
  - Playful: Ocean, Dusk, Coral, Candy.
  STILL OPEN (phase 2, the deeper skinning): medieval PIECE set (custom piece SVGs), a medieval ICON set (restyle telescope/swords/crown + home tiles + roadmap), per-set backgrounds/textures, a full-screen theme GALLERY with a live board preview, and more palettes per group. (Some of phase 2 likely gates behind Pro - see Build E.)

**Build B - Discover landing makeover + iPad real-estate. STARTED (#46).** Shipped a "Continue" card at the top of the Discover landing that resumes your last opened lesson (persisted). STILL OPEN: two-column layout on wide/iPad screens (categories + side panel); a progress / rank summary card; puzzle streak + stats; a featured or recommended lesson / move-of-the-day; a daily goal; bigger category cards with a short preview. Decide which of these widgets to include, then build the wide layout.

**Build C - Home intro animation. DONE (#44).** On Home load a queen drops in above the wordmark and topples a row of four 3D pawns (they rotate out and fade); the queen settles standing. Plays once each time Home opens. Respects reduced-motion: instead of hiding everything (old behavior, which left a blank gap), it now shows the queen standing without the motion (#48). NOTE: if you have iOS Reduce Motion on, you see the static queen, not the drop/topple; turn Reduce Motion off (Settings > Accessibility > Motion) to see it animate, and fully close+reopen so Home remounts. Timing slowed in #49 (queen drop 1.7s, pawns topple after she lands) since the original ~1s was too quick to see. Tunable: piece count, drop height/speed, whether it stays standing or fades out.

**Build D - polish odds and ends** as they come up (button/box feedback, etc.).

**Build E - Account chip + monetization. UI DONE (#46).** Home now shows a compact round avatar in the top-right corner (your photo when signed in); tapping it opens an Account panel with your profile (or a Sign-in button), an "Upgrade to Pro" card listing planned Pro features with Monthly / Annual plan buttons, and Sign out. The wide account bar was removed from the Home column.
  PAYWALL STARTED (#47): added a Pro entitlement flag (isPro), and PUZZLES is now the first paywalled feature - non-Pro users get a "Puzzles is a Pro feature" screen (with Upgrade + Back), a PRO badge on the Puzzles home tile, and the account panel has a "Unlock Pro (test mode)" toggle so we can test the locked/unlocked states right now. The Monthly/Annual buttons open STRIPE_LINK (a constant at the top of chess.jsx) when set, else show a coming-soon note.
  STILL OPEN (real Stripe): (1) create a Stripe account + a Product with Monthly/Annual Prices; (2) stand up entitlement on the backend - cleanest is the Firebase "Run Payments with Stripe" / firestore-stripe-payments extension (Blaze plan), which deploys the Cloud Functions + webhook and writes an active `subscriptions` doc on the user; (3) add host-page bridge methods (window.CTCloud.startCheckout + read subscription status) since checkout/entitlement can't live in the app bundle; (4) app reads real status -> sets isPro (replace the local test flag); (5) final pricing; (6) manage-subscription, restore purchases, account settings (rename / delete / export).
  DECISION (Kunal 2026-06-06): Pro should unlock ALL advanced features. Proposed split to confirm later - FREE: play vs bots, pass-and-play, Discover lessons, the daily puzzle, basic post-game result. PRO: deep Review + analysis (eval graph, blunder/brilliancy hunt, multi-game history), the full Puzzles roadmap, online multiplayer + multi-day games, the opening trainer, and the Playful + Medieval skins. Build the gating alongside Stripe (do NOT lock features now while Kunal is using a non-Pro build with no checkout path).

### Smaller items / fixes
- [x] **Sign-in working as of 2026-06-06 testing.** (Was reported broken #52/#53 - "Sign-in failed, please retry" - likely the iOS-PWA popup issue; resolved once Firebase authorized domains were added. If it regresses in the installed app, the fix is switching the host-page bridge window.CTCloud.signIn to signInWithRedirect.)
- [ ] Google sign-in account chooser: right now it auto-signs-in the first Google account. Offer an account picker / "add another account". NOTE: the sign-in runs through the host page's Firebase bridge (window.CTCloud.signIn), NOT chess.jsx, so this is a one-line change in index.html on the host page (set the Google provider custom parameter prompt=select_account) - can't be done from the app bundle.
- [ ] Online multiplayer: clock sync; optional matchmaking; long-polling fallback if latency degrades.
- [ ] Daily / correspondence time controls (multi-day) - needs correspondence handling, not just a label.
- [x] Review now analyzed by full-strength Stockfish (#39). When you open a single game (tap a game or Analyze a PGN), a dedicated Stockfish worker evaluates every position (movetime 300ms each, White-POV cp; mate as a large +/- cp) and the eval graph, blunder/mistake/inaccuracy labels, "Better was X", and the Brilliant (!!) call-out are all driven by it. The worker is separate from the play/eval-bar worker (no contention), spins up lazily on first review, and stays warm. Falls back to the old homemade depth-2 analysis when Stockfish isn't available (e.g. the in-chat preview). KNOBS / NOTES: analysis takes roughly (moves x 300ms), so ~12-18s for a full game - movetime is easy to dial up (more accurate) or down (faster). The per-row preview counts in the game list still use the fast homemade pass; reviewing a game overwrites that row with the accurate Stockfish counts. Brilliant should now fire on real sacrifices it can see within ~300ms of search; truly deep brilliancies may still need a longer movetime.
- [ ] Native app wrapper (Capacitor) for the app stores - iOS packaging needs a Mac.

### Research notes
- Game-import sources: only Chess.com and Lichess offer free public APIs to pull a user's games (verified June 2026). chess24 shut down Jan 2024 (folded into Chess.com). Other big names (ChessBase, 365chess, ChessKid, Chessable) are databases / learning / kids tools without a personal-game-export API. So our two providers already cover the field; the universal fallback for anything else is the paste-a-PGN box.

### Needs your decision / direction
- [ ] Icon/visual THEME system: a playful set (current emoji, good for kids) and a medieval / Game-of-Thrones set, switchable. Affects Home cards, Learn icons, roadmap tiers, Play-setup icons, import icons. (Biggest item; crown/endgames icon flagged as too cartoony.)
- [ ] Coach mascot: a coach figure (left/right, thought bubble) that suggests lessons by rating; tie into Discover and lessons.
- [x] Per-game move-quality counts in the Review list (#38, refined #39). Background pass analyzes every fetched game (only on the Review screen, pausing for any manual review) and fills each row with !! brilliant / ★ great / ? mistakes / ?? blunders for your moves; counts persist across reloads (localStorage 'ct_gamestats'). The row preview uses the fast homemade engine; when you actually review a game (#39) it is re-analyzed by Stockfish and that row's counts are overwritten with the accurate numbers. Brilliant (!!) is called out on the move (cyan badge), in the game summary chip, and on the row.
- [ ] Texture toggle: should "Cell depth & texture" also affect cards/buttons, not just board squares? (Currently does nothing visible on Home/menu.)
- [ ] Feedback system: like / dislike / "it's ok" on a lesson or feature + occasional gentle prompt; collect on backend.
- [ ] Gamification: small quick wins in succession.
- [ ] Register a domain (gambitly.com / gambitlee.com).
- [ ] Photo to board: snap a real board -> position -> confirm-and-correct -> analyze (Firebase function calling Claude vision).
- [ ] Play-setup icons (White / Black / Online) are boring - upgrade with the chosen theme.
- [ ] Palm / bottom-edge touch rejection (discuss).
- [ ] Engine strength feel-test: confirm Elo levels feel right in play.

---

### Setup YOU need to do (for multi-day games to work) - added 2026-06-06
Multi-day / correspondence online games shipped in #65 (app + cloud bridge), but they need two Firebase console settings before they work:
- [ ] Firebase console -> Authentication -> Settings -> Authorized domains -> ADD `learntocheckmate.github.io`. (Same item that blocks Google sign-in generally. Without it, sign-in fails and online/multi-day games can't run.)
- [ ] Firebase console -> Firestore Database -> Rules -> make sure signed-in players can read/write games + their own profile. If multi-day games don't appear, paste:
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
          match /games/{code} { allow read, create, update: if request.auth != null; }
        }
      }
- [ ] Then test with two Google accounts / two devices: New Game -> Online -> pick "1 / 3 / 7 days per move" -> share code; reopen on either device -> Play -> Online -> "Your games" -> Resume.
- (No Firestore composite index needed - games are tracked under each user's profile doc, not via a query.)

---

### Future big builds (candidate "big runs" to prioritize)
- [ ] **Chess.com-style Game Review redesign + stronger engine (NEW - Kunal wants this, do next). 2026-06-06.** Kunal likes how Chess.com presents reviews and wants the same look/feel plus stronger analysis. Four parts:
  1. **Summary screen (look & feel).** Add a Chess.com-style pre-review summary: a per-side breakdown table (White vs Black) for each move category with colored icon badges (Brilliant !!, Great !, Best *, Excellent thumbs-up, Good check, Book book, Inaccuracy ?!, Mistake ?, Miss X, Blunder ??), an estimated rating per side, the opening name, and a big "Start Review" button that then steps through the moves. (Today we jump straight into the move-by-move view and only have inline count chips. Our current taxonomy: Brilliant/Best/Excellent/Good/Inaccuracy/Mistake/Blunder - missing Great, Miss, Book.) Mostly client-side from existing per-ply data and SAFE to build; the missing categories depend on the engine work in part 2.
  2. **All reviews use Stockfish, stronger.** Kunal feels current results aren't strong enough. Make EVERY review run Stockfish (relegate the fast homemade fallback to a true last resort), at a higher fixed depth, and add multi-PV so we know the 2nd-best move. Multi-PV unlocks accurate "Great" (the only good move), "Miss" (you had a winning/forced line and missed it), and mate detection. NEEDS LIVE TESTING on device - Stockfish runs in the browser, I can't run it from my sandbox.
  3. **Play out the suggested line.** When we show a better move, let the user step through the engine's full principal variation, not just the single best move shown on the board now. Needs the engine to return a PV (several moves), stored per ply.
  4. **Deeper blunder / brilliant explanations.** More thorough, specific "why": what the blunder allowed (hangs a piece / allows a fork / misses mate) and why a brilliant move works (the sacrifice + how material or king-safety pays off), using the PV + tactical checks. Current text is a heuristic (pawns lost + material swing); upgrade it with the real PV and threat detection from part 2.
  Recommended order: 1 (visible win, safe) -> 2 (depth + multi-PV, unlocks the rest) -> 3 + 4 (PV playout + richer explanations) -> backfill Great/Miss/Book into the summary table.
- [ ] **Learn from your own games (PRIORITIZED - do next).** Turn the blunders/mistakes the review finds into a personal puzzle set with spaced repetition ("re-solve the positions you got wrong"). Ties Review + Puzzles + memory together; strong retention feature. Kunal confirmed he wants this.
- [ ] Video feature (PAYWALL candidate): expand the in-lesson video links into a real video feature/library; decide source + scope; gate behind Pro.
- [ ] Community / local play "play your neighbors" (location/ZIP based): collect ZIP + consent, match players in the same or nearby ZIP codes, suggest local players ("3 players in your ZIP"), good for longer games; aims to grow real-world social connection. PAYWALL candidate. Needs product + privacy/legal thinking (location & age consent, safety, moderation).
- [ ] **Teaching platform (NEW big direction - needs product discussion).** Connect human chess teachers with learners, and make the app the place teaching happens so teachers stick around:
  - Marketplace: people register as teachers (free to register); learners tap "find a teacher" and pick from a list by price/rating.
  - Monetization: a teacher account is free until you take on students; past a small free tier (say 1-3 students) the teacher pays a subscription (this is the Pro trigger for teachers).
  - Stickiness (built-in teacher tools so they don't just connect and leave to teach elsewhere): assign homework ("learn these puzzles by next week; practice 1-2x/day for 7 days"); the app tracks the student's practice and alerts the teacher (and optionally the PARENT) if a session is missed; progress reports.
  - KPIs / progress: track the student's Elo over time so the teacher can show value ("your Elo is up 20-50 pts this month").
  - OPEN PRODUCT QUESTIONS to work through: how teachers get paid through us (payment rails + our cut/payout, vs we only charge the teacher subscription); how lessons are delivered (in-app board + video/chat, or scheduling + external call); SAFETY/verification for adults teaching minors (background, consent, parent oversight, moderation); messaging between teacher/student/parent; scheduling/calendar; reviews & ratings. Big backend (teacher/student/parent roles, relationships, homework, reports, payments). Likely the largest build on the list.
- [ ] Possible DATING angle on top of local play: gently encourage players to meet up after a few games. Needs careful scoping (safety, consent, age-gating). Keep as a candidate to discuss.
- [ ] Adaptive coach / training plan: recommend the next lessons and puzzles based on your review weaknesses and rating; deliver it through the coach mascot. (Supersedes/feeds the existing mascot idea.)
- [ ] Progress dashboard: rating-estimate trend, accuracy, blunder-rate over time, puzzle streak - charts that show "you're improving."
- [~] Opening repertoire trainer: v1 SHIPPED #90 (Kunal chose tap-from-choices input). In Discover, after the demo, "Now I'll try it" practice now shows 2-4 tappable move choices ("Your move - tap the book move") routed through the same validated move path; a toggle switches between tap-choices and dragging the piece. Completing a line marks the opening Learned (green ✓ on the lesson, turning amber when a spaced-review interval of 1/3/7/16/30 days lapses; stored in ct_train). TRAIN HUB SHIPPED #91: a Train card on the Discover landing (with a learned/total count) opens a hub showing a progress bar, a "Due for review" queue (amber, only when something is due), and the curated recommended repertoire (Italian, London, Caro-Kann, King's Indian) with per-row status, each tappable straight into training, plus a "Browse all openings" link. STILL OPEN (nice-to-have, needs Kunal's eyeball): coverage/gaps view, and tuning the repertoire set.
- [~] Train coverage/gaps view: SHIPPED #92. In the Train hub, a "Your coverage" section breaks the openings into six situations (White after 1.e4 / 1.d4 / other, Black vs 1.e4 / 1.d4 / other), each with a learned-of-total bar and a GAP flag when nothing is learned there, plus a "Fill your biggest gap" CTA that jumps into the recommended lesson for the highest-priority empty situation (White opening, then Black vs e4, then Black vs d4). STILL OPEN: tuning the recommended repertoire set itself.
- [~] Real-game-driven gaps: SHIPPED #93. The Train coverage now reads your loaded Review games (ccGames PGNs): each game is bucketed by its first move and your color via gameInfo, and each situation shows your real record (e.g., "12g · 42%", colored red/amber/green). The "biggest gap" CTA becomes "Your weak spot" - the situation you've played 3+ games in with the LOWEST score - and points to the recommended lesson for it; it falls back to the coverage-based empty-bucket gap when you have no games loaded. NOTE: bucket-level only (White's first move + your color), not specific-opening matching; uses in-memory ccGames (loads when Review is opened), so it shows a "load your games in Review" hint if none are loaded.
- [~] Exact-opening matching: SHIPPED #94. Added pgnSans(pgn) to pull a capped SAN list from each game and a realOpeningStats memo that names the specific opening per game via the existing nameOpening() (longest library-line prefix match), aggregating your record per opening. The Train hub now has a "From your games" list (your actual openings, each with games + score%, colored, tappable into the lesson when it's in the library or marked "not in the library yet"), and the weak-spot CTA now prefers the specific opening you've played 3+ times with the lowest score, falling back to bucket-level then coverage. STILL OPEN: tuning the recommended repertoire set; possibly per-opening review queue.
- [~] Library expansion: ADDED 4 mainline openings #95 (all lines verified legal with python-chess): Slav Defense, Queen's Gambit Declined, Queen's Gambit Accepted (Black answers to 1.d4), and the Trompowsky Attack (White vs 1.d4 Nf6). Skipped a standalone King's Indian Attack because the Réti entry already carries a KIA variation. Openings library is now 28 mainlines. NEXT: Kunal can read the "From your games · not in the library yet" rows in the Train hub and tell Claude exactly which openings he actually plays that are still missing, so additions target his real repertoire rather than guesses.
- [ ] Daily challenge + gamification: a daily puzzle, streaks, goals, XP levels and badges/achievements.
- [ ] Bot personalities: themed computer opponents with distinct styles/levels (pairs well with the theme sets).
- [ ] (already listed) Photo-to-board, native Capacitor app, online clocks/matchmaking, coach mascot.

## Notes
- Builds auto-deploy ~1 min after each push; fully close + reopen the app to load a new build (build stamp is on Home / menu / play-setup footer).
- New pawn app icon needs remove + re-add of the home-screen shortcut to refresh on iOS.
- Lichess + Chess.com fetch run in the browser; verified on device.

---
## Build #103 — 2026-06-06 22:55 EDT
Autonomous run (Kunal selected all 16 picker items; build solo ones easiest-first).

SHIPPED #103:
- [x] Review summary "Book" category — opening moves that followed theory now count as Book (muted grey row), excluded from accuracy like chess.com. New `openingBookPlies()` helper. (#6 partial: Book done; Great/Miss still need the multi-PV engine, gated on #12 device work.)
- [x] Deeper gamification — Achievements system: 10 badges (puzzles 1/25/100, 10-streak, 3-day streak, openings 1/5, reviews 1/10, brilliancy). Unlock permanently, persisted (ct_achv). Strip on the Review "Your progress" card + full overlay grid. (#7)
- [x] Adaptive coach plan — Coach hub now shows a 2-3 step "Today's plan" derived from daily goal, games reviewed, openings due, mistakes to practice, openings learned. New `coachPlan()`. (#3)

DISCOVERED ALREADY SHIPPED (no change needed; marking Done):
- [x] Google sign-in account picker — host index.html already sets prompt:'select_account' with popup→redirect fallback. (#1)
- [x] Feedback widget on lessons — 👍/👎 on every lesson, persisted (ct_feedback), thank-you state. (#4)
- [x] Learn from your own games — reviewed games capture mistakes+brilliancies; "Practice your mistakes" drill quizzes the missed move and clears it once solved. Core done. (#8)
- [~] Bot personalities — each bot already has name+Elo+personality blurb in the picker. Deeper = engine-level style bias (NEEDS decision; risky, device-tested). (#5)

NEEDS KUNAL (carried, with questions):
- [ ] #2 Tune trainer repertoire — review queue already exists; recommended set already balanced. Need: what "tune" means (different starters? line length? aggressive vs solid?).
- [ ] #5 bot style bias (deeper), #9 missing openings list, #10 opponent-tile icons vs per-skin, #11 Stripe+pricing, #12 stronger engine (device), #13 iPad layout (device), #14 domain register, #15 Mac wrapper, #16 big bets (product chat).

---
## NEW — Discover: Tactics & Strategy teaching (added 2026-06-06, requested by Kunal)
Build out as separate sections, move-by-move like the openings. Backlog only; not built yet.

### Tactical motifs (own section)
- [ ] Fork / double attack
- [ ] Pin (absolute & relative)
- [ ] Skewer
- [ ] X-ray (attack & defense through a piece)
- [ ] Discovered attack
- [ ] Discovered check
- [ ] Double check
- [ ] Deflection
- [ ] Decoy / lure
- [ ] Removing the defender
- [ ] Overloading
- [ ] Zwischenzug (in-between move)
- [ ] Back-rank tactics
- [ ] Trapped piece

### Positional strategy (own section)
- [ ] Pawn structures (isolated, doubled, passed, backward, chains)
- [ ] Weak squares & outposts
- [ ] Open & half-open files (rook play)
- [ ] The bishop pair
- [ ] Good vs bad bishop
- [ ] Knight outposts
- [ ] King safety
- [ ] Space advantage
- [ ] Piece activity & coordination
- [ ] Prophylaxis
- [ ] When to trade
- [ ] The initiative

### Structure
- [ ] Add "Tactics & Strategy" as a 4th Discover category (alongside Openings / Gambits / Endgames) + navigation

---
## Build #104 — 2026-06-06 23:23 EDT
Autonomous run (Kunal selected all 27; build solo, skip blocked).

SHIPPED #104 — Discover · Tactics & Strategy (new 4th category):
- [x] New "Tactics & Strategy" Discover category card + nav (learnGroup 'tactics')
- [x] Tactics tab — interactive solve (tap piece, tap target), 6 motifs, all python-chess verified: Fork, Pin, Skewer, Discovered check, Back-rank mate, Smothered mate. Hint + Show-answer + Next.
- [x] Strategy tab — 6 concept cards w/ example board + "what to look for" + explanation: Control the centre, Develop & castle, Rooks on open files, Knight outposts, Bishop pair, King safety.
STILL OPEN (more content to author later, same component):
- [ ] More motifs: X-ray, discovered attack (separate), double check, deflection, decoy, removing the defender, overload, zwischenzug, trapped piece.
- [ ] More strategy: pawn structures, good vs bad bishop (dedicated), space, piece activity, prophylaxis, when to trade, the initiative.

SKIPPED THIS RUN (blocked on Kunal or device; carried):
- #4 Stronger Review engine (multi-PV, Great/Miss) — needs device testing.
- #5 Curvy roadmap — visual redesign; risky blind, do with device feedback.
- #6 Add missing openings — needs Kunal's list.
- #7 In-lesson video — needs scope/source decision.
- #8 iPad two-column landing — needs iPad testing + widget choices.
- #9 Online clocks / #10 correspondence — Firebase realtime; needs cloud testing.
- #11 engine feel-test, #12 opponent-tile choice, #13 medieval phase-2 scope — need Kunal.
- #14/#15 Stripe, #19 free-vs-Pro — need Kunal's Stripe account + pricing.
- #16/#17/#18 payments wiring — blocked on Stripe (16/17) / mostly post-payments (18).
- #20 neighbors, #21 social/dating, #24 photo-to-board — need product decisions / function enable.
- #22 Capacitor (Mac), #23 domain (Kunal buys).
- #25 palm/edge rejection — risky blind (would block a/h-file moves); tune on device.
- #26/#27 confirm avatar + animation — need Kunal's eyes.

---
## Build #105 — Play setup tiles (Kunal at computer, 2026-06-06)
- [x] Reordered opponent tiles: Online, Computer, Pass & Play.
- [x] Added a second row with two tiles: "Play with friends" and "Tournaments", both shown as SOON (tap shows a coming-soon note). Online still does invite-a-friend by code.
NEW features added to backlog (from this):
- [ ] Play with friends = a saved friends list (add/challenge friends), distinct from one-off invite codes. NEEDS scope.
- [ ] Tournaments = events/brackets. NEEDS scope.
OPEN: confirm whether "Online" should later become play-anyone matchmaking vs stay as invite. Bots style + avatar position decisions still pending.

---
## Build #106 — avatar + bot styles (2026-06-06)
- [x] Avatar moved to bottom-right on Home (Kunal's choice).
- [x] Bot styles: added style field to all bots; in-app engine (<=1300 Elo: Pip/Rosa/Milo) now nudges its near-equal-move choices by style (Rosa=attack, Milo=solid, Pip=balanced). Safe bias, never picks a blunder.
- [ ] Strong bots (Astrid/Viktor, Stockfish >=1320) style bias — needs Stockfish multipv; do later.
DECISION LOGGED: Online tile to become play-anyone matchmaking later; Friends tile = saved friends list. Both new features to scope.

---
## Build #107 — monetization split (2026-06-06)
PRICING LOCKED: Pro = $0.99/month, $9.99/year.
SPLIT (for now, adjustable): Pro = the Coach section only.
- [x] Coach tile on Home gated behind Pro (free users get the upgrade screen; PRO 🔒 badge on the tile). This gates the whole Coach hub: Today's plan, opening trainer, Continue, Coach's pick, and notation.
OPEN: Puzzles are still Pro from #47. Now that Pro = "just Coach", should Puzzles become FREE, or stay Pro too? (carried question)

---
## Build #108 — Puzzles free (2026-06-06)
- [x] Removed the Puzzles paywall (overlay disabled) and the PRO badge on the Puzzles tile. Puzzles now free for everyone.
SPLIT NOW: Pro = Coach section (+ Playful/Medieval board skins, which are still Pro). Everything else free.
OPEN: free the Playful/Medieval skins too (to make Pro literally just Coach), or keep them as a cosmetic perk?

---
## SWEPT 2026-06-07 — from manual-tasks chat (online-game device testing). Were NOT in backlog. Open.
- [ ] Draw decline is invisible to the offerer — show a clear "Draw declined" message (offering button quietly reverts now). [2026-06-07]
- [ ] Action buttons resize on state change and shift the whole side panel — give the button area a fixed size so nothing jumps. [2026-06-07]
- [ ] Incoming "offers a draw" prompt sits at the bottom under the thumb — move it to the top or surface it as a board overlay. [2026-06-07]
- [ ] Accepting a draw / resigning has no prominent confirmation — show a board-level end screen (like checkmate), e.g. "Draw agreed", with the rematch option right there, not just a quiet side-panel update. [2026-06-07]
- [ ] Rematch starts immediately without asking the opponent — make it an offer/accept/decline flow like draw offers. [2026-06-07]
KNOWN ISSUE (not a quick build): installed iOS PWA has a Google sign-in loop (iOS storage partitioning); workaround = use Safari. Native (Capacitor) wrapper would fix it.
NOTE: these are online-multiplayer UX; build the UI blind, Kunal verifies on two devices on the live site.

---
## SWEPT 2026-06-07 (run start) — from feedback chat, not yet in backlog. Open.
- [ ] Drag-and-drop castling (drag the king two squares to castle) [2026-06-07]
- [ ] Gambits lesson screen: button hierarchy — bring the most-used buttons (rows 3-6) higher and more compact [2026-06-07]
- [ ] Home screen: fix inconsistent icon sizing/alignment [2026-06-07]
- [ ] Tactics & Strategy screen: make the board and text larger [2026-06-07]
- [ ] Tactics: animate the full payoff sequence after a correct answer [2026-06-07]
- [ ] Coach avatar options rejected; wants Chess.com / Lichess style as inspiration (needs design direction) [2026-06-07]
PERSONAL (manual): create a separate Gmail account for AI work.
NOTE: drag-castling + Tactics bigger-board/text + Tactics payoff animation are buildable now; pulling them into this run since most of the requested 9 need Kunal/device.

---
## Build #109 — Tactics polish + curvier roadmap (2026-06-07)
- [x] Tactics & Strategy: bigger boards (360 wide) and pieces (37), bigger rank/file labels, and a payoff — solving now plays the move on the board (the piece pops onto its square) instead of just highlighting. [from swept feedback]
- [x] Puzzle roadmap: wider winding swing (20/80), bigger nodes (96) and more spacing (gap 168), chunkier road line. [#2]
DEFERRED (need the same Stockfish multi-PV work + device testing, bundling together):
- #1 Stronger Review engine (multi-PV, real Great/Miss).
- #4 Strong-bot styles (Astrid/Viktor) — needs multi-PV on the play worker; risky blind because it shares the eval-bar worker. Rosa/Milo styles already live (#106).
SKIPPED (need Kunal): #3 feel-test, #5 themes phase-2 scope, #6 photo-to-board (needs cloud function), #7 neighbours, #8 social/dating, #9 confirm animation.

---
## OPEN 2026-06-07 — Stripe Pro wiring (sandbox/test first)
- [ ] Guide Kunal through installing the Invertase firestore-stripe-payments extension on chess-trainer-d3664 (he enters the Stripe secret + webhook signing secret in Firebase, never in chat). [2026-06-07]
- [ ] Wire app: upgrade screen (monthly price_1Tfk6UHP2QrcLuy1Y3H5livy / yearly price_1Tfk6UHP2QrcLuy1AnEX49pe), checkout via extension createCheckoutSession, Stripe customer portal for manage/cancel. [2026-06-07]
- [ ] Gate: Pro = Coach section only; Puzzles free; skins Playful/Medieval still Pro (open: free them). Entitlement from extension subscription docs / custom claim. [2026-06-07]
- [ ] Stay in TEST/sandbox. Live keys = separate later step. [2026-06-07]
Stripe TEST IDs: prod_Uf4EArTELOKeS0 | monthly price_1Tfk6UHP2QrcLuy1Y3H5livy | yearly price_1Tfk6UHP2QrcLuy1AnEX49pe

## Build #110 — Stripe Pro wiring (TEST/sandbox)
- [x] App wired: upgrade screen Monthly/Annual buttons now call CTCloud.proCheckout(priceId) -> firestore-stripe-payments checkout; "Manage subscription" button -> Stripe customer portal (createPortalLink). [#110]
- [x] Entitlement: isPro = live subscription (customers/{uid}/subscriptions active|trialing) OR the test override. Real subs read via CTCloud.proWatch. Test unlock/turn-off kept for sandbox. [#110]
- [x] Host index.html: added collection/addDoc + functions imports, CTCloud.proWatch/proCheckout/proPortal (extension instance firestore-stripe-payments, region us-central1). [#110]
- [x] Gate unchanged: Pro = Coach only; Puzzles free; skins Playful/Medieval still Pro. [#110]
- [ ] STILL KUNAL: install + configure the extension on chess-trainer-d3664 (secret key + webhook secret in Firebase), add Firestore rules for customers/products, then test a sandbox checkout. [open]
- [ ] OPEN QUESTION: free the Playful/Medieval skins too?
TEST IDs in code: monthly price_1Tfk6UHP2QrcLuy1Y3H5livy, yearly price_1Tfk6UHP2QrcLuy1AnEX49pe, product prod_Uf4EArTELOKeS0.

## SWEPT 2026-06-07 (run start) — from manual-tasks chat
- [ ] Pre-warm the Firestore connection so the first online move doesn't have the one-time 5-10s cold-start lag. [2026-06-07]

## Build #111 — online: board-level "Draw/Rematch declined" toast for the offerer
- [x] on-decline: decline now shows as a prominent top-of-board toast to the offerer (plus the existing side-panel notice). [#111]
- FOUND ALREADY BUILT (after build 81, the feedback's build): incoming draw prompt = top board overlay; board-level end screen (Draw agreed / You won / You lost) with rematch; rematch = offer/accept/decline with notices. Kunal to re-test on #111.
- on-btnsize: control area already has a fixed min height (partial). on-invite: works; live minute-clock sync still open. on-corr: correspondence engine built; confirm the lobby exposes the day-per-move picker.
- OPEN/NEEDS KUNAL: #7 Tournaments (format decision), #8 Online matchmaking (queue design + backend).

## Build #112 — online live synced clock
- [x] Synced minute-clock for online live games: clock state stored in the game doc (clk{w,b}+moveAt), seeded at creation from the live time control, deducted by think-time + increment on each move, ticked client-side every 250ms, shown for both sides in the panel, with a "Claim win (opponent flagged)" button on time-out. Local clock fenced off for online. [#112]
- Re-test on two devices (sandbox can't run online). 
QUEUED next: #8 quick-match matchmaking (standalone, needs an 'mm' Firestore rule). Then #7 tournaments (all 3 formats; needs time-control + friends-by-code-vs-open decision).

## Tournament decisions (2026-06-07): OPEN to anyone who joins; Claude picks the clock approach when building. (For the future tournaments build.)

## Build #113 — online quick-match matchmaking
- [x] Quick match button in the online lobby: posts a waiting entry in the 'mm' collection or pairs with an existing one (transaction-claimed), creates the paired game, both players land in it. Cancel + searching state included. Isolated from play/clock code. [#113]
- NEEDS KUNAL: publish the 'mm' Firestore rule, then test on two devices (both tap Quick match). Then this is verified.

## Build #114 — Chess.com-style player bars on the play screen
- [x] Added a compact player bar above the board (opponent) and below (you), each with avatar, name, captured pieces + material lead, and the clock. Works for online (synced clock), vs computer (local clock + bot face), and pass & play. Old centered clock bar and the duplicate panel clock removed; board stays large. [#114]
- Build-blind; Kunal verifies on device. Inspired by his two Chess.com screenshots (big board, names + captured pieces top/bottom).

## Build #115 — tactics/strategy content + drag-castle + lesson stepper
- [x] Tactics & Strategy: added 4 tactics (Double attack, Pawn fork, Double check, Hanging piece; verified with python-chess) -> 10 total, and 6 strategy concepts (7th rank, passed pawns, trade when ahead, queen home early, doubled pawns, knight on the rim) -> 12 total. [#115]
- [x] Drag-to-castle: commitOrPromote now uses matchTarget, so castling fires by dragging the king two squares OR onto its own rook (tap works too). Flag: both gestures enabled; can restrict to one. [#115]
- [x] Gambits/lesson demo: moved the move-stepper to a compact row above the board (always visible); removed the below-board copy. [#115]
- [x] Cleanup: disabled the old centered captured-pieces strip below the board (the #114 player bars now show captures), removing the duplicate. [#115]

## Build #116 — stronger bots + deeper Review (safe tuning, build-blind)
- [x] Bots: Astrid 1700->1900, Viktor 2000->2350; ELO_MAX 2000->2400; bot think-time tiers (cpuElo<1500:1.1s, <2000:1.9s, else 2.6s) so the top bots reach their rated strength. Stockfish UCI_Elo still drives play >=1320. [#116]
- [x] Review: analysis movetime 300ms -> 480ms (340ms when >80 plies) for more accurate evals/graph/tags. Review already shows best move + arrow + explanations. [#116]
- Deferred (need Stockfish multi-line / live calibration, kept safe): strong-bot personality (attack/solid for Astrid/Viktor), and real Great / Miss tags. Best done by importing one of Kunal's games and calibrating together.

## Build #117 — Review multi-line tags (Great / Miss)
- [x] Analysis worker now runs Stockfish MultiPV=2; sfEval1 returns the 2nd-line eval. Import loop tags Great (best move AND >=160cp better than the 2nd option) and Miss (was >=+200cp, a mistake/blunder dropped it below +130cp). Added to summary CATS, _sideStats counts, eval-graph dots, per-move list, and the explanation text. Miss also feeds the mistakes drill + stats. Safe fallback: if no 2nd line arrives, Great is skipped and everything else is unchanged. [#117]
- NEEDS KUNAL: import a real game (Kunal2023) and screenshot the move list + summary so thresholds (160/200/130cp) can be tuned. Bot personalities (Astrid attack / Viktor solid) still deferred (touch the live-play worker; higher risk; do next as its own piece).

## Build #118 — strong-bot personalities (Astrid attack / Viktor solid)
- [x] Play worker now collects Stockfish's top lines (MultiPV=3) ONLY for a personality bot's move search (gated by sfCandRef; eval bar forced MultiPV=1 so it is untouched). Among candidates within 25cp of the engine's own chosen move, the bot prefers the highest styleBias move (attack for Astrid, solid for Viktor). Default and fallback = the engine's chosen move, so strength is preserved. Viktor style changed 'balanced'->'solid'. [#118]
- Build-blind; Kunal verifies feel on device. If the lite engine ignores MultiPV, no candidates -> falls back to plain Stockfish (no personality, no breakage).

## Gathered 2026-06-07 — outstanding items found across chats (newly folded in)
- [ ] (in:2026-06-07, feedback) Remove the redundant "You are Black" / "White to move" labels — the #114 player bars now show whose turn and which side you are, so the text is duplicative.
- [ ] (in:2026-06-07, manual chat) Pre-warm Firestore on app open (a tiny throwaway read/auth touch) to kill the one-time 5-10s lag on the first cloud action / first online move.
- NEEDS CLARIFICATION (not added as definite Open):
  - "Back/forward move navigation during live games": confirm this means stepping through earlier moves during an ONLINE live game (vs-computer and pass & play already have move nav).
  - "Remove two bottom Discover tiles": which two? The Train card was already removed from Discover in #96.

## Build #119 — overnight safe batch (no input needed)
- [x] Removed the redundant "You are White/Black" line from the online panel (the #114 player bars show side + turn). The plain "X to move" banner was already only shown on check/checkmate. [#119]
- [x] Home tiles: the Play icon was larger than the other three; all four now use the same size + spacing (uniform). [#119]
- [x] Firestore pre-warm: host page opens the connection on load with a throwaway getDoc('_warm/ping'), so the first cloud action / online move should not pause 5-10s. [#119, index.html]
- Reviewed but left alone (already handled): online action-button shifting — the control area already has a fixed min-height (104px) and uniform buttons; will lock further only if Kunal still sees shifting.
- HELD for an awake, focused session (not landed unattended): Tournaments (large, two-device-only testing).

## Clarification answers (logged 2026-06-07, no build yet)
- Skins: KEEP Playful/Medieval as Pro (confirmed; no change).
- Domain: register gambitcoach.com at CLOUDFLARE.
- Correspondence: YES, add a 1 / 3 / 7-day-per-move picker to the online lobby (build later).

## Friends design (logged 2026-06-07)
- Add friends by USER ID only (no codes, no links).
- Entry points: (1) an "Add as friend" action on your opponent after you finish a game with them; (2) enter a user ID that someone shares with you.
- Mutual: the other person confirms / chooses to be identified as a friend (friend-request + accept model, to confirm).
- Purpose: track the friend network; later challenge a friend to a game (replay).

## iPad layout (logged 2026-06-07, from photo)
- The lesson/board view ALREADY renders a two-column landscape layout on iPad (board left, lesson panel right) and looks good (Stafford mating-trap payoff + arrows read well).
- Remaining question for "Landing makeover + iPad two-column": whether to also give the HOME/landing screen an iPad two-column treatment, or leave it.

## More answers (logged 2026-06-07)
- iPad: ALSO redo the HOME/landing screen as a two-column landscape layout on iPad (board/lesson already two-column).
- Friends: MUTUAL — adding requires the other person to accept a friend request (both agree). Confirmed.
- Video: auto-pick a curated video per lesson AND keep the link-out options; the video must PLAY INSIDE THE APP (embedded player, e.g. YouTube iframe), not just link out. Fallback to a link if a given video blocks embedding.

## More answers (logged 2026-06-07)
- Tournaments: build ALL THREE formats (round-robin, knockout, Swiss). Open to anyone; Claude picks the clock.
- Themes phase 2: do CUSTOM PIECE ART first (hand-drawn pieces per skin), before icons/backgrounds/gallery.
- Photo-to-board: BUILD IT (snap a real board -> analyze). Needs a cloud vision step; Claude to scope.

## Final answers (logged 2026-06-07)
- Play-neighbours: BUILD IT, find nearby players by approximate location / ZIP (asks users to share rough location). Privacy-conscious design.
- Tournaments: SCHEDULED START TIME (a tournament begins at a set time), open to anyone, all three formats, Claude picks the clock.
- STILL NEEDED from Kunal (free text): the list of openings he plays that aren't in the library.
- Not questions (Kunal's side to action): install Stripe extension; engine strength feel-test; import a game so Claude can calibrate Great/Miss; eyeball the slowed queen animation.

## Build #120 — 12 curated openings added (Kunal had no list; Claude curated)
- [x] Added (all engine-verified lines, with idea + per-move notes + plans): French: Tarrasch (3.Nd2), Queen's Indian, Bogo-Indian, Colle System, Stonewall Attack, Torre Attack, Benoni Defense, Tarrasch Defense, Sicilian: Alapin (2.c3), Sicilian: Closed, Ponziani Opening, Center Game. [#120]
- Skipped as ALREADY-PRESENT main lines (sweep caught duplicates): Najdorf (= main Sicilian line), Ruy Lopez Morphy/Closed (= main Ruy), Caro Classical (= main Caro), French Classical (= main French).
- Added as top-level entries under their cat (no edits to existing entries, lower risk).

## Cross-chat sweep (2026-06-08) — feedback chat + manual chat
NEW items folded in from the feedback chat (added to tracker, Open):
- [ ] (in:2026-06-08) Play vs Computer: bigger board — look into why Chess.com's board looks larger and match that scale; during a live game prioritize board size and let buttons sit below the fold.
- [ ] (in:2026-06-08) Play vs Computer: add a toggle to HIDE the eval bar so the board can be bigger.
- [ ] (in:2026-06-08) Play vs Computer: tidy the bottom button sizing + font alignment.
- [ ] (in:2026-06-08) Home: revert the avatar circle to its ORIGINAL top-right position (it has been bottom-right since #106).
- [ ] (in:2026-06-08) Tactics screen: increase the text + board size further.

CONFIRMED ALREADY DONE while sweeping (not re-added):
- Minute-based time controls 1/2/3/5/10 are present in TIME_CONTROLS (plus 1+1/2+1/3+1). DONE.
- Chess-notation learning section exists and is reachable: NotationTrainer renders in the Coach hub ("Read chess notation"). DONE/built.
- Drag-and-drop castling: DONE #115. Train moved to Home: DONE #96-#101. Tactics post-solution payoff: DONE. Home icon alignment: DONE #119.
- Manual-chat draw/rematch items all already tracked: draw-declined message DONE #111; incoming-draw overlay DONE; draw/resign end screen DONE; rematch offer/accept/decline DONE; action-button shift = in-progress (fixed min-height; re-test). 

STRIPE: marked DONE — Kunal finished the extension install + webhook + rules in the manual-tasks chat. Only a sandbox checkout test (card 4242) remains when he wants.

## Build run #121 (2026-06-08) — easiest-first batch
- Correspondence (item 1): CONFIRMED already built. Online setup shows a "Time per move" picker (No limit / 1 / 3 / 7 days) and create-game passes it. Marked done; two-device test pending.
- In-app lesson video: CONFIRMED already built. Each lesson has a Watch-in-app embedded player + YouTube/coach link-outs. Per-lesson curated video coverage is sparse (op.video field) -> population pending a decision.
- [x] po-avatar: Home avatar reverted to its original top-right corner. [#121]
- [x] ts-size: Tactics/Strategy board enlarged 360->400 + bigger motif title / idea text. [#121]
- [x] pl-evalbar: "Evaluation bar" ON/OFF toggle added in the menu; off widens the board. [#121]
- pl-board: partly addressed (#121 eval-off width gain); matching Chess.com's exact scale + buttons-below-fold need a screenshot.
- DEFERRED pending input (in the question list): iPad two-column Home arrangement; video curation approach; photo-to-board vision service.
- QUEUED big builds (decided, untestable in sandbox): Friends (needs new Firestore rules first), Tournaments (all 3, scheduled), Play-neighbours, Themes phase-2 custom piece art.

## Answers (2026-06-08) — Home renderings + video + photo-to-board
- iPad two-column Home: Kunal wants VISUAL RENDERINGS / mockups of the layout options FIRST, then build the chosen one (do not build blind).
- Per-lesson video: AUTO-FILL curated picks (Claude best-guesses a YouTube video per lesson into op.video; Kunal swaps any bad ones). The embedded in-app player is already built. [TODO: web-search a curated video per opening, add video fields]
- Photo-to-board: route photos through a FIREBASE CLOUD FUNCTION (needs setup). [TODO: write a function calling a vision API to return a FEN; app capture/upload UI + board render; function deploy + API key are Kunal's manual steps]

## Build #122 — iPad Home Option C (2026-06-08)
- [x] dc-ipad: iPad landscape Home rebuilt as Option C (Kunal's pick): brand across the top, four tiles in a row, coach + chips on one bottom row. Portrait unchanged. [#122]

## Build #123 — iPad Home: revert Option C, enlarge tiles (2026-06-08)
- Kunal disliked Option C (chips were on the coach's row). Reverted to the prior layout (chips on their own centered row below the coach).
- Real goal was to USE the empty landscape space: enlarged the four Home tiles + their label/sub text in landscape (icon box +~74%, icon ~1.64x, bigger label/sub, wider grid gap). [#123]
- Note: Kunal's iPad Safari tab was stale on #104; reload needed.

## Stripe Pro UI (Open 2026-06-08 -> Done #124)
- Task: wire the Stripe Pro UI (backend installed + verified; do NOT touch extension/webhook).
- Finding: the app (since #110, live in #123) and the host page already match the spec exactly:
  - Upgrade screen offers Monthly price_1Tfk6UHP2QrcLuy1Y3H5livy / Yearly price_1Tfk6UHP2QrcLuy1AnEX49pe.
  - proCheckout writes customers/{uid}/checkout_sessions {price, mode:'subscription', success_url, cancel_url, allow_promotion_codes} and redirects to the `url` the extension writes (URL flow -> NO publishable key needed). Passes priceId directly (not the prices subcollection).
  - proWatch reads customers/{uid}/subscriptions; status active OR trialing => Pro. Gated by the sub doc, not the custom claim. Puzzles free. Skins Playful/Medieval Pro.
  - proPortal calls ext-firestore-stripe-payments-createPortalLink with {returnUrl}.
  - Verified the LIVE deployed index.html is byte-identical to the working copy (wiring is live).
- [x] #124: cleaned stale/em-dash error copy ("extension finishing setup" -> friendly, no em-dashes). No other change needed.
- Likely only failure point: Firestore rules for customers/products. If checkout errors on permissions, publish the standard firestore-stripe-payments rules (merged with existing users/games/mm rules).
- OPEN question still: free the Playful/Medieval skins, or keep Pro? (currently Pro)

## Build #127 — Photo-to-board (app side) + recovery from a disk revert [2026-06-08]
- Photo-to-board app side built: New Game screen "Scan a board from a photo" button. Flow: file/camera picker -> canvas downsize to 1024px JPEG -> window.CTCloud.scanBoard(base64) -> validate FEN (both kings, 8 ranks) -> setSetupFromFEN + open "Play this position". Friendly errors when the function is not deployed or the read fails. [#127]
- Host page (committed 1cc612ce): added CTCloud.scanBoard stub + impl (httpsCallable getFunctions(app)'scanBoard'). [#127]
- Cloud Function provided to Kunal (scanBoard.cloud-function.js): v2 onCall, calls Claude vision (claude-sonnet-4-6) -> FEN, uses ANTHROPIC_API_KEY secret. NEEDS KUNAL: firebase init functions (if needed), paste code, set secret, deploy --only functions:scanBoard. Region us-central1.
- INCIDENT + RECOVERY: the sandbox filesystem reverted between turns. chess.jsx on disk had lost Friends (#125) and the 8 videos (#126), keeping only this turn's scan edits; an interim deploy (#125-stamped b7d7a2a9) was a regression. Re-applied Friends + Videos from the in-context edit scripts, rebuilt chess.jsx (friendsOpen=1, videos=10, scan=1, 4110 lines), and redeployed a correct #127 (c0c669d7). Verified live bundle has Friends + videos + scan + stamp.
- PROTECTION: chess.jsx source is now pushed to the repo (cf13e329) as a durable backup. If the disk reverts again, fetch the true source from raw.githubusercontent.com/.../main/chess.jsx before editing.

## Build #128 — In-lesson video auto-fill, batch 2 [2026-06-08]
- Added 7 more curated Remote Chess Academy videos (correct author; best-guess IDs, swap if needed): Scotch Game _r4QNfOzPik, Scotch Gambit QEYybZ8FYGE, Vienna Game x7NhxHm5qoI, English Opening eM6d2etuzZU, Scandinavian sKoBj-kL0hg, Pirc nBYZ_H6u_9c, Dutch m4TpwMWIoyw. [#128]
- 15 main lessons now have an in-app video. Skipped Nimzo-Indian and King's Gambit this round (no single clearly-reputable channel surfaced; revisit later).
- Reconciled working copy from repo at start of turn (disk-revert guard). Source re-backed up to repo (b053fa70). [#128]
- NEXT video candidates: Nimzo-Indian, King's Gambit, Catalan, Grunfeld, Petrov, Alekhine, plus popular gambits (Stafford, Smith-Morra, Danish, Evans, Budapest).

## Build #129 — Play nearby [2026-06-08]
- Built solo (Kunal away). New "Play nearby" tile on the New Game screen (3rd in the friends/tourney row; also fixed the stale SOON badge wrongly showing on Friends).
- Opt-in screen: "Find players near me" (geolocation, rounded to 1 decimal ~11km cell, stored as geo:lat,lng) OR a ZIP/postcode fallback (stored as zip:xxxx). Only a coarse area is shared, never exact coords. Lists other opted-in players in the same cell (live via onSnapshot, client-filtered to last 14 days, excludes self) with Challenge; a Stop button opts out (deletes your doc).
- Challenge = create an online invite (onlineCreate('w')) + tell user to send the code (same as Friends v1; notified/direct nearby invites = later).
- Firestore: collection 'nearby', doc id = uid, {uid,name,geo,at}. Query where('geo','==',cell) (single-field, no composite index). Host CTCloud: nearbyJoin/nearbyLeave/nearbyList (#129).
- NEEDS KUNAL: publish the 'nearby' rule (below) + test on two accounts. Untestable in sandbox.
- Disk-revert guard: reconciled from repo at start; source re-backed up (4a4695e7). [#129]

### Firestore rule for Play nearby (merge with existing rules):
match /nearby/{uid} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null && request.auth.uid == uid && request.resource.data.uid == uid;
  allow delete: if request.auth != null && request.auth.uid == uid;
}

## Build #130 — In-lesson video auto-fill, batch 3 (gambits + more) [2026-06-08]
- Added 7 more curated videos (swap IDs if needed): Evans ykjowp6waXA (RCA), Smith-Morra VEZ0H-g6U-8 (RCA), Danish WBAxtec_clo (Andras Toth), Budapest vSnN50aP3p4 (RCA), Stafford nH_fiqlLp2U (Eric Rosen, the popularizer), Catalan QYZu2HBP0PE (RCA), Grunfeld QdUKFEH58GE (RCA). [#130]
- 22 lessons now have an in-app video (24 video fields incl the 2 original).
- Still no video on: Nimzo-Indian, King's Gambit, Petrov, Alekhine, and many smaller lines/traps; add later if wanted.
- Disk-revert guard: reconciled from repo at start; source re-backed up (b6cbd9aa). [#130]

## Build #131 — PreMove + account reinstated (2026-06-09)
- GitHub reinstated LearnToCheckmate after the appeal; source restored from the repo at #130 and verified. [#131]
- PreMove (Chess.com style): while the opponent is on move, tap or drag a move to arm it; from/to squares tint orange (HL_PRE); it executes the moment your turn arrives if legal, else clears silently. Tap anywhere to cancel; re-tap a piece to re-aim; promotions auto-queen. Works in online games and vs the computer; cleared on resign, takeback, new game, and game end. [#131]
- New deploy style per the appeal promise: ONE commit per build (app.js + source backups together via the Git Data API), and a much gentler overall cadence. [#131]

## Build #132 — Discover gamification: Learned + Mastered (2026-06-10)
- Rep tracking in lesson practice: hints-off completion = Learned (retries allowed); flawless run (no hints, no wrong tries) banks a Mastered day, max one per local day; 10 days, gaps fine = Mastered. [#132]
- Badges: lesson lists show "★ Mastered" gold or "Learned ✓ · n/10 days to master"; lesson title gets a chip; completion message reports what banked. Train's spaced-repetition labels unchanged underneath. [#132]
- Persistence: ct_learnprog locally + merged into the account cloud save (days union across devices). Variations count toward the base lesson; off-book early checkmates do not count. [#132]
- Stage 2 queued: Coach mastery plan (Pro) — daily prompts + pick-your-targets. Mid-turn disk revert shipped a stale tracker in 4b987800; fixed in the follow-up commit.

## Build #133 — Flawless everywhere for Learned (2026-06-10)
- Kunal's call after playing a gambit lesson: ✗ bounces leak the answer by elimination, so Learned now also requires a flawless run (no hints, no wrong tries). Learned = first banked day; Mastered = 10 banked days, gaps fine. [#133]
- Learned is now derived from banked days everywhere (status rows, title chip, list badges, cloud merge), which auto-corrects any lenient Learned flag stored under the #132 rule. [#133]

## Build #134 — Mastery counter + tap-move buttons count as hints (2026-06-10)
- 10-dot flawless-day counter under the lesson title in Discover, filling green then gold at Mastered, with an "n of 10 flawless days" label. [#134]
- The Tap-moves panel (pick the book move from 4 buttons) is a 1-in-4 multiple choice, i.e. a hint: it now only renders when hints are ON. Turning Tap moves on with hints off flips hints on too, so reps stay honestly classified. [#134]

## Build #135 — Coach mastery plan, Pro (2026-06-10)
- Mastery plan card in the Coach screen (Pro-gated by the existing Coach gate): pick targets by tapping tiles in a stock-screener heatmap of all openings + gambits (red untouched, green scales with banked days, gold = mastered, n/10 on every tile). [#135]
- Targets list shows a daily state per lesson (▫️ pending, ✅ banked today, ⭐ mastered) with a Run button that launches the lesson directly into practice with hints OFF (coached rep). Multiple targets in parallel, each banks its own day. [#135]
- Honesty cooldown (global, flagged for veto): any hint exposure during practice locks that lesson's banking for 10 minutes; a flawless run during the lock explains when it can count again. Stored in ct_hintlock. [#135]
- Targets sync to the account (ct_coachtargets + cloud save/load adopt). [#135]

## Sweep 2026-06-10 (post-#135)
- Feedback + manual-tasks chats unchanged since 2026-06-08; one missed item folded in as Open: back/forward move review during live games (on-nav).

## Build #136 — Live-game move review + Play button grid (2026-06-10)
- Online games now feed playHist from the synced move list, so the existing ⏮ ‹ › ⏭ move viewer works during live online games: view-only, snaps to LIVE on any new move, tap the board to return. Premove tint hidden while reviewing; takeback hard-blocked online. [#136]
- Play bottom controls rebuilt as a 3+2 grid (Takeback/Hint/Resign, New Game/Flip): uniform 44px height, one font size, no flex-wrap drift. Screenshot wanted. [#136]
- Note: commits 97b45002 stamped #136 prematurely and carried a truncated chess.jsx + broken 194KB app.js (encode failure mid-write, masked by a piped compile check). This commit restores the source and ships the real #136. Compile checks now use unpiped exit codes and writes encode before touching disk.

## Questions for Kunal (parked 2026-06-10, answer anytime)
1. Hint cooldown (10 min): keep global, or Coach-only?
2. Screenshot of the new Play button grid (#136) for fine-tuning.
3. Board scale: still want the bigger Chess.com-style board? Screenshot to start.
4. Skins: free Playful + Medieval, or keep Pro?
5. Social scope: Play-nearby enough, or profiles/discovery later?
6. Confirm gamification judgment calls: variations count toward base lesson; off-book early mates do not count.
7. (new, #137) Tier unlock rule is learn 5 of 10 to open the next tier. Feel right?

## Build #137 — Mastery plan v2: collapsed report card, tiers, starter chooser (2026-06-10)
- Plan card starts collapsed: one-line report card (targets · banked today · learned · mastered), coach line invites first-timers; tap to expand. [#137]
- Catalog tiered in 10s: curated friendly Tier 1 (Italian, London, Caro-Kann, KID, Evans, Smith-Morra, Stafford, Englund, Scholar's Mate, Danish); learning 5 unlocks the next tier; locked tiers show as a single 🔒 row, no wall of red. [#137]
- Zero-target chooser: side, vs 1.e4/1.d4, payoff style (mate traps / win material / solid), then Suggest my 3 starters using existing payoff metadata; untouched lessons preferred. [#137]

## Build #138 — Chooser fix + gambit/opening question + re-pick (2026-06-10)
- Bug (Kunal repro): picking Black could yield all-White suggestions because an empty strict match silently fell back to the whole tier. Suggestions now relax constraints progressively (style, then 1.e4/1.d4, then kind) but NEVER abandon the side pick. [#138]
- New first question: I want to learn 🗡 Gambits / 📖 Openings / Both. [#138]
- "↻ Re-pick my targets" link under the targets list reopens the questions (with a ✕ to cancel) and replaces targets on Suggest. [#138]

## Build #139 — Mastery plan v3: your own slate, swaps, tier clearing (2026-06-10)
- Tiers redefined per Kunal: a tier is YOUR slate of 5 lessons chosen freely from the whole catalog. Learn all 5 (one flawless run each) to clear the tier; a 🎉 banner offers Start Tier n+1 (pick 5 new; learned lessons stay on the report card and keep accruing mastery days). [#139]
- 2 swaps per tier (⇄ on unlearned slate members; learned members lock in). Already-learned lessons cannot be added to a slate, preventing free clears. [#139]
- Chooser now fills EMPTY SLOTS (side pick still never abandoned); full catalog heatmap moved behind a Browse toggle; empty slots render as dashed ＋ rows. Tier number + swaps in the header line. [#139]
- Judgment calls flagged: slate size 5, clear = learn all 5, exactly 2 swaps per tier.

## Build #140 — Swap refill + you-pick-for-me (2026-06-11)
- Swaps now refill to 2 every 5 days (epoch-anchored, checked when Coach opens; disabled ⇄ shows days until refill). New tiers still start with 2. Nobody can be stuck more than ~5 days. [#140]
- 🎲 "No preference · you pick for me" in the chooser fills empty slots with a balanced curated mix (alternating gambits/openings, famous-first), zero questions. [#140]
- Answered in chat: already-learned lessons stay un-addable to slates because the FREE Discover practice also banks days (that is how out-of-tier lessons get learned); without the rule, five free Discover learns = an instant Pro tier clear.

## Questions for Kunal — addition (2026-06-11)
8. Learning path: keep flawless-day banking available in free Discover practice (status quo: free badges, Pro planning), or make banking Coach-only (Pro-only learning)? Affects the no-pre-learned-in-slate rule: Coach-only would make it moot.

## Decisions recorded (2026-06-11, batches 1-2)
- Learning path: free Discover + Coach both bank (status quo). Cooldown stays global. Tier rules confirmed (slate 5 / learn all 5 / 2 swaps, 5-day refill). Skins stay Pro. Social: nearby + friends is enough for now; profiles/discovery to be explained and revisited.

## Build #141 — Variations are separate lines + Coach safe-area (2026-06-11)
- Per Kunal: each variation now banks its own flawless days under a per-line key (base§variation). A lesson is Learned only when EVERY line is learned, so the clear reward comes at the end of the whole thing; Mastered = 10 distinct days across all lines + full coverage. [#141]
- Readers updated: lesson status (new "In progress · x/y lines learned"), title chip, 10-dot counter (union days + lines note), Discover rows, slate rows/tiles/credits, banked-today, addable rule (fully-learned lessons stay un-addable; partially-learned can be added). [#141]
- Coach ▶ Run targets the first unlearned line automatically (main first, then variations in order); variation picker shows ✓ on learned lines. Existing progress migrates as main-line days. [#141]
- Coach overlay no longer slides under the iPhone status bar (top padding now max(56px, safe-area + 12px)); spotted in Kunal's screenshot. [#141]

## Decision recorded (2026-06-11, batch 3)
- Board scale: make it bigger. All 8 parked questions now answered.

## Build #142 — Bigger board (2026-06-11)
- Portrait phones: side reserve cut 8px to 4px (board now runs flush edge to edge); eval bar slimmed 20+4 to 14+4 so vs-computer/review boards gain ~16px; companion panels (controls, cards, move list) widened from 94vw to 98vw to stay aligned with the wider board. [#142]
- Learn-mode portrait height cap raised 56% to 60% of screen height and hard cap 760 to 820 (mainly benefits iPad portrait); landscape board +12px taller. Play height reserve trimmed 282 to 262. [#142]

## Build #143 — Single hints button (2026-06-11)
- Practice row: removed the one-shot 💡 Hint (reveal) button; the single 💡 Hints: on/off toggle remains. Reveal state machinery kept internally; honesty cooldown unchanged. [#143]

## Build #144 — Palm rejection + online button metrics (2026-06-12)
- Palm rejection (judgment, flagged): board ignores touch presses starting within 10px of the screen's left/right edges. Tune or gate if edge files feel hard to grab on the flush board. [#144]
- Online panel: Claim-win button normalized to the uniform 48px/full-width metrics; remaining panel movement is row-count with state. [#144]
- Sweep note: feedback chat updated 2026-06-12 ~07:14 EDT but newest items are not text-searchable from the build chat (likely screenshots); Kunal to paste items here or give a keyword. Sign-in failure from 06-11 still awaiting surface + error details (Safari vs installed app).

## Roadmap additions from the 2026-06-12 product review (all five approved by Kunal, sequenced after Tournaments)
1. rv-gaps: post-game one-tap Review handoff + repertoire-gap detection (match imported games' openings to the lesson library; "faced Caro-Kann 6x, lost 4, learn it" with taps to lesson and slate).
2. pl-sound: sounds + haptics (move/capture/check via WebAudio, settings toggle).
3. hm-today: ONE Today card merging daily plan + next slate rep, topped with a daily streak.
4. in-sw: service worker (offline shell, instant loads, iOS Web Push readiness, auto cache busting via app.js?v=BUILD).
5. dc-coachvoice: coach voice lines from real data + shareable weekly recap card (Pro).
Queue order: Tournaments stage 1 → stage 2 → items 1-5 above.

## Program approved 2026-06-12 (Kunal: "A,B,C,D,E then all of section 8, then anything forgotten")
Build queue, flagged for veto since it moves Tournaments: Phase A (tokens+buttons) → B (celebrations) → C (Play re-chrome) → D (lesson action bar) → E (puzzles art) → eight deep reviews as deliverables → Tournaments stage 1 → stage 2 → the five 2026-06-12 roadmap items (rv-gaps, pl-sound, hm-today, in-sw, dc-coachvoice).
Forgotten-item adds: fd-legal (privacy/terms/account deletion, needed before Stripe live), fd-errlog (remote error logging to Firestore, ends blind debugging). Design specimens live in chess-design-review.html.

## Build #145 — Phase A slice 1 (2026-06-12)
- btn() factory upgraded to the system: minHeight 38→44, fontSize clamp(10,2.1vw,12.5)→clamp(12,2.7vw,14). Every standard button app-wide inherits the new size and type step in one edit. Radius 12 and the 3D shadow were already in place. [#145]
- Remaining Phase A: token palette injection at the theme root, radius/gray outlier normalization, button ordering law per screen. Continue next run.

## Build #146 — Phase A slice 2 (2026-06-12)
- Semantic tokens injected at the theme root: --ok, --gold, --warn, --bad, --r. Phases B-E build on these. [#146]
- Ordering law applied: both rematch prompts now read Decline left, Accept right. Remaining Phase A: gray/radius outliers, draw + practice surface ordering. [#146]

## Build #147 — Phase B: celebration layer (2026-06-12)
- Banked-day banner: slides from the top on any banked flawless run (and learned-a-line), auto-dismisses in 2.8s, tap to dismiss. [#147]
- LEARNED overlay (first day on a single-line lesson, or last line of a multi-line lesson) and MASTERED overlay (stamp animation, falling confetti, gold radial, Keep going button). Wired into finishRep's exact success points; painted with the #146 tokens. [#147]
- Remaining Phase B: sound pairing (pl-sound) and a share card on MASTERED.

## Build #148 — Phase A slice 3 + new operating mode (2026-06-12)
- Ordering law on both draw prompts: Decline left, Accept right, matching the rematch prompts. [#148]
- OPERATING MODE CHANGE (Kunal): every message now triggers the longest safe run, phases chained back to back; stop only when blocked or done. Next message launches Phases C+D+E (Play re-chrome, lesson action bar, puzzles art) as one continuous run, folding in the remaining gray/radius outlier sweep.

## BUILDGO protocol (established 2026-06-12)
Kunal can pre-authorize runs by pasting lines starting with the exact token BUILDGO (optionally followed by instructions) into the feedback chat or ahead of time in the build chat. The build chat must: (1) at the START of every session and (2) AFTER every completed run, conversation_search for "BUILDGO", dedupe against ones already consumed (track consumed ones in this backlog with timestamps), and execute any new ones within the same session before ending the reply. Hard stops only at the session memory edge or a true blocker. Caveats acknowledged: cross-chat search indexing can lag; each new session still requires one message from Kunal in the build chat. COUNTER UPGRADE (Kunal, 2026-06-12): a line "BUILDGO N" is a fuel tank paying for N runs. On first discovery, ledger it below (text, source chat, found-at timestamp, initial N, remaining). Every completed run decrements the ledger and logs the build number it paid for; blocked runs do not decrement. DEDUPE LAW: a ledgered line NEVER refills the tank no matter how many future sweeps find it; only a genuinely new BUILDGO line (different text or clearly later paste) adds fuel, and new fuel stacks onto the remaining total. Plain "BUILDGO" = value 1. The ledger persists across sessions via this file: a new session reads remaining fuel at start and continues burning it. One Kunal message per session is still required to start the session.

### BUILDGO ledger
- STANDING AUTHORIZATION: unlimited (Kunal escalated 1 → 10 → 10 → 1000 → 10k on 2026-06-12). Countdown retired by judgment call, flagged for veto; the run table reports start/end/duration per run. Every Kunal message buys the maximum work the session can hold.
(none yet)

## Run-table convention (Kunal, 2026-06-12)
Every reply that completes one or more runs ends with a table: Fuel (BUILDGO counter value paid, or "msg" when fueled directly by a Kunal message) | Run/build | Started (EDT) | Ended (EDT) | Duration. Times from the sandbox clock and commit timestamps. Sweep 2026-06-12: no BUILDGO lines found anywhere; ledger remains empty.

## Build #149 — Phase C slice 1: the icon strip (2026-06-12)
- Play bottom controls converted from the 3+2 text grid to the design-doc icon strip: ↶ 💡 ⟳ ⚐ as 46px icon squares (resign in danger tint, disabled states kept) + spacer + one primary New game button. [#149]

### BUILDGO ledger
- "Buildgo" · build chat · 2026-06-12 ≈21:00 EDT · value 1 · remaining 0 (burned on #149)

## Build #150 — Housekeeping (2026-06-12)
- Icon strip duplicate style keys removed; compile is warning-free. Housekeeping: no BUILDGO fuel burned. Sweep at session start: no BUILDGO tank found yet (paste lag possible); ledger empty.


## Build #151 — Phase C slice 2: message toasts (2026-06-12)
- onlineInfo now renders as a floating top toast (blue gradient, drop animation, auto-dismiss 4.5s) at both its surfaces instead of inline text. Burned 1 BUILDGO unit (oldest tank). [#151]


## Review 1 of 8 — Microcopy (2026-06-12)
- Delivered chess-microcopy-review.html: every user-facing string extracted and scored; counts for over-long strings, exclamation budget, lowercase starts, ellipsis inconsistency; term-consistency table; six standing copy rules adopted. Burned 1 unit from the 1000 tank.


## Build #152 — Phase A: tab buttons normalized (2026-06-12)
- BOTH tabBtn factories: radius 9 → system 12, padding bumped toward the 44px target. Last verbatim-known radius outliers closed. [#152]

## Review 2 of 8 — Accessibility (2026-06-12)
- Delivered chess-accessibility-review.html: WCAG contrast math on the real token pairs (faint .45-alpha text passes only as large type), tap-target census (26px icon squares need expanded hit areas), and the two genuine gaps: zero prefers-reduced-motion handling despite the new animations, and no keyboard focus styling. Fix items queued: a11y-motion (respect reduced motion), a11y-focus (focus-visible ring), a11y-hit (expand small icon hit areas), a11y-faint (lift .45 text tier).

## Build #153 — Accessibility fixes 1+2 (2026-06-12)
- All four injected animation blocks (celebration banner, overlays, both toasts) wrapped in prefers-reduced-motion no-preference guards; with reduced motion on, elements render static. Pre-existing piece animations remain for a later pass. [#153]
- Small icon squares grown to real hit sizes: 26px → 32px (slate ⇄/✕) and 24px → 30px (chooser ✕). Remaining a11y queue: focus-visible ring, faint-text rule. [#153]

## Build #154 — Phase C complete (2026-06-12)
- Queue correction: player bars were ALREADY BUILT in the prior session (pBar: avatar, name, captured pieces with material lead, ticking clock, online + computer + pass-and-play). The stale queue entry is closed.
- Polish shipped: the active player's whole bar now reads active (accent tint + accent border), bar radius 9 → 12, clock pill 8 → 10. Dead Clk component (zero call sites, superseded by pBar) deleted. [#154]
- Phase C is COMPLETE: icon strip #149, message toasts #151, player bars #154. Next: Phase D (lesson action bar + variation chips).
