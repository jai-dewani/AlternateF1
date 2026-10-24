# F1 2026: What If Antonelli Never Raced?

A static web app that recomputes the 2026 F1 Drivers' Championship as if Kimi Antonelli had never entered. Built with Svelte 5 + Vite, data from the Jolpica F1 API.

**Live site:** https://jai-dewani.github.io/alt-f1/ *(set your own URL here)*

---

## Quick start

```bash
npm install
npm run refresh   # fetch 2026 data & generate public/data/season.json
npm run dev       # start dev server at http://localhost:5173
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run fetch` | Fetch raw data from Jolpica API → `data/raw/` |
| `npm run compute` | Build `public/data/season.json` from cached raw data |
| `npm run refresh` | Fetch + compute (both above) |
| `npm test` | Run engine unit tests with Vitest |

## Refreshing data after a race

```bash
npm run refresh
git add public/data/season.json data/raw/
git commit -m "chore: refresh data after RX"
git push
```

The GitHub Actions deploy workflow triggers automatically on push to `main`.

## Manual GitHub Actions trigger

Go to **Actions → Refresh F1 Data → Run workflow** in your repo.

## GitHub Pages deploy

1. Set `base` in `vite.config.js` to `'/<repo-name>/'`
2. In repo Settings → Pages, set source to **GitHub Actions**
3. Push to `main` — the deploy workflow handles the rest

## Running tests

```bash
npm test
```

The sanity test (`tests/sanity.test.js`) is skipped until `data/raw/` exists. Run `npm run fetch` first.

## Troubleshooting

| Problem | Fix |
|---|---|
| `HTTP 404` on `season.json` | Run `npm run refresh` |
| Jolpica API timeout | Retry later; last good JSON stays live |
| Build fails on Svelte | Ensure Node ≥ 18 and `npm install` completed |
| Base-path 404 on GitHub Pages | Set `base` in `vite.config.js` to `'/<repo-name>/'` |

## Architecture

```
scripts/         Node data pipeline (fetch + compute)
src/
  lib/
    engine.js    Pure scoring engine (shared browser + Node)
    teamColors.js Team colour palette + flag emoji
    components/  Svelte UI components
  App.svelte     Root component (all state lives here)
public/data/     Generated season.json (committed by CI)
config/          scoring.json — points scales & removed driver
tests/           Vitest engine + sanity tests
.github/         refresh-data.yml + deploy.yml workflows
```
