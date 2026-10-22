# F1 2026: What If Antonelli Never Raced? Implementation Plan

## 1. Project Summary

A static web app, hosted on GitHub Pages (jai-dewani.github.io), that recomputes the 2026 F1 Drivers' Championship as if Kimi Antonelli had never entered. Every race and sprint is re-scored after removing him: everyone classified below him moves up one position and receives the points of their new position. The main goal is to show how the championship would have progressed after each Grand Prix weekend, not only the final table.

## 2. Core Rules of the Counterfactual

- For each race, take the official classification and remove Antonelli.
- Every driver who finished behind him moves up one place. Drivers ahead of him keep their position.
- Re-award points by new position using the standard scale: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 for positions 1 to 10.
- Sprints are included. Sprint scale: 8, 7, 6, 5, 4, 3, 2, 1 for positions 1 to 8. Re-score them the same way.
- Fastest lap point: not awarded in the current regulations, so ignore it. Verify against the 2026 rules before building.
- Disqualifications and non-finishers: use the official classified order (including DNFs listed at the bottom), since only classified positions score. Drivers who did not score cannot gain points unless they move into the top 10 or top 8.
- Edge case: if Antonelli did not finish a race, removing him changes nothing for that race. The engine handles this naturally because nobody is below him in the scoring places.
- Edge case: mid-season driver changes and shared seats. Key everything by driver ID, not by car number.
- Cumulative totals after each round include that round's race plus its sprint, if any.

## 3. Data Source and Data Model

### Source

Jolpica F1 API (the Ergast successor): free, no API key, supports browser requests. Endpoints needed:

- Race results per round for the 2026 season
- Sprint results per round
- Race calendar (round number, name, circuit, country, date)
- Official driver standings per round (for the real-vs-what-if comparison and for validating my engine)

Verify the 2026 season is served under the current season path before building. Be polite with rate limits: fetch once per run and cache.

### Generated data file

One JSON file, data/season.json, produced by the script. Suggested shape:

- meta: season, generatedAt, lastRoundIncluded, removedDriverId
- drivers: list with id, code, full name, constructor, team color
- rounds: array, one per Grand Prix, each containing:
  - round number, name, country, date, hasSprint
  - real race result (position, driverId, points)
  - what-if race result (new position, driverId, points)
  - real and what-if sprint results, if any
  - cumulative standings after this round, both real and what-if (position, driverId, points)
  - leader real, leader what-if, and a leadChanged flag
  - positionsGained per driver versus the previous round

Precomputing everything into the file keeps the front end trivial. The front end only reads and renders.

## 4. Architecture

- Fetch and compute script: Node.js (or Python), run locally and in CI. Output is data/season.json.
- Scoring engine: a small pure function that takes a classification and a points scale and returns a re-scored list. Keep it separate from the fetching code so it can be unit tested.
- Front end: static site. Recommended stack is plain JavaScript with Vite, or Svelte for state handling. Charts via D3 (best for the bump chart) or Chart.js (faster for line charts). A reasonable split is Chart.js for the line chart and D3 for the bump chart.
- Hosting: GitHub Pages, deployed from the main branch or via a GitHub Actions deploy workflow.

### Sample Project File Tree

A suggested layout. Names are a starting point, not a contract.

- README.md: how to run, build, and manually refresh data
- package.json, vite.config.js (sets the base path for GitHub Pages), svelte.config.js, index.html
- .github/workflows/refresh-data.yml: scheduled and manual data refresh
- .github/workflows/deploy.yml: build and publish to GitHub Pages
- config/scoring.json: race and sprint points scales, and the removed driver id
- scripts/fetch-results.js: pulls calendar, races, and sprints from Jolpica
- scripts/build-season.js: runs the engine and writes season.json
- scripts/refresh.js: one command that does both
- src/main.js: mounts the app
- src/App.svelte: root component with state and layout
- src/lib/engine.js: pure scoring engine, shared with the scripts
- src/lib/standings.js: cumulative totals, tie-breaks, and lead changes
- src/lib/state.svelte.js: shared reactive state, if needed
- src/lib/teamColors.js: team and driver colors
- src/lib/components/: RaceNavigator, LeadChangeBanner, RaceResultTable, StandingsTable, PointsLineChart, BumpChart, BeneficiariesPanel, SeasonScrubber
- public/data/season.json: generated and committed by the Action
- tests/engine.test.js: Antonelli first, in the middle, outside the points, and not finishing
- tests/sanity.test.js: with nobody removed, totals equal the official standings

The key design point: engine.js and standings.js contain no Svelte code, so the Node scripts and the browser import the very same files.

## 5. Auto-Refresh Strategy

There are about six races left, so the site must update itself.

### Recommended: scheduled GitHub Action

- A workflow runs on a cron schedule, for example every Monday and Tuesday and also on manual dispatch.
- It runs the fetch and compute script, regenerates data/season.json, and commits only if the file changed.
- The commit triggers the Pages deployment, so the site updates with no action from you.
- Add a manual workflow\_dispatch trigger so you can force a refresh right after a race.
- The script should be idempotent: it always rebuilds the whole season from scratch, which avoids drift and partial-update bugs.
- If the API is down, the workflow fails and the last good JSON stays live.

### Optional: live fetch in the browser

- On page load, the front end can call Jolpica directly, run the same engine in JavaScript, and render.
- The computation is trivial: roughly 24 races times 20 drivers.
- Downsides: slower first paint, dependence on API uptime, and duplicating the engine in two languages unless the script is also JavaScript.
- If you do this, use the committed JSON as an instant first render and as the fallback, then refresh silently.
- Simplest path: write the engine in JavaScript once, import it in both the Node script and the browser.

Decision: start with the scheduled Action only, and add live fetch later only if it feels needed.

## 6. User Interface

### Layout

- Header: title, a short explanation of the rules, and a last-updated timestamp.
- Race navigator: current Grand Prix name, flag, circuit and date, with left and right arrow buttons. Keyboard left and right keys also work. A round dropdown or a clickable timeline of dots lets users jump to any race.
- Lead-change banner: when the selected round changed the championship leader in the what-if world, show a banner such as "Lead change: Russell takes over from Piastri".
- Panel A, race result: the what-if classification for that race, showing new position, driver, points earned, and a small tag showing how many places the driver moved up versus the real result. Include a toggle to show the real result side by side. Sprint results appear as a second tab or section when the weekend had one.
- Panel B, standings after this round: cumulative what-if points per driver, ordered by points, with a position change arrow versus the previous round and the gap to the leader.
- Panel C, charts: described below.

### Visualisations

1. Championship points line chart. One line per driver across rounds, using team colors. A vertical marker follows the selected round. Hovering shows driver and points. Optional toggle for gap to leader instead of raw points.
2. Bump chart. Driver rank per round, with lines crossing as positions change. This is the strongest view for seeing who really benefits. Clicking a round jumps to it.
3. Real versus what-if comparison. A toggle that overlays the real standings as dashed lines, or shows a delta column: points gained, and positions gained, per driver.
4. Biggest beneficiaries panel. A ranked list showing which drivers gain the most points and positions across the season because of Antonelli's absence.
5. Season scrubber. A slider or play button that animates through the rounds, with the standings table reordering smoothly. Good for screen recordings and social posts.

### Highlighting championship lead changes

All computed automatically from the data:

- Vertical dashed markers on the line chart at each round where the leader differs from the previous round, with a short label naming the new leader.
- Thicker line or a small crown marker on the leader's line at each round where they top the table.
- On the bump chart, shade the top row in the current leader's team color so reigns are visible.
- The banner in the race view, described above.
- A gap-to-leader mini chart where a flip appears as a line crossing zero.

### Design and responsiveness

- Mobile first. Charts should be readable on a phone, with horizontal scrolling or simplified legends if needed.
- Team colors for lines, with a colorblind-safe fallback using line styles.
- Dark mode by default, since F1 sites tend to use it.
- Accessible labels, keyboard navigation, and a text summary of the key findings.

## 7. Implementation Phases

1. Setup: create the repo, choose the stack, set up Vite and GitHub Pages deployment.
2. Data fetch: write the script to pull calendar, race results, and sprint results from Jolpica and cache them locally.
3. Engine: implement the removal and re-scoring function, with unit tests. Validate by running it with no driver removed and checking that cumulative totals match the official standings after each round.
4. Generate season.json with real and what-if data for every completed round.
5. Front end skeleton: race navigator, result table, standings table.
6. Charts: line chart first, then bump chart, then the real-versus-what-if overlay.
7. Lead-change highlighting and the beneficiaries panel.
8. Polish: animation, mobile layout, dark mode, accessibility.
9. Automation: add the scheduled GitHub Action and test it with a manual dispatch.
10. Launch: write a short blog post on jai-dewani.github.io and share it.

## 8. Testing and Validation

- Unit tests for the scoring engine: Antonelli finishing first, in the middle, outside the points, and not finishing.
- Sanity test: with nobody removed, engine totals must equal the official standings every round.
- Conservation checks: in a what-if race, the total points awarded equals the scale total for the number of classified drivers, and Antonelli's removal never reduces anyone's points.
- Snapshot test of season.json against a hand-checked round.
- Manual check of one round against the real results.

## 9. Risks and Edge Cases

- API structure for 2026 may differ slightly or lag after a race. Add a retry and a clear failure message.
- Points scale or sprint rules may change. Keep scales in a config file.
- Driver replacements mid-season: key on driver ID.
- A race is cancelled or has a penalty applied after the fact. The full rebuild approach picks up corrected results on the next run.
- Ties on points: break by count of wins, then second places, as in the official rules, and apply the same logic to the what-if table.

## Manual Fallback and README

If the scheduled GitHub Action fails, you can refresh the data by hand. The repository README must document this clearly:

- Prerequisites: the Node version used by the project, and npm install.
- The single command that fetches results, runs the engine, and writes data/season.json.
- How to commit and push the result so the Pages deploy picks it up.
- How to trigger the workflow manually from the GitHub Actions tab with workflow\_dispatch.
- Common failure causes: the Jolpica API being down or slow, a changed response format, or a rate limit. Include what the error looks like and what to try next.
- How to run the engine tests, and the sanity check that totals match official standings with nobody removed.
- How to run the site locally, and how to build it.

The workflow itself should fail loudly, keep the last good season.json live, and ideally open a GitHub issue or send a notification email so you know to step in.

## 10. Stretch Ideas

- Let the user pick which driver to remove, turning this into a general what-if tool.
- Constructors' championship what-if.
- Shareable image export of the bump chart.
- Per-race "who benefited most" micro-summary text, generated from the data.

## 11. Open Questions

- Decided: the front end uses Svelte 5 with Vite. A separate Svelte guide explains the features used.
- Should the engine live in JavaScript only, so it can be shared between the script and the browser?
- Whether to add live browser fetch after the Action is working.
