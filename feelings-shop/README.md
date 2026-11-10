# Feelings Shop

A cozy browser game where you run a little pharmacy that sells feelings as pills. Mix two base pills, serve customers, earn coins and XP, level up, and fill in the Feelings Book.

Plain HTML/CSS/JS, with no build step and no dependencies. It lives apart from the Next.js app in this repo.

## Play

Open `index.html` in a browser.

## Files

- `index.html`: the page
- `style.css`: the look (pills are drawn in CSS)
- `game.js`: the game logic (Web Audio sounds, localStorage auto-save)
- `data.js`: **all the content and tuning** (pills, recipes, prices, levels, upgrades, order lines, reactions). Edit this file to change the game.

## Publish to itch.io

```bash
cd feelings-shop && zip -r ../feelings-shop.zip index.html style.css game.js data.js
```

Upload the zip as an **HTML** project and tick "This file will be played in the browser". `index.html` is at the root of the zip, which is what itch.io expects.

## Debug helpers (browser console)

- `FeelingsShop.state` shows the live game state
- `FeelingsShop.give(coins, xp)` adds coins and/or XP
