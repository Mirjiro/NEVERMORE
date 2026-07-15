# NEVERMORE — Pull Prototype

Client-only prototype of the NEVERMORE Classic Pack pull loop: spend Gold, open a pack, watch the card flip and reveal with rarity-appropriate visual weight. No backend, no auth, no persistence — everything lives in React state for the current browser session (refresh resets it).

Built per `NEVERMORE Prototype Spec v0.1` (Vampire Origin scope, Classic Pack only).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Framer Motion (flip / particles / screen-flash)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. To test on your phone, use the "Network" URL Next.js prints in the terminal (same Wi-Fi), or deploy to Vercel (below) and open the deployed URL on your phone.

## Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. Go to [vercel.com/new](https://vercel.com/new), import the repo — Vercel auto-detects Next.js, no config needed.
3. Deploy. Open the given `*.vercel.app` URL on your phone.

Or via CLI:

```bash
npm i -g vercel
vercel
```

## What's implemented

- Gold balance (starts at 100,000), 5,000 Gold per Classic Pack
- Origin roll (Royal 30% / Werewolf 25% / Mage 20% / Fae 15% / Vampire 8% / Demon 1% / Angel 1%)
- Slot 1 card roll (Common 60% / Rare 30% / Epic 9% / Legendary 1%), 2 possible names per Origin/rarity cell
- Slot 2 roll (Card 50% / Seed 30% / Gold 15% / Diamonds 3% / Origin Card Pack 1.5% / Creature 0.5%)
- Free Pack inventory from Origin Card Pack drops, openable without spending Gold
- Rarity visual treatments: gray/blue/purple/gold borders, shimmer, pulsing glow, particle bursts, gold screen-edge flash on Legendary (Mythic/Forbidden treatments are implemented in `src/lib/rarityStyles.ts` for future packs, but unreachable from Classic Pack odds)
- Seed/Diamond/Creature pulls register as simple inventory counts only — no Farm/Den/Creature systems yet (explicitly out of scope tonight)

## Not in scope (see spec)

Server-authoritative pulls, full card/creature/seed systems, Den/Market/Origin scoring, Elite Pack, accounts/persistence.
