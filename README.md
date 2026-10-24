# AlternateF1: Formula 1.5 & What-If Championships

A static web app built with Svelte 5 + Vite that simulates alternate Formula 1 championship realities:
- 🏎️ **Formula 1.5 (Default):** The Midfield Championship excluding the Big 4 (Red Bull, McLaren, Ferrari, Mercedes). Features both Drivers' & Constructors' Championships!
- 🔮 **No Antonelli:** Re-scored championship as if Kimi Antonelli had never entered.
- 🏆 **Podium Image Card Generator:** Pick your P1, P2, P3 midfield podium for the upcoming Grand Prix, generate a 1200x675 HD podium graphic, and share it directly to 𝕏 with one click.
- ⚡ **Community Fan Polls:** Live voting powered by Appwrite Cloud ("The Golden Ticket" & "The Robbed by Rocket Ships Award").

**Live Site:** [https://jai-dewani.github.io/AlternateF1/](https://jai-dewani.github.io/AlternateF1/)

---

## Quick Start

```bash
npm install
npm run dev       # Start local dev server at http://localhost:5173/AlternateF1/
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run refresh` | Fetch latest Jolpica F1 API results & re-score seasons |

## Appwrite Community Voting Setup

Community voting works in local-storage demo mode out of the box. To enable live real-time sync across all users:
👉 Follow the 2-minute setup guide in [`APPWRITE_SETUP.md`](APPWRITE_SETUP.md).

## GitHub Pages Deployment

Deployments are automated via GitHub Actions on every push to `main`:
1. In your GitHub repository: **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` — the workflow builds and publishes the site to `https://jai-dewani.github.io/AlternateF1/`.
