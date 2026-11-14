# ODD DOSE — Changelog

## v1.6 — Gold economy & shipping rebalance
- **Central pill values** (`BALANCE.values`, `src/engine/values.ts`): Quick Sell 15 / 75 / 400 / 1,600 / 6,000g and
  ship value 40 / 200 / 950 / 3,800 / 14,000g (Common → Secret). One star multiplier `[1, 5, 25]` for Quick Sell,
  shipping and BACKDOOR.
- **Order reward = Σ ship value × quantity** (Angry ×3 + Manic ×1 = 320g; Ruin ×2 + Happy ×5 = 2,100g). Removed the
  random ×1.4–1.9, sender multipliers and the popularity pay bonus (popularity still speeds up orders). Kept only
  labelled bonuses: Confidential premium ×2.5 and Sales Team +10%/tier. Each order shows a per-line value and a
  breakdown; ★ lines pay the ★ value and consume the ★ specimen.
- **BACKDOOR** reference price is now the ship value (market index, bid/ask spreads, stock and FIRE list unchanged).
- **Balanced against time** (Copier stays free): Copier time per pill Common 2 min, Rare 8 min, Epic 40 min,
  Legendary 2 h, Secret 6 h (Happy ×11 is now 22 min). XP per shipped Gold 0.5 → 0.1 because rewards are ~5× higher.
  Mail offer prices now follow the values (expected Quick Sell value × 1.3, 8% off 3+ pulls).
- **Saves:** one-time migration raises open orders to the new reward (never lowers a promised reward; shipped/expired
  untouched; Gold, inventory, jobs and progress unchanged). Fixed during testing: the migration was skipped for real
  saves because a fresh game's marker was merged in on load.
- **Simulated (perfect always-on player, BACKDOOR locked):** Level 5 in ~6.5 h; 10 h ≈ 18,700g from orders vs ~450g
  from Quick Sell; 0g/no pills → ~900g in 1 h; copy-and-Quick-Sell alone ≈ 345g/h. 114 tests.

## v1.5 — Critical economy fix
Reported: Level 3 with 38g, Copier needed ~43g, orders asked for undiscovered Epics (e.g. Ruin ×2 + Happy ×5).
Reproduced with the engine: ~1 in 6 Level 3 orders required an undiscovered Epic; 11 Happy cost 55g to copy;
order descriptions came from a few per-sender lines and repeated.
- **The Copier is free** for every rarity. Limits are time (Happy 16 s, Rare 1 min, Epic 4 min, Legendary 15 min,
  Secret 45 min per pill) and batch size (11 / 6 / 3 / 1 / 1, doubled per Bigger Batches tier). The Starter tray was
  folded into the normal Copier; old saves' tray batches move into the Copier (or are delivered if it was busy).
  "Copier cost" is gone; orders show "Copier time" instead.
- **Rushing never mints Gold:** Machine and Copier speed-ups cost at least 1.25× what the rushed pills would sell for
  instantly (Quick Sell, or BACKDOOR once unlocked), scaled by the share of time skipped.
- **Orders fit progression:** ordinary orders ask only for Known pills of allowed rarities (Epic from Level 4,
  Legendary 6, Secret 8) or a one-step discovery (Rare from Level 1, Epic 5, Legendary 8). Confidential orders are
  the special commissions (may stretch one tier). Line count and quantities grow with level. Payout ≥ 3× Quick Sell.
- **Descriptions** now match the requested pill's Type (36 lines) and never repeat across open orders.
- Tests: economy suite rewritten (92 total). Simulated: 0g/no pills, 0g + busy Machine, BACKDOOR locked, orders for
  undiscovered pills, Copier busy, and a recreated stuck Level-3 38g save — all recover through normal play.

## v1.4 — Remove Charge & fix the Gold economy
- **Charge removed** everywhere (header, Scanner, regeneration, config, messages). Scanner now costs only 250g.
  No Gold costs were raised. Older saves load fine; their Charge fields are dropped.
- **Quick Sell** in the Vault pill card, from Level 1: pick a quantity (or All), see the exact payout, confirm.
  Sells only that exact star tier, never pills inside a Machine, pays once. Fixed prices (common 2g, rare 18g,
  epic 88g, legendary 440g, secret 2400g; ★ ×5, ★★ ×30) — below contracts, BACKDOOR and Copier cost.
- **Starter tray** on the Copier: free batch of 3 of any starter Common every 2 minutes. Runs alongside paid
  Copier batches, so it is always available — the guaranteed way back from 0g.
- **Contracts:** every order now pays at least 1.6× what the Copier charges to make it; the order shows its
  Copier cost next to the reward. Early orders ask only for Known pills or one-step discoveries.
- **Tests:** +17 economy tests (`tests/economy.test.ts`), 87 total. A bot plays each stuck scenario
  (0g/no pills, 0g + Known recipes, several open contracts, Machine busy 10 h, Copier busy 10 h) for 2 hours
  without BACKDOOR and always earns Gold; a fresh player ships ≥5 orders in 4 hours.

## v1.3.1 — Fix: sign-in not remembered
- **Bug:** the remembered player (and saves) lived only in the page's browser storage, which the claude.ai viewer
  can clear or block (e.g. mobile app, private windows) — so the game forgot the player.
- **Fix:** on claude.ai the remembered player and every player's save are also kept in the viewer's private
  account storage (`db` + `user` capabilities, `data/users/<id>/`). On launch the splash waits briefly for the
  account, uses its remembered player, and loads the newer of the device save and the account save.
  Account saves are written a few seconds after actions (and when the page is hidden), packed to stay small.
  Works across devices signed in to the same claude.ai account. Browser storage remains the offline fallback.
- Tests: +8 (`tests/cloud.test.ts`) — 70 total. Browser check: storage wiped between opens → "Welcome back",
  Gold and a running Copier job restored from the account.

## v1.3 — Splash screen & player sign-in
- **Splash screen** on launch: pills drop in, ODD DOSE logo, "Feel something new.", brass loading bar; tap to skip
  (~2.4 s; shorter with reduced motion).
- **Device-local sign-in:** enter a player name (2–16 chars). "Remember me on this device" (on by default) skips
  sign-in next time with a "Welcome back, NAME" card; otherwise the name lasts for the browser session.
- Each player name has its own save slot (`oddDose.save.v1:<name>`, case-insensitive). Players already used on the
  device appear as one-tap chips. HQ → Settings shows the player and has **Switch player**.
- Existing progress is kept: the first player to sign in inherits the pre-login save.
- No passwords and no server — saves don't sync between devices (would need a backend).
- Tests: +7 (`tests/profiles.test.ts`) — 62 total.

## v1.2 — Atmosphere, graphics & game feel
_Snapshot of the previous version: git tag `odd-dose-v1.1.1-snapshot`._

**Currency**
- Cash → **Gold**, shown as `1,250g` everywhere (header, Desk, payouts, speed-ups, Scanner, Copier, HQ, mail, BACKDOOR,
  toasts and engine error messages). One shared formatter: `gold()` in `src/engine/format.ts`. Save values unchanged.

**Lab**
- New Machine: ivory housing, brass nameplate/rims/tray, amber status lamps, dark glass dome with interior light that
  warms from teal to amber as incubation progresses, rising motes, glass reflection, brass-edged sliding doors.
- Start: pills sit in brass cradles → fly into the chamber → doors close → soft hum → incubation. Big amber LCD timer.
- **No spoilers:** undiscovered results show only "Something is forming…" with a blurred orb that sharpens over time
  (`incubationView()` in the engine decides what may be shown). No ETA hint for unknown recipes. Stars never shown early.
- Reveal sequence: pill appears → suspense wobble → name → rarity → ★ (only if real) → Collect. Familiar pills ~0.3 s.
  New Legendary/Secret: longer timing, tinted backdrop, spark burst.
- Warm lab room backdrop (tiled wall, lamp glow, shelf of jars). Locked Machine slots restyled to match.

**Vault & Copier**
- Rarity outlines: Common stone, Rare muted blue, Epic soft violet, Legendary warm gold (soft glow), Secret opalescent.
  Star rules unchanged (Base = no star UI). Press feedback on cards.
- Copier is a little brass-and-ivory machine with a dial, a stamping window and a tray that fills pill by pill
  (`7 / 11`). One-screen setup: big preview, strip of every Known pill, quantity, total Gold + time, Start copying.
- Batch reveal: the batch lands in a wooden tray (all N pills visible); ★ copies get a badge and a "Lucky copy!" spotlight.

**Desk**
- Removed the odd top-down plant. Added a notepad, pencil and a mug with a handle and drifting steam.
- Natural walnut grain (SVG turbulence), breathing lamp light, deeper layered paper shadows, softer envelopes.
- Stamp "thud" and dispatch slide made more physical. Shipping rules untouched.
- Mail offers: big name, "3 mystery pills", sealed compartments, Price, an accurate stacked odds bar with legend,
  one plain sentence about what happens next, optional "Odds & contents" with the full table and star odds.
  Opening: a rattling crate whose lid flips off, then compartments flip over one by one.

**HQ**
- Office shows the company name, rank and **company worth in Gold** over the scene, and reflects upgrades:
  machines, copier (bigger with batch tiers, spinning gear with speed), scanner, briefcase (Sales), poster (PR),
  wall gauge (Incubators), secret door (BACKDOOR). Stats row: Gold, Milestones, Popularity.
- Larger spot-lit equipment art on upgrade cards.

**Tests:** +8 (`tests/v12.test.ts`) — 55 total passing.

## v1.1.1
- Mail offers arrive every 4–7 min (was 12–20), first after ~1 min, up to 4 on the desk; old saves pulled forward.
- Confidential orders pay 2.5× (was 1.6×) and show a Premium tag.

## v1.1 — Gameplay, UI & visual update
- Vault shows only owned pills, stacked by pill + exact star tier; shared PillCard; no star UI on Base pills.
- Desk: short orders, tap-the-paper APPROVED stamp, separate SHIP.
- HQ office scene, equipment cards, milestones. Lab and Notebook refresh. Generated sound effects.
- Fix: Sad/Angry engraved eyebrows were swapped.

## v1.0
- First playable version: 49-pill catalog, breeding Machine, Copier, Scanner, Desk orders/mail/news,
  HQ upgrades, BACKDOOR market, Notebook, autosave.
