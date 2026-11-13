# ODD DOSE — Build Status

_Last updated: v1.2 — atmosphere, graphics & game feel complete (see the v1.2 section at the end). Change history: CHANGELOG.md._

## How to run

```bash
cd odd-dose
npm install
npm run dev        # local dev server
npm test           # engine test suite (vitest)
npm run build      # static build in dist/ (relative paths; works on any static host / itch.io)
```

## Architecture

| Area | Path | Notes |
|---|---|---|
| Balance config | `src/config/balance.ts` | **Every** tunable number (timers, costs, odds, star rates, market, levels). |
| Upgrades | `src/config/upgrades.ts` | HQ upgrade tiers, costs, level gates, effect formulas. |
| Pill catalog | `src/data/pills.ts` | 49 canonical pills, 43 recipes, colors, engraved faces. Types are **computed** from ancestry. |
| Flavor content | `src/data/content.ts` | Senders, order texts, newspapers, letters, mail offer templates. |
| Final art registry | `src/data/pillArt.ts` + `public/pills/` | Drop PNGs in, map them; procedural placeholders are used until then. |
| Engine | `src/engine/` | Pure TypeScript, no UI. `recipes.ts` (resolver), `game.ts` (all actions), `types.ts`, `random.ts`. |
| Store | `src/store/` | React context: clones state per action, real-time tick (1 s), localStorage autosave, export/import. |
| UI | `src/ui/` | `App.tsx` shell, `screens/` (Desk, Lab, Vault, HQ, Backdoor), `components/` (PillArt, Notebook, RevealOverlay, PillPicker). |
| Tests | `tests/engine.test.ts` | 29 tests covering the required checklist (see below). |

Engine rule: actions validate first, then mutate a **clone**; a failing action throws `GameError` and never touches the save.

## Implemented

**Phase 1 — Foundation** ✅
- 49 pills (6/15/20/6/2), 43 registered recipes, Type inheritance through full ancestry.
- Data-driven O(1) recipe resolver; breeding rules 1–6 (recipe → identical → shared Type 50/50 configurable → No Reaction; order-independent).
- Save data (localStorage, versioned, sanitized on load), export/import save codes, reset.
- Four screens + floating Notebook button (Notebook is not a tab).

**Phase 2 — Main gameplay** ✅
- Up to 3 independent Machines; Available / Working / Ready; real-timestamp incubation by result rarity; Cash speed-up with accurate price; zero Charge.
- Parents are reserved (not consumed) and return on collect; claim-once collection.
- Discovery reveal overlay (capsule opens, rays, NEW DISCOVERY stamp; stronger effect for Legendary/Secret). Unknown results stay `???` until opened.
- Vault: all 49 slots, anonymous placeholders for unknowns, detail sheet (art, rarity, Types, quantity, star breakdown, best star, recipe, discovery history).
- Copier: batch any Known pill, cost/time quote, independent per-pill star rolls, speed-up, runs alongside Machines. Happy ×11 = $55 / 3 min.
- Stars (Base/★/★★) rolled independently with configurable, rarity-overridable weights.

**Phase 3 — Desk** ✅
- Top-down walnut desk with paper folders, envelopes (wax seals), newspapers and letters; slide-in, tap-to-focus, slide-away animations.
- Orders arrive in real time (max 5 active, 24–72 h deadlines, capped offline catch-up), from 20 fictional senders incl. confidential/anonymous clients.
- Shipping: checklist (only tickable with unreserved inventory) → shipping sticker → SHIP → dispatch animation; pays once, consumes inventory, schedules a follow-up letter (sometimes a repeat order).
- Newspapers with ambient stories and genuine recipe rumors; discovery headlines for Epic+.
- Mail gacha: sealed offers with full disclosure (price, pulls, rarity odds, star odds, pool, identified or not); rolls use exactly the advertised weights; card-flip reveal.

**Phase 4 — Advanced systems** ✅
- Scanner (HQ unlock, $300): only ? specimens; $250 + 25 Charge; 35/30/20/15 identify/clue/transform/destroy shown before scanning.
- Charge: 100 max, +1 / 3 min from timestamps; only used by the Scanner.
- Notebook: Chart (49 slots, names hidden until Known, Types, recipes, progress) and Drafts (auto-collected from order files, newspapers, scanner, confidential requests, market chatter, documents).
- HQ: Cash, Company Value (with breakdown + history chart), Popularity (affects order rate and pay, gentle decay), Level (XP from shipping and discoveries), 8 upgrade lines.
- BACKDOOR (Level 5 + upgrade): rotating limited listings, buy/sell, live random-walk prices with supply/demand impact, FIRE list, trends, transaction history. Ask is always ≥115% of market and bid is 60%, so instant buy→sell always loses money (tested).

**Phase 5 — Polish (first pass)** ✅
- Distinct identities per section (walnut desk, brushed-metal lab, velvet vault, crisp HQ, dark BACKDOOR).
- Procedural "pharmaceutical realism" placeholder art: thick matte pressed tablets at a 3/4 angle with engraved faces, powder grain, rarity coatings/rims, star badges.
- Mobile-first layout verified at iPhone 13 size; desktop verified at 1280 px.

## Required tests — status

| # | Check | How verified |
|---|---|---|
| 1–2 | 49 unique pills; 6/15/20/6/2 | vitest |
| 3–4 | 43 recipes correct, order-independent | vitest (canon list copied from spec) |
| 5–6 | Identical → same; shared-Type never overrides a recipe | vitest (all 49×49 pairs) |
| 7, 9 | Machine returns parents, +1 pill, no Charge | vitest + browser playthrough |
| 8 | Timers survive close/reopen | vitest (serialize/reload) + browser reload |
| 10–11 | Copier quantity; Happy ×11 | vitest + browser (×2 → ×13) |
| 12 | Stars stored separately; rate ≈ 1.6% | vitest (13,200 copies) |
| 13–14 | Scanner rejects Known; costs + outcome odds | vitest (6,000 scans) + browser |
| 15 | Chart hides undiscovered names | browser (42 hidden, 0 leaked) |
| 16 | Drafts auto-collect | vitest (scanner clue) + browser |
| 17–18 | Shipping validates and pays exactly once | vitest + browser |
| 19 | Gacha matches displayed odds | vitest (50,000 pulls) |
| 20 | No BACKDOOR arbitrage | vitest (50 rotations, every listing) |
| 21 | Save survives refresh | vitest + browser |
| 22–24 | Mobile UI, all 4 screens playable, full new-player loop | Playwright playthrough on iPhone 13 viewport |

## Known gaps / next steps

- **Final art**: 49 PNGs still to be produced; registry is ready (`src/data/pillArt.ts`).
- **Optional mystery files** (small side puzzles on the Desk) are not built yet — spec marks them optional.
- **Balance pass**: all values are test values; needs real playtesting of early-game cash flow and Level 5 pacing.
- **Sound**: none yet.
- **Market**: future items (auctions, bidding, events) intentionally not built.
- Browser end-to-end checks are ad-hoc Playwright scripts, not yet committed as an automated suite.

---

## v1.1 — Gameplay, UI & visual update

**Save format unchanged** (still version 1). A real save produced by the v1.0 code is committed as
`tests/fixtures/save-v1.0.json` and is loaded by the test suite (cash, Known pills, star variants,
running Machine + Copier jobs, orders all preserved).

### Implemented
- **Vault = what I own.** Physical inventory only, grouped by `pillId + exact star` (`vaultStacks()` in the engine;
  specimen records untouched). Zero-stock pills leave the Vault but stay Known in the Notebook and in the Copier.
- **Reusable `PillCard`** (`src/ui/components/PillCard.tsx`): card / compact / mini variants used by the Vault,
  Copier, Machine picker, Scanner and Notebook. Base pills render **no** star UI; ★ / ★★ only on real starred specimens,
  with a subtle gold foil corner.
- **Pill detail**: large art, name (+stars), rarity, Types, quantity of that variant, flavor line; actions
  Use in Machine / Make more / Sell 1 (exact star tier); recipe strip; history under an expandable *Details*.
- **Copier workbench** inside the Vault with its own "What should we make?" picker of every Known pill.
- **Desk**: warmer wood, lamp light, plant, mug, pen, clips, sticky note, paper grain, paper-clipped folders.
  Orders are now a short title + one line + checklist + reward + due ("2 days").
- **Tap-to-stamp shipping** (`src/ui/shipFlow.ts`): check items → tap the paper → red, rough-edged APPROVED ink
  imprint at the tap point (with a thunk) → separate SHIP → dispatch slide + payout pop. No stamp object, no stamp button.
  Enter/Space on the focused paper is the keyboard equivalent. Unchecking clears the stamp.
- **HQ**: illustrated office that grows (window by time of day, sign, machines/copier/scanner/plant/secret door,
  shelf of best pills, milestone frames), rank title, Cash / Worth / Popularity hearts, Equipment cards with art,
  Milestones, and Reports + Settings (sound, save export/import, reset) tucked into expandable panels.
- **Lab**: heavier Machine (cap, vents, pipes, gauge, iris shutter, bubbles), drop-in insert animation, big timer,
  short verdicts ("Makes Bittersweet", "Something new?", "No reaction"). Reveal is quick for familiar pills,
  full for new ones, dramatic for new Legendary/Secret; tap to skip.
- **Notebook**: Chart as pill tiles (tap a Known tile for Types + recipe); Drafts as taped paper notes with
  one-line summaries that expand.
- **Sound**: generated Web Audio effects (`src/ui/sfx.ts`), mute in HQ → Settings; `prefers-reduced-motion` respected.
- Copy audit across all screens.

### v1.1 validation
`tests/v11.test.ts` (15 tests) + the original 29 = **44 passing**. Covers checklist items 1–9, 13–15, 17–20 and 24.
Browser playthrough on an iPhone-13 viewport verified: checkbox taps never stamp, paper tap stamps, keyboard stamp,
no stamp button exists, SHIP disabled until stamped, pays once, Vault drops shipped-out pills, "Use in Machine"
pre-fills a slot, starred stacks render separately, 0 px horizontal overflow on all four screens, no console errors.

### Remaining
- Final pill art (registry ready in `src/data/pillArt.ts`).
- HQ office art is CSS placeholder illustration.
- Browser checks are still ad-hoc Playwright scripts rather than a committed e2e suite.

---

## v1.2 — Atmosphere, graphics & game feel

Snapshot before this pass: git tag `odd-dose-v1.1.1-snapshot`. Full details in `CHANGELOG.md`.

### Done
- Gold currency display everywhere (`gold()`), no `$` left (enforced by a source-scan test).
- Lab redesign + no-spoiler incubation (`incubationView`) + staged discovery reveal.
- Vault rarity outlines; Copier device, one-screen setup, tray batch reveal with ★ spotlight.
- Desk: plant removed, stationery + steaming mug, walnut grain, deeper shadows, mystery-delivery mail offers + crate reveal.
- HQ: company worth in the scene, upgrades visible as objects, larger equipment art.
- Styles for this pass live in `src/styles/v12.css` (loaded after `app.css`).

### Verified
- `npm test`: 55 passing (engine, recipes, stamp flow, save fixture, Gold formatting, no-spoiler view,
  Copier counts + star stacks, rarity outline classes).
- Browser (iPhone 13 viewport): first-time mix shows only "Something is forming…" / "Something new is waiting"
  (no name in the Machine); known mix shows "Making Bittersweet"; stamp/ship flow unchanged (checkbox never stamps,
  paper tap + keyboard stamp, SHIP gated, pays once, no stamp button); Copier start → tray → batch reveal; mail open →
  crate reveal → queued level-up; "Use in Machine"; 0 px horizontal overflow on all tabs; no `$` on screen; no console errors.

### Next / known gaps
- Final pill PNGs and equipment art (placeholders are CSS/SVG; registries ready).
- Browser checks are scripts in a scratch folder, not yet a committed Playwright suite.

---

## v1.3 — Splash & sign-in
- Startup flow in `src/ui/Gate.tsx`: Splash → Welcome back (remembered) or Sign in → game.
- Profiles in `src/store/profiles.ts`; `GameProvider` now takes the player's `saveKey`.
- Verified in browser: login validation, old save inherited by first player (4,321g kept), remembered across reload,
  Switch player → fresh 600g save for a new name, one-tap back to the first player with progress intact, splash skip.
- v1.3.1: remembered player + saves now also stored in the viewer's claude.ai account (cross-device on claude.ai).
- Gap: outside claude.ai there is no account — device storage only.

---

## v1.4 — Economy correction
- Charge removed; Quick Sell (Vault); free Starter tray (`state.freeCopier`); order payout floor (1.6× Copier cost).
- Verified: 87 tests; browser run from an old 0g save with Charge data → no Charge shown, free tray → collect →
  quick sell 2 × Calm for 4g, order shows "Copier cost", no console errors.

---

## v1.5 — Critical economy fix
- Free Copier (time + batch-size limits), rush pricing floor, progression-aware orders, varied descriptions,
  save migration for the old Starter tray. Details in CHANGELOG.md.
- Verified: 92 tests; bot from 0g/no pills reaches ~2,200g and 14 shipments in 1 h, Level 6 in 3 h (a perfect,
  minute-by-minute player — tune `orders.payoutMult` / `orders.intervalMs` if progression feels too fast).
  Browser: recreated Level-3 38g save → tray batch migrated, Copier free, "Copier time" on orders, no errors.
- Known: orders already in an old save (e.g. the reported Ruin order) stay until they expire (no penalty).
