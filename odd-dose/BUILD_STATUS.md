# ODD DOSE — Build Status

_Last updated: end of session 1 (phases 1–5 first pass complete)._

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
