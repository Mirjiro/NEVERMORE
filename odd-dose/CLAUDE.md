# ODD DOSE — project guide for Claude Code

Cozy discovery / collecting / business game about emotion pills. Vite + React 19 + TypeScript, no backend.
This folder is independent of the Next.js app at the repo root (that app's AGENTS.md rules do not apply here).

```bash
npm install && npm run dev   # play locally
npm test                     # vitest (engine + flow + render tests)
npm run build                # static site in dist/ (relative paths)
```

Keep `BUILD_STATUS.md` (what exists / what's next) and `CHANGELOG.md` (what changed) current in every session.

## Locked design rules — do NOT change without the owner's explicit approval

- **Catalog:** exactly 49 pills — 6 Common / 15 Rare / 20 Epic / 6 Legendary / 2 Secret. Names, rarities and the
  43 registered recipes in `src/data/pills.ts` are canonical. Love is Epic. The six Commons are the six Types.
- **Types** are computed from full recipe ancestry, never hand-written.
- **Breeding rules, in order:** registered recipe → identical parents copy themselves → different pills sharing a Type
  return one parent (configurable 50/50) → otherwise "No Reaction" (no timer). Order never matters.
  Parents are reserved, never consumed, and return on collect. Results are claimable once.
- **Stars:** Base / ★ / ★★ are rolled independently per produced pill; never by merging duplicates; independent of rarity.
  **UI rule:** Base pills show NO star UI at all. Stars appear only on specimens that have them.
- **Vault = what I own; Notebook = what I've discovered; Copier = what I can make.** Zero-stock pills leave the Vault
  but stay Known. Vault groups by `pillId + exact star`; never merge different star tiers.
- **No spoilers:** an undiscovered Machine result shows no name, art or star until it is collected.
- **Shipping:** check items → tap the paper to stamp APPROVED → separate SHIP. No stamp button, no stamp object, no drag.
  Stamping never changes game state; unchecking clears the stamp.
- **Currency is Gold**, shown as `1,250g` via `gold()` in `src/ui/components/common.tsx`. The save field is still `cash`
  (kept for save compatibility). Never show `$`.
- **No Charge.** Removed in v1.4 by the owner. Gold is the only spendable resource; old saves' Charge fields are dropped on load.
- **Economy (v1.5, owner-approved):** the Copier is FREE for every rarity — limited only by time and per-rarity batch
  size (`BALANCE.copier`). Gold comes from contracts and Vault Quick Sell (contracts pay ≥ 3× Quick Sell).
  Rushing (Machine or Copier) always costs ≥ 1.25× the instant sale value of what it finishes, so rush-and-sell
  can never mint Gold. Ordinary orders only ask for Known pills of rarities the level allows, or a one-step
  discovery within the level's limit (`knownRarityFromLevel` / `discoveryRarityFromLevel`); Confidential orders are the
  marked special commissions. No state may make earning Gold impossible (`tests/economy.test.ts`).
- Exactly four tabs: Desk, Lab, Vault, HQ. Notebook is a floating button, not a tab. BACKDOOR lives inside HQ.
- No new currencies, ingredients, catalysts, research steps, minigames or extra navigation tabs.
- Saves must stay compatible. `tests/fixtures/save-v1.0.json` is a real older save the tests load.

## Architecture

| Area | Path |
|---|---|
| All balance numbers | `src/config/balance.ts` (never hard-code gameplay constants in UI) |
| HQ upgrades | `src/config/upgrades.ts` |
| Catalog / content | `src/data/pills.ts`, `src/data/content.ts` |
| Final art registry | `src/data/pillArt.ts` + `public/pills/` (procedural placeholders in `PillArt.tsx` until then) |
| Engine (pure TS) | `src/engine/` — actions validate, then mutate a clone; throw `GameError` on invalid input |
| Store | `src/store/GameContext.tsx` (1 s real-time tick, autosave), `persistence.ts` (load/migrate/export) |
| UI | `src/ui/App.tsx`, `screens/` (Desk, Lab, Vault, HQ, Backdoor), `components/` (PillCard, PillArt, Notebook, RevealOverlay…) |
| Desk shipping flow | `src/ui/shipFlow.ts` (pure, tested) |
| Startup / sign-in | `src/ui/Gate.tsx` (splash → welcome/sign-in), `src/store/profiles.ts` (device-local players, one save slot per name) |
| Economy tests | `tests/economy.test.ts` — a no-cheats bot plays every stuck scenario on the real engine |
| Account sync | `src/store/cloud.ts` — on claude.ai, remembered player + saves in `data/users/<id>/` (publish with `capabilities: {db: {}, user: {}}`) |
| Sound | `src/ui/sfx.ts` (generated Web Audio, mute stored in localStorage) |
| Styles | `src/styles/app.css` (base) + `src/styles/v12.css` (v1.2 atmosphere layer, loaded last) |
| No-spoiler rule | `incubationView()` in `src/engine/game.ts` — UI must never read `job.resultPillId`/`resultStar` directly |

## Decisions log (settled — don't relitigate)

- Order text = short title from the main pill's Type + one sentence from the sender; pills live in the checklist only.
- Confidential orders pay `confidentialPayoutBonus` (2.5×) and carry a Premium tag.
- Quick Sell: common 2g, rare 18g, epic 88g, legendary 440g, secret 2400g; ★ ×5, ★★ ×30 (`BALANCE.quickSell`).
- Mail offers every 4–7 min, first after ~1 min, max 4 sealed on the desk.
- Shipping/selling/Machine always use the lowest qualifying star tier first.
- Familiar Machine results reveal quickly; new pills get the full sequence; new Legendary/Secret the biggest.
- Lab look: ivory + brass + amber, dark glass dome; interior light shifts teal → amber with progress.
- Rarity outlines: Common stone, Rare muted blue, Epic soft violet, Legendary warm gold, Secret opalescent.
- Deployment for playtesting: build `dist/` and publish it as the claude.ai artifact
  `https://claude.ai/artifact/KqtpoC2MMMPjNfGUNSKgvh` (end every reply about the game with this link).
