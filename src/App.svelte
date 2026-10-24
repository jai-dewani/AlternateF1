<script>
  import RaceNavigator      from './lib/components/RaceNavigator.svelte';
  import RaceResultTable    from './lib/components/RaceResultTable.svelte';
  import StandingsTable     from './lib/components/StandingsTable.svelte';
  import PointsLineChart    from './lib/components/PointsLineChart.svelte';
  import BumpChart          from './lib/components/BumpChart.svelte';
  import LeadChangeBanner   from './lib/components/LeadChangeBanner.svelte';
  import PodiumShareModal   from './lib/components/PodiumShareModal.svelte';
  import CommunityPolls     from './lib/components/CommunityPolls.svelte';

  // ── State ───────────────────────────────────────────────────────────────────
  let season        = $state(null);
  let loading       = $state(true);
  let fetchError    = $state(null);
  let selectedRound = $state(1);
  let activeMode    = $state('f1_5');   // 'f1_5' (default) | 'no_antonelli'
  let showWhatIf    = $state(true);
  let activeTab     = $state('race');   // 'race' | 'sprint'
  let activeChart   = $state('line');   // 'line' | 'bump'
  let isPodiumOpen  = $state(false);

  const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];

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

  // ── Normalize rounds for active mode ─────────────────────────────────────────
  let modeRounds = $derived.by(() => {
    if (!season) return [];
    return season.rounds.map((r) => {
      const modeData = r[activeMode] || {};
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
    if (activeMode === 'f1_5') {
      return season.drivers.filter((d) => !TOP_TEAMS.includes(d.constructorId));
    }
    return season.drivers;
  });

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
          <div class="title-row">
            <h1>
              {#if activeMode === 'f1_5'}
                FORMULA <span class="year">1.5</span>
              {:else}
                F1 <span class="year">{season.meta.season}</span>
              {/if}
            </h1>

            <!-- Mode Switcher -->
            <div class="mode-switcher" role="tablist" aria-label="Select Championship Mode">
              <button
                class:active={activeMode === 'f1_5'}
                onclick={() => { activeMode = 'f1_5'; }}
                role="tab"
                aria-selected={activeMode === 'f1_5'}
              >
                🏆 Formula 1.5
              </button>
              <button
                class:active={activeMode === 'no_antonelli'}
                onclick={() => { activeMode = 'no_antonelli'; }}
                role="tab"
                aria-selected={activeMode === 'no_antonelli'}
              >
                🔮 No Antonelli
              </button>
            </div>
          </div>

          <p class="subtitle">
            {#if activeMode === 'f1_5'}
              The 2026 Midfield World Championship <span class="rule-hint">(Excluding Red Bull, McLaren, Ferrari & Mercedes)</span>
            {:else}
              What If <span class="removed">Antonelli</span> Never Raced in 2026?
            {/if}
          </p>
        </div>

        <div class="header-actions">
          <button class="share-trigger-btn" onclick={() => { isPodiumOpen = true; }}>
            <span>🏁</span> Pick Podium & Share to 𝕏
          </button>
          <p class="updated">
            Updated {new Date(season.meta.generatedAt).toLocaleDateString('en-GB',
              { day: 'numeric', month: 'short', year: 'numeric' })}
            · {season.meta.completedRounds}/{season.meta.totalRounds} rounds
          </p>
        </div>
      </div>
    </header>

    <main>

      <!-- ── Race Navigator ── -->
      <section>
        <RaceNavigator
          rounds={modeRounds}
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
            {showWhatIf ? (activeMode === 'f1_5' ? '🏆 F1.5 Re-scored' : '🔮 What-If Antonelli') : '📊 Official 2026'}
          </span>
        </label>
        <span class="toggle-hint">
          {#if activeMode === 'f1_5'}
            Top 4 teams removed · Midfield P1 receives 25 pts, P2 gets 18 pts
          {:else}
            Antonelli removed · everyone behind him moves up one place
          {/if}
        </span>
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
              isF15={activeMode === 'f1_5'}
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
          >Points Over Season ({activeMode === 'f1_5' ? 'Midfield' : 'All'})</button>
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
            {showWhatIf}
            onRoundSelect={(r) => { selectedRound = r; }}
          />
        {:else}
          <BumpChart
            rounds={modeRounds}
            drivers={activeDrivers}
            {selectedRound}
            {showWhatIf}
            onRoundSelect={(r) => { selectedRound = r; }}
          />
        {/if}
      </div>

      <!-- ── Community Polls ── -->
      <CommunityPolls drivers={season.drivers} />

    </main>

    <!-- Podium Share Modal -->
    <PodiumShareModal
      isOpen={isPodiumOpen}
      onClose={() => { isPodiumOpen = false; }}
      drivers={season.drivers}
      calendar={season.calendar || []}
    />

    <footer>
      Formula 1.5 & What-If Championship Engine · Data from <a href="https://api.jolpi.ca" target="_blank" rel="noopener">Jolpica F1 API</a> · Built with Svelte 5 + Vite.
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
  .app { max-width: 1400px; margin: 0 auto; padding: 0 1rem 3rem; }

  header {
    padding: 1.5rem 0 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.25rem;
  }
  .header-inner {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  h1 { font-size: 2.2rem; font-weight: 900; letter-spacing: -.04em; line-height: 1; }
  .year { color: var(--accent-2); }
  .subtitle { font-size: 0.95rem; color: var(--text-muted); margin-top: .4rem; }
  .rule-hint { color: #aaaab8; font-size: 0.82rem; }
  .removed { color: var(--accent); font-weight: 600; }

  .mode-switcher {
    display: flex;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 3px;
  }
  .mode-switcher button {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-switcher button:hover { color: var(--text); }
  .mode-switcher button.active {
    background: #ff8000;
    color: #000;
    font-weight: 800;
  }

  .header-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .share-trigger-btn {
    background: linear-gradient(135deg, #1f1500, #2d1a00);
    border: 1.5px solid #ff8000;
    color: #fff;
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    transition: all 0.2s;
  }
  .share-trigger-btn:hover {
    background: #ff8000;
    color: #000;
  }
  .updated { font-size: .75rem; color: var(--text-muted); text-align: right; }

  main { display: flex; flex-direction: column; gap: 1rem; }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  @media (max-width: 820px) {
    .two-col { grid-template-columns: 1fr; }
    h1 { font-size: 1.8rem; }
    .header-actions { align-items: flex-start; }
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
    border-color: var(--accent-2);
    color: var(--text);
    background: color-mix(in srgb, var(--accent-2) 14%, transparent);
  }
  .toggle-hint { font-size: .75rem; color: var(--text-muted); }

  /* ── Chart card ──────────────────────────────────────────────────────────── */
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
    border-bottom-color: var(--accent-2);
    font-weight: 700;
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
