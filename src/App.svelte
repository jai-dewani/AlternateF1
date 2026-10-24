<script>
  import RaceNavigator      from './lib/components/RaceNavigator.svelte';
  import RaceResultTable    from './lib/components/RaceResultTable.svelte';
  import StandingsTable     from './lib/components/StandingsTable.svelte';
  import PointsLineChart    from './lib/components/PointsLineChart.svelte';
  import BumpChart          from './lib/components/BumpChart.svelte';
  import LeadChangeBanner   from './lib/components/LeadChangeBanner.svelte';
  import BeneficiariesPanel from './lib/components/BeneficiariesPanel.svelte';
  import SeasonScrubber     from './lib/components/SeasonScrubber.svelte';

  // ── State ───────────────────────────────────────────────────────────────────
  let season        = $state(null);
  let loading       = $state(true);
  let fetchError    = $state(null);
  let selectedRound = $state(1);
  let showWhatIf    = $state(true);
  let activeTab     = $state('race');   // 'race' | 'sprint'
  let activeChart   = $state('line');  // 'line' | 'bump'

  // ── Load data ───────────────────────────────────────────────────────────────
  async function loadSeason() {
    try {
      const res = await fetch('./data/season.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      season = data;
      selectedRound = data.rounds.length;  // default to latest round
    } catch (e) {
      fetchError = e.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => { loadSeason(); });

  // ── Derived ─────────────────────────────────────────────────────────────────
  let currentRound = $derived(season?.rounds[selectedRound - 1] ?? null);
  let prevRound    = $derived(selectedRound > 1 ? season?.rounds[selectedRound - 2] ?? null : null);

  let driversMap = $derived(
    season
      ? Object.fromEntries(season.drivers.map((d) => [d.id, d]))
      : {}
  );

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  function handleKey(e) {
    if (!season) return;
    if (e.key === 'ArrowLeft'  && selectedRound > 1)                   selectedRound--;
    if (e.key === 'ArrowRight' && selectedRound < season.rounds.length) selectedRound++;
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if loading}
  <div class="center-fill">
    <div class="spinner"></div>
    <p>Loading season data…</p>
  </div>

{:else if fetchError}
  <div class="center-fill error">
    <p>⚠️ Could not load season data</p>
    <code>{fetchError}</code>
    <p class="hint">Run <code>npm run refresh</code> to generate <code>public/data/season.json</code></p>
  </div>

{:else if season}
  <div class="app">

    <!-- ── Header ── -->
    <header>
      <div class="header-inner">
        <div>
          <h1>F1 <span class="year">{season.meta.season}</span></h1>
          <p class="subtitle">What If <span class="removed">Antonelli</span> Never Raced?</p>
        </div>
        <p class="updated">
          Updated {new Date(season.meta.generatedAt).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'short', year: 'numeric' })}
          · {season.meta.completedRounds}/{season.meta.totalRounds} rounds
        </p>
      </div>
    </header>

    <main>

      <!-- ── Race Navigator ── -->
      <section>
        <RaceNavigator
          rounds={season.rounds}
          {selectedRound}
          onSelect={(r) => { selectedRound = r; }}
        />
      </section>

      <!-- ── Lead-change banner ── -->
      {#if currentRound?.whatIfLeaderChanged}
        <LeadChangeBanner
          newLeader={driversMap[currentRound.whatIfLeader]}
          prevLeader={driversMap[currentRound.prevWhatIfLeader]}
        />
      {/if}

      <!-- ── Toggle ── -->
      <div class="toggle-row">
        <label class="toggle">
          <input type="checkbox" bind:checked={showWhatIf} />
          <span class="pill" class:active={showWhatIf}>
            {showWhatIf ? '🔮 What-If' : '📊 Real 2026'}
          </span>
        </label>
        {#if showWhatIf}
          <span class="toggle-hint">Antonelli removed · everyone behind him moves up one place</span>
        {/if}
      </div>

      <!-- ── Race result + Standings ── -->
      <div class="two-col">
        <div class="card">
          {#if currentRound}
            <RaceResultTable
              round={currentRound}
              {driversMap}
              {showWhatIf}
              {activeTab}
              onTabChange={(t) => { activeTab = t; }}
            />
          {/if}
        </div>
        <div class="card">
          {#if currentRound}
            <StandingsTable
              round={currentRound}
              {prevRound}
              {driversMap}
              {showWhatIf}
            />
          {/if}
        </div>
      </div>

      <!-- ── Charts ── -->
      <div class="card chart-card">
        <div class="chart-tabs">
          <button
            class:active={activeChart === 'line'}
            onclick={() => { activeChart = 'line'; }}
          >Points Over Season</button>
          <button
            class:active={activeChart === 'bump'}
            onclick={() => { activeChart = 'bump'; }}
          >Championship Positions</button>
        </div>

        {#if activeChart === 'line'}
          <PointsLineChart
            rounds={season.rounds}
            drivers={season.drivers}
            {selectedRound}
            {showWhatIf}
            onRoundSelect={(r) => { selectedRound = r; }}
          />
        {:else}
          <BumpChart
            rounds={season.rounds}
            drivers={season.drivers}
            {selectedRound}
            {showWhatIf}
            onRoundSelect={(r) => { selectedRound = r; }}
          />
        {/if}
      </div>

      <!-- ── Beneficiaries + Scrubber ── -->
      <div class="two-col">
        <BeneficiariesPanel
          beneficiaries={season.beneficiaries}
          {driversMap}
        />
        <SeasonScrubber
          totalRounds={season.rounds.length}
          {selectedRound}
          onSelect={(r) => { selectedRound = r; }}
        />
      </div>

    </main>

    <footer>
      Data from <a href="https://api.jolpi.ca" target="_blank" rel="noopener">Jolpica F1 API</a>.
      Built with Svelte 5 + Vite.
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
    --accent-2:     #ff8c00;
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
  .app { max-width: 1400px; margin: 0 auto; padding: 0 1rem 3rem; }

  header {
    padding: 1.75rem 0 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
  }
  .header-inner {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  h1 { font-size: 2.4rem; font-weight: 900; letter-spacing: -.04em; line-height: 1; }
  .year { color: var(--accent); }
  .subtitle { font-size: 1rem; color: var(--text-muted); margin-top: .35rem; }
  .removed { color: var(--accent); font-weight: 600; }
  .updated { font-size: .75rem; color: var(--text-muted); text-align: right; flex-shrink: 0; }

  main { display: flex; flex-direction: column; gap: 1rem; }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  @media (max-width: 768px) {
    .two-col { grid-template-columns: 1fr; }
    h1 { font-size: 1.8rem; }
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  /* ── Toggle ─────────────────────────────────────────────────────────────── */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .toggle { display: flex; align-items: center; cursor: pointer; }
  .toggle input { display: none; }
  .pill {
    padding: .35em .9em;
    border-radius: 999px;
    border: 1.5px solid var(--border);
    font-size: .85rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: all .2s;
    user-select: none;
  }
  .pill.active {
    border-color: var(--accent);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .toggle-hint { font-size: .75rem; color: var(--text-muted); }

  /* ── Chart card ──────────────────────────────────────────────────────────── */
  .chart-card { }

  .chart-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
  }
  .chart-tabs button {
    padding: .7rem 1.4rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    font-size: .875rem;
    cursor: pointer;
    transition: color .15s;
    margin-bottom: -1px;
  }
  .chart-tabs button:hover { color: var(--text); }
  .chart-tabs button.active {
    color: var(--text);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  /* ── Footer ──────────────────────────────────────────────────────────────── */
  footer {
    padding: 1.5rem 0;
    border-top: 1px solid var(--border);
    text-align: center;
    font-size: .75rem;
    color: var(--text-muted);
    margin-top: 1rem;
  }
</style>
