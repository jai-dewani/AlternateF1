<script>
  import RaceNavigator      from './lib/components/RaceNavigator.svelte';
  import RaceResultTable    from './lib/components/RaceResultTable.svelte';
  import StandingsTable     from './lib/components/StandingsTable.svelte';
  import PointsLineChart    from './lib/components/PointsLineChart.svelte';
  import BumpChart          from './lib/components/BumpChart.svelte';
  import PodiumHero         from './lib/components/PodiumHero.svelte';
  import CommunityPolls     from './lib/components/CommunityPolls.svelte';
  import DriverStatsView    from './lib/components/DriverStatsView.svelte';

  // ── State ───────────────────────────────────────────────────────────────────
  let season        = $state(null);
  let loading       = $state(true);
  let fetchError    = $state(null);
  let selectedRound = $state(1);

  // Active page tab: 'home' | 'standings' | 'stats' | 'results'
  let activePage    = $state('home');

  let activeTab     = $state('race');   // 'race' | 'sprint' (for results)
  let activeChart   = $state('line');   // 'line' | 'bump' (for standings)

  const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];

  // ── Load data ───────────────────────────────────────────────────────────────
  async function loadSeason() {
    try {
      const res = await fetch('./data/season.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      season = data;
      selectedRound = data.rounds.length;  // default to latest completed round
    } catch (e) {
      fetchError = e.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => { loadSeason(); });

  // ── Always normalize rounds for F1.5 mode ───────────────────────────────────
  let modeRounds = $derived.by(() => {
    if (!season) return [];
    return season.rounds.map((r) => {
      const modeData = r.f1_5 || {};
      return {
        ...r,
        whatIfRace: modeData.whatIfRace || r.whatIfRace || [],
        whatIfSprint: modeData.whatIfSprint || r.whatIfSprint || [],
        whatIfStandings: modeData.whatIfStandings || r.whatIfStandings || [],
        constructorStandings: modeData.constructorStandings || [],
        whatIfLeader: modeData.whatIfLeader || r.whatIfLeader,
        whatIfLeaderChanged: modeData.whatIfLeaderChanged ?? r.whatIfLeaderChanged,
        prevWhatIfLeader: modeData.prevWhatIfLeader ?? r.prevWhatIfLeader,
      };
    });
  });

  let currentRound = $derived(modeRounds[selectedRound - 1] ?? null);
  let prevRound    = $derived(selectedRound > 1 ? modeRounds[selectedRound - 2] ?? null : null);

  let activeDrivers = $derived.by(() => {
    if (!season) return [];
    return season.drivers.filter((d) => !TOP_TEAMS.includes(d.constructorId));
  });

  let driversMap = $derived(
    season
      ? Object.fromEntries(season.drivers.map((d) => [d.id, d]))
      : {}
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  function handleKey(e) {
    if (!season) return;
    if (activePage === 'results' || activePage === 'standings') {
      if (e.key === 'ArrowLeft'  && selectedRound > 1)                   selectedRound--;
      if (e.key === 'ArrowRight' && selectedRound < season.rounds.length) selectedRound++;
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if loading}
  <div class="center-fill">
    <div class="spinner"></div>
    <p>Loading Formula 1.5 season data…</p>
  </div>

{:else if fetchError}
  <div class="center-fill error">
    <p>⚠️ Could not load season data</p>
    <code>{fetchError}</code>
    <p class="hint">Run <code>npm run refresh</code> to generate <code>public/data/season.json</code></p>
  </div>

{:else if season}
  <div class="app">

    <!-- ── F1-Style Global Navigation Bar ── -->
    <nav class="f1-navbar" aria-label="Main Navigation">
      <div class="f1-nav-inner">
        <!-- Brand Logo -->
        <button class="nav-brand" onclick={() => { activePage = 'home'; }} aria-label="Formula 1.5 Home">
          <svg class="f1-logo-svg" viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 24L12 0H38L26 24H0Z" fill="#E10600"/>
            <path d="M30 24L42 0H52L40 24H30Z" fill="#E10600"/>
            <path d="M46 12L52 0H96L92 8H62L58 16H84L80 24H40L46 12Z" fill="#E10600"/>
          </svg>
          <span class="brand-text">1.5</span>
        </button>

        <!-- Navigation Tabs with F1-style speed stripes -->
        <div class="nav-tabs">
          <!-- Home Tab -->
          <div class="nav-tab-wrapper">
            <div class="speed-stripes">
              <span class="stripe"></span>
              <span class="stripe"></span>
            </div>
            <button
              class="nav-tab-btn"
              class:active={activePage === 'home'}
              onclick={() => { activePage = 'home'; }}
            >
              Home
            </button>
          </div>

          <!-- Standings Tab -->
          <div class="nav-tab-wrapper">
            <div class="speed-stripes">
              <span class="stripe"></span>
              <span class="stripe"></span>
            </div>
            <button
              class="nav-tab-btn"
              class:active={activePage === 'standings'}
              onclick={() => { activePage = 'standings'; }}
            >
              Standings
            </button>
          </div>

          <!-- Stats Tab -->
          <div class="nav-tab-wrapper">
            <div class="speed-stripes">
              <span class="stripe"></span>
              <span class="stripe"></span>
            </div>
            <button
              class="nav-tab-btn"
              class:active={activePage === 'stats'}
              onclick={() => { activePage = 'stats'; }}
            >
              Stats
            </button>
          </div>

          <!-- Results Tab -->
          <div class="nav-tab-wrapper">
            <div class="speed-stripes">
              <span class="stripe"></span>
              <span class="stripe"></span>
            </div>
            <button
              class="nav-tab-btn"
              class:active={activePage === 'results'}
              onclick={() => { activePage = 'results'; }}
            >
              Results
            </button>
          </div>
        </div>

        <!-- Meta status badge on far right -->
        <div class="nav-meta">
          <span class="season-badge">{season.meta.season} Season</span>
          <span class="round-counter">{season.meta.completedRounds}/{season.meta.totalRounds} Rds</span>
        </div>
      </div>
    </nav>

    <!-- ── Header Info ── -->
    <header class="app-subhead">
      <div class="title-row">
        <div>
          <h1>FORMULA <span class="year">1.5</span></h1>
          <p class="subtitle">
            The Midfield World Championship <span class="rule-hint">(Excluding Red Bull, McLaren, Ferrari & Mercedes)</span>
          </p>
        </div>

        <div class="header-status">
          <p class="updated">
            Updated {new Date(season.meta.generatedAt).toLocaleDateString('en-GB',
              { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
    </header>

    <main>
      <!-- ── Tab 1: Home (Actionable Features: Podium Predictor & Community Polls) ── -->
      {#if activePage === 'home'}
        <div class="page-view home-view">
          <!-- Hero: Podium Predictor Widget -->
          <PodiumHero drivers={season.drivers} calendar={season.calendar || []} />

          <!-- Community Polls Widget -->
          <CommunityPolls drivers={season.drivers} />
        </div>

      <!-- ── Tab 2: Standings (Drivers & Constructors Standings + Progression Charts) ── -->
      {:else if activePage === 'standings'}
        <div class="page-view standings-view">
          <div class="section-banner">
            <div>
              <h2>Championship Standings & Trajectory</h2>
              <p class="banner-desc">Points and positions re-scored for midfield competitors only.</p>
            </div>
          </div>

          <!-- Standings Table (Drivers & Constructors) -->
          <div class="card">
            {#if currentRound}
              <StandingsTable
                round={currentRound}
                {prevRound}
                {driversMap}
                showWhatIf={true}
                isF15={true}
              />
            {/if}
          </div>

          <!-- Championship Charts (Points Progression & Bump Chart) -->
          <div class="card chart-card">
            <div class="chart-tabs">
              <button
                class:active={activeChart === 'line'}
                onclick={() => { activeChart = 'line'; }}
              >Points Over Season (Midfield)</button>
              <button
                class:active={activeChart === 'bump'}
                onclick={() => { activeChart = 'bump'; }}
              >Championship Positions</button>
            </div>

            {#if activeChart === 'line'}
              <PointsLineChart
                rounds={modeRounds}
                drivers={activeDrivers}
                {selectedRound}
                showWhatIf={true}
                onRoundSelect={(r) => { selectedRound = r; }}
              />
            {:else}
              <BumpChart
                rounds={modeRounds}
                drivers={activeDrivers}
                {selectedRound}
                showWhatIf={true}
                onRoundSelect={(r) => { selectedRound = r; }}
              />
            {/if}
          </div>
        </div>

      <!-- ── Tab 3: Stats (Driver Performance Metrics, Rankings & Contenders) ── -->
      {:else if activePage === 'stats'}
        <div class="page-view stats-view">
          <DriverStatsView
            rounds={modeRounds}
            drivers={activeDrivers}
            {driversMap}
          />
        </div>

      <!-- ── Tab 4: Results (Race-by-Race Navigator & Finishing Orders) ── -->
      {:else if activePage === 'results'}
        <div class="page-view results-view">
          <!-- Round selector timeline & navigator -->
          <section>
            <RaceNavigator
              rounds={modeRounds}
              {selectedRound}
              {driversMap}
              onSelect={(r) => { selectedRound = r; }}
            />
          </section>

          <!-- Race / Sprint result table -->
          <div class="card">
            {#if currentRound}
              <RaceResultTable
                round={currentRound}
                {driversMap}
                showWhatIf={true}
                {activeTab}
                onTabChange={(t) => { activeTab = t; }}
              />
            {/if}
          </div>
        </div>
      {/if}
    </main>

    <footer>
      Formula 1.5 Championship Engine · Data from <a href="https://api.jolpi.ca" target="_blank" rel="noopener">Jolpica F1 API</a> · Built with Svelte 5 + Vite.
    </footer>

  </div>
{/if}

<style>
  /* ── Global resets & tokens ──────────────────────────────────────────────── */
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

  :global(:root) {
    --bg:           #0f0f11;
    --bg-card:      #18181d;
    --bg-hover:     #22222a;
    --border:       #2a2a35;
    --text:         #e8e8ec;
    --text-muted:   #7e7e95;
    --accent:       #e10600;
    --accent-2:     #ff8000;
    --green:        #3cb371;
    --red:          #e10600;
    --radius:       10px;
    --font:         'Inter', system-ui, -apple-system, sans-serif;
  }

  :global(body) {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  :global(a) { color: var(--accent-2); text-decoration: none; }
  :global(a:hover) { text-decoration: underline; }
  :global(button) { font-family: inherit; }

  /* ── Loading / Error ────────────────────────────────────────────────────── */
  .center-fill {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--text-muted);
  }
  .spinner {
    width: 40px; height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error { text-align: center; }
  .error code { background: var(--bg-card); padding: .2em .5em; border-radius: 4px; font-size: .85em; }
  .hint { font-size: .8rem; }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  .app {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem 3rem;
  }

  /* ── F1-Style Global Navigation Bar ── */
  .f1-navbar {
    background: #15151e;
    border-bottom: 1px solid #232330;
    margin: 0 -1rem 1.25rem;
    padding: 0 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .f1-nav-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 54px;
    gap: 1.5rem;
  }

  .nav-brand {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    padding: 0.3rem 0;
  }

  .f1-logo-svg {
    height: 22px;
    width: auto;
    display: block;
  }

  .brand-text {
    font-size: 1.35rem;
    font-weight: 900;
    font-style: italic;
    color: #fff;
    letter-spacing: -0.04em;
    line-height: 1;
  }

  /* ── Tabs Container ── */
  .nav-tabs {
    display: flex;
    align-items: center;
    height: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .nav-tabs::-webkit-scrollbar {
    display: none;
  }

  .nav-tab-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
  }

  /* Speed stripes in the background */
  .speed-stripes {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
    opacity: 0.35;
  }

  .speed-stripes .stripe {
    width: 22px;
    height: 32px;
    background: #252533;
    transform: skewX(-24deg);
    border-radius: 1px;
    transition: opacity 0.2s, background 0.2s;
  }

  .nav-tab-wrapper:hover .speed-stripes .stripe {
    background: #323244;
    opacity: 0.6;
  }

  .nav-tab-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    padding: 0 1.35rem;
    height: 100%;
    display: flex;
    align-items: center;
    position: relative;
    z-index: 1;
    transition: color 0.15s;
    white-space: nowrap;
  }

  .nav-tab-btn:hover {
    color: #ffffff;
  }

  .nav-tab-btn.active {
    color: #ffffff;
    font-weight: 800;
  }

  /* Active bottom red underline */
  .nav-tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0.8rem;
    right: 0.8rem;
    height: 3px;
    background: var(--accent);
    box-shadow: 0 0 10px rgba(225, 6, 0, 0.7);
    border-radius: 2px 2px 0 0;
  }

  .nav-meta {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
  }

  .season-badge {
    background: rgba(225, 6, 0, 0.15);
    color: #ff4742;
    border: 1px solid rgba(225, 6, 0, 0.3);
    font-size: 0.72rem;
    font-weight: 800;
    padding: 0.25rem 0.65rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .round-counter {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  /* ── Header Subhead ── */
  .app-subhead {
    padding: 0.75rem 0 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.25rem;
  }

  .title-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  h1 {
    font-size: 2.1rem;
    font-weight: 900;
    letter-spacing: -.04em;
    line-height: 1;
  }

  .year {
    color: var(--accent-2);
  }

  .subtitle {
    font-size: 0.92rem;
    color: var(--text-muted);
    margin-top: .4rem;
  }

  .rule-hint {
    color: #aaaab8;
    font-size: 0.82rem;
  }

  .header-status {
    text-align: right;
  }

  .updated {
    font-size: .75rem;
    color: var(--text-muted);
  }

  /* ── Main content view layouts ── */
  main {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .page-view {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: fadeIn 0.25s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .section-banner {
    background: linear-gradient(90deg, #181822 0%, #121216 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.9rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-banner h2 {
    font-size: 1.05rem;
    font-weight: 800;
    color: #fff;
  }

  .banner-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  /* ── Chart card ── */
  .chart-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
  }

  .chart-tabs button {
    padding: .75rem 1.4rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    font-size: .875rem;
    cursor: pointer;
    transition: color .15s;
    margin-bottom: -1px;
  }

  .chart-tabs button:hover {
    color: var(--text);
  }

  .chart-tabs button.active {
    color: var(--text);
    border-bottom-color: var(--accent-2);
    font-weight: 700;
  }

  /* ── Footer ── */
  footer {
    padding: 1.5rem 0;
    border-top: 1px solid var(--border);
    text-align: center;
    font-size: .75rem;
    color: var(--text-muted);
    margin-top: 2rem;
  }

  @media (max-width: 720px) {
    .f1-nav-inner {
      height: 48px;
    }
    .nav-tab-btn {
      padding: 0 0.9rem;
      font-size: 0.85rem;
    }
    .nav-meta {
      display: none;
    }
    h1 {
      font-size: 1.7rem;
    }
  }
</style>
