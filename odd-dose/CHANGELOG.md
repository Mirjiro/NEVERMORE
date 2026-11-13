# ODD DOSE — Changelog

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
