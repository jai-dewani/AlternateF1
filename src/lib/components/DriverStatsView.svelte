<script>
  import { getDriverColor, getConstructorName, getConstructorColor } from '../teamColors.js';

  let { rounds = [], drivers = [], driversMap = {} } = $props();

  let searchQuery = $state('');
  let selectedConstructor = $state('all');
  let sortKey = $state('championshipPos');
  let sortAsc = $state(true);

  // Compute stats for every midfield driver
  let statsList = $derived.by(() => {
    if (!drivers.length || !rounds.length) return [];

    const stats = {};
    for (const d of drivers) {
      stats[d.id] = {
        driver: d,
        races: 0,
        wins: 0,
        podiums: 0,
        top5: 0,
        pointsFinishes: 0,
        totalPoints: 0,
        bestFinish: 99,
        positions: [],
        sprintWins: 0,
        sprintPoints: 0,
        championshipPos: 99,
      };
    }

    for (const r of rounds) {
      const race = r.whatIfRace || [];
      for (const entry of race) {
        if (stats[entry.driverId]) {
          const s = stats[entry.driverId];
          s.races++;
          s.positions.push(entry.position);
          if (entry.position === 1) s.wins++;
          if (entry.position <= 3) s.podiums++;
          if (entry.position <= 5) s.top5++;
          if (entry.points > 0) s.pointsFinishes++;
          if (entry.position < s.bestFinish) s.bestFinish = entry.position;
        }
      }

      const sprint = r.whatIfSprint || [];
      for (const entry of sprint) {
        if (stats[entry.driverId]) {
          const s = stats[entry.driverId];
          s.sprintPoints += (entry.points || 0);
          if (entry.position === 1) s.sprintWins++;
        }
      }
    }

    // Latest standings points & positions
    const latestRound = rounds[rounds.length - 1];
    const latestStandings = latestRound?.whatIfStandings || [];
    for (const s of latestStandings) {
      if (stats[s.driverId]) {
        stats[s.driverId].championshipPos = s.position;
        stats[s.driverId].totalPoints = s.points;
      }
    }

    for (const id in stats) {
      const s = stats[id];
      s.avgFinishNum = s.positions.length
        ? s.positions.reduce((a, b) => a + b, 0) / s.positions.length
        : 99;
      s.avgFinish = s.positions.length ? s.avgFinishNum.toFixed(1) : '—';
      s.bestFinishDisplay = s.bestFinish === 99 ? '—' : `P${s.bestFinish}`;
      s.winRate = s.races ? Math.round((s.wins / s.races) * 100) : 0;
      s.podiumRate = s.races ? Math.round((s.podiums / s.races) * 100) : 0;
      s.recentForm = s.positions.slice(-5);
    }

    return Object.values(stats);
  });

  // Unique constructors for dropdown
  let constructorOptions = $derived.by(() => {
    const set = new Set();
    for (const s of statsList) {
      if (s.driver.constructorId) set.add(s.driver.constructorId);
    }
    return Array.from(set).sort();
  });

  // Top 3 drivers for showcase cards
  let top3 = $derived.by(() => {
    return [...statsList]
      .sort((a, b) => a.championshipPos - b.championshipPos)
      .slice(0, 3);
  });

  // Season stat highlights
  let seasonHighlights = $derived.by(() => {
    if (!statsList.length) return null;
    const mostWins = [...statsList].sort((a, b) => b.wins - a.wins)[0];
    const mostPodiums = [...statsList].sort((a, b) => b.podiums - a.podiums)[0];
    const bestAvg = [...statsList].filter(s => s.races > 0).sort((a, b) => a.avgFinishNum - b.avgFinishNum)[0];
    const mostConsistent = [...statsList].sort((a, b) => b.top5 - a.top5)[0];

    return { mostWins, mostPodiums, bestAvg, mostConsistent };
  });

  // Filtered and sorted list
  let filteredStats = $derived.by(() => {
    let list = statsList;

    if (selectedConstructor !== 'all') {
      list = list.filter((s) => s.driver.constructorId === selectedConstructor);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) =>
        s.driver.name.toLowerCase().includes(q) ||
        (s.driver.code && s.driver.code.toLowerCase().includes(q)) ||
        (s.driver.constructor && s.driver.constructor.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      let valA, valB;
      if (sortKey === 'name') {
        valA = a.driver.name;
        valB = b.driver.name;
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortKey === 'avgFinish') {
        valA = a.avgFinishNum;
        valB = b.avgFinishNum;
      } else if (sortKey === 'bestFinish') {
        valA = a.bestFinish;
        valB = b.bestFinish;
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  });

  function handleSort(key, defaultAsc = false) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = defaultAsc;
    }
  }
</script>

<div class="stats-container">
  <!-- ── Top 3 Showcase Cards ── -->
  {#if top3.length === 3}
    <div class="showcase-section">
      <div class="section-title">
        <span class="pill-badge">CHAMPIONSHIP TOP 3</span>
        <h3>Formula 1.5 Title Contenders</h3>
      </div>
      <div class="podium-grid">
        {#each top3 as s, idx}
          {@const color = getDriverColor(s.driver)}
          {@const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : 'rank-3'}
          {@const rankLabel = idx === 0 ? '🥇 P1 LEADER' : idx === 1 ? '🥈 P2 CONTENDER' : '🥉 P3 PODIUM'}

          <div class="driver-card {rankClass}" style="--team-color: {color}">
            <div class="card-glow"></div>
            <div class="card-header">
              <span class="rank-tag">{rankLabel}</span>
              <span class="code">{s.driver.code}</span>
            </div>
            <div class="driver-profile">
              <div class="color-stripe" style="background: {color}"></div>
              <div>
                <h4 class="driver-title">{s.driver.name}</h4>
                <p class="team-title">{s.driver.constructor}</p>
              </div>
            </div>
            <div class="stats-mini-grid">
              <div class="mini-stat">
                <span class="val pts">{s.totalPoints}</span>
                <span class="lbl">Points</span>
              </div>
              <div class="mini-stat">
                <span class="val">{s.wins}</span>
                <span class="lbl">Wins</span>
              </div>
              <div class="mini-stat">
                <span class="val">{s.podiums}</span>
                <span class="lbl">Podiums</span>
              </div>
              <div class="mini-stat">
                <span class="val">{s.avgFinish}</span>
                <span class="lbl">Avg Pos</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Stat Highlight Badges ── -->
  {#if seasonHighlights}
    <div class="highlights-row">
      <div class="highlight-item">
        <span class="icon">🏆</span>
        <div>
          <span class="h-title">Most Wins</span>
          <span class="h-val">{seasonHighlights.mostWins.driver.name} <strong>({seasonHighlights.mostWins.wins})</strong></span>
        </div>
      </div>
      <div class="highlight-item">
        <span class="icon">🍾</span>
        <div>
          <span class="h-title">Most Podiums</span>
          <span class="h-val">{seasonHighlights.mostPodiums.driver.name} <strong>({seasonHighlights.mostPodiums.podiums})</strong></span>
        </div>
      </div>
      <div class="highlight-item">
        <span class="icon">🎯</span>
        <div>
          <span class="h-title">Best Avg Finish</span>
          <span class="h-val">{seasonHighlights.bestAvg.driver.name} <strong>(P{seasonHighlights.bestAvg.avgFinish})</strong></span>
        </div>
      </div>
      <div class="highlight-item">
        <span class="icon">⚡</span>
        <div>
          <span class="h-title">Top 5 Finishes</span>
          <span class="h-val">{seasonHighlights.mostConsistent.driver.name} <strong>({seasonHighlights.mostConsistent.top5})</strong></span>
        </div>
      </div>
    </div>
  {/if}

  <!-- ── Controls Bar ── -->
  <div class="controls-card">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        placeholder="Search driver by name, code, or constructor…"
        bind:value={searchQuery}
        aria-label="Search drivers"
      />
      {#if searchQuery}
        <button class="clear-btn" onclick={() => { searchQuery = ''; }}>✕</button>
      {/if}
    </div>

    <div class="filter-group">
      <label for="team-select" class="filter-label">Filter Team:</label>
      <select id="team-select" bind:value={selectedConstructor}>
        <option value="all">All Constructors ({statsList.length} drivers)</option>
        {#each constructorOptions as cId}
          <option value={cId}>{getConstructorName(cId)}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- ── Detailed Sortable Stats Table ── -->
  <div class="table-card">
    <div class="table-header-info">
      <div>
        <h3>Driver Statistics & Midfield Metric Ranks</h3>
        <p class="sub">Click any column header to sort. Re-calculated exclusively for Formula 1.5 midfield runners.</p>
      </div>
      <span class="count-tag">{filteredStats.length} drivers</span>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th class="c-pos sortable" onclick={() => handleSort('championshipPos', true)}>
              Pos {sortKey === 'championshipPos' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-driver sortable" onclick={() => handleSort('name', true)}>
              Driver {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('totalPoints', false)}>
              Pts {sortKey === 'totalPoints' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('wins', false)}>
              Wins {sortKey === 'wins' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('podiums', false)}>
              Podiums {sortKey === 'podiums' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('top5', false)}>
              Top 5 {sortKey === 'top5' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('pointsFinishes', false)}>
              Top 10 {sortKey === 'pointsFinishes' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('avgFinish', true)}>
              Avg Pos {sortKey === 'avgFinish' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('bestFinish', true)}>
              Best {sortKey === 'bestFinish' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-num sortable" onclick={() => handleSort('sprintPoints', false)}>
              Sprint Pts {sortKey === 'sprintPoints' ? (sortAsc ? '▲' : '▼') : ''}
            </th>
            <th class="c-form">Recent Form</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredStats as s (s.driver.id)}
            {@const color = getDriverColor(s.driver)}
            <tr style="--tc: {color}">
              <td class="c-pos">
                <span class="pos-badge" class:p1={s.championshipPos === 1} class:podium={s.championshipPos <= 3}>
                  {s.championshipPos}
                </span>
              </td>
              <td class="c-driver">
                <div class="driver-cell">
                  <span class="team-stripe"></span>
                  <div class="driver-meta">
                    <div class="name-line">
                      <span class="driver-code">{s.driver.code}</span>
                      <span class="driver-fullname">{s.driver.name}</span>
                    </div>
                    <span class="constructor-tag">{s.driver.constructor}</span>
                  </div>
                </div>
              </td>
              <td class="c-num pts-val">{s.totalPoints}</td>
              <td class="c-num" class:highlight-win={s.wins > 0}>{s.wins}</td>
              <td class="c-num" class:highlight-pod={s.podiums > 0}>{s.podiums}</td>
              <td class="c-num">{s.top5}</td>
              <td class="c-num">{s.pointsFinishes}</td>
              <td class="c-num avg-val">P{s.avgFinish}</td>
              <td class="c-num">{s.bestFinishDisplay}</td>
              <td class="c-num sprint-val">{s.sprintPoints > 0 ? `+${s.sprintPoints}` : '0'}</td>
              <td class="c-form">
                <div class="form-bubbles">
                  {#each s.recentForm as p}
                    <span class="form-dot" class:f-p1={p === 1} class:f-pod={p <= 3} class:f-top5={p <= 5}>
                      {p}
                    </span>
                  {/each}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .stats-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Showcase top 3 ── */
  .showcase-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .pill-badge {
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    background: rgba(255, 128, 0, 0.15);
    color: var(--accent-2);
    border: 1px solid rgba(255, 128, 0, 0.3);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
  }

  .section-title h3 {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text);
  }

  .podium-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 860px) {
    .podium-grid {
      grid-template-columns: 1fr;
    }
  }

  .driver-card {
    background: linear-gradient(180deg, #1d1d25 0%, #14141a 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.15rem 1.25rem;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .driver-card:hover {
    transform: translateY(-3px);
    border-color: var(--team-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }

  .rank-1 {
    border-color: rgba(255, 215, 0, 0.45);
    box-shadow: 0 4px 20px rgba(255, 215, 0, 0.08);
  }
  .rank-2 {
    border-color: rgba(209, 213, 219, 0.35);
  }
  .rank-3 {
    border-color: rgba(205, 127, 50, 0.35);
  }

  .card-glow {
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, var(--team-color) 0%, transparent 70%);
    opacity: 0.12;
    pointer-events: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .rank-tag {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #e8e8ec;
  }
  .rank-1 .rank-tag { color: #ffd700; }
  .rank-2 .rank-tag { color: #d1d5db; }
  .rank-3 .rank-tag { color: #cd7f32; }

  .code {
    font-size: 1.25rem;
    font-weight: 900;
    font-style: italic;
    color: var(--text-muted);
  }

  .driver-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .color-stripe {
    width: 4px;
    height: 40px;
    border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 0 0 10px var(--team-color);
  }

  .driver-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
  }

  .team-title {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .stats-mini-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.25);
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .mini-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .mini-stat .val {
    font-size: 1.15rem;
    font-weight: 800;
    line-height: 1.1;
    color: #fff;
  }

  .mini-stat .val.pts {
    color: var(--accent-2);
  }

  .mini-stat .lbl {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-top: 0.15rem;
  }

  /* ── Highlights row ── */
  .highlights-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  @media (max-width: 900px) {
    .highlights-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .highlight-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }

  .highlight-item .icon {
    font-size: 1.4rem;
  }

  .h-title {
    display: block;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .h-val {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
  }

  .h-val strong {
    color: var(--accent-2);
  }

  /* ── Controls card ── */
  .controls-card {
    display: flex;
    gap: 1rem;
    align-items: center;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 1.15rem;
    flex-wrap: wrap;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    flex: 1;
    min-width: 240px;
  }

  .search-icon {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .search-box input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 0.85rem;
    width: 100%;
  }

  .search-box input::placeholder {
    color: var(--text-muted);
  }

  .clear-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0 0.2rem;
  }
  .clear-btn:hover { color: var(--text); }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  select {
    background: var(--bg-hover);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    font-size: 0.82rem;
    outline: none;
    cursor: pointer;
  }

  /* ── Table Card ── */
  .table-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .table-header-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 1rem 1.25rem 0.8rem;
    border-bottom: 1px solid var(--border);
  }

  .table-header-info h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #fff;
  }

  .table-header-info .sub {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
  }

  .count-tag {
    font-size: 0.72rem;
    color: var(--text-muted);
    background: var(--bg-hover);
    padding: 0.2em 0.6em;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .table-scroll {
    overflow-x: auto;
    max-height: 600px;
    overflow-y: auto;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 0.85rem;
  }

  thead th {
    padding: 0.55rem 0.85rem;
    text-align: left;
    color: var(--text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg-card);
    z-index: 2;
    white-space: nowrap;
    user-select: none;
  }

  thead th.sortable {
    cursor: pointer;
    transition: color 0.15s;
  }
  thead th.sortable:hover {
    color: #fff;
  }

  tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  tbody tr:hover {
    background: var(--bg-hover);
  }
  tbody tr:last-child {
    border-bottom: none;
  }

  td {
    padding: 0.65rem 0.85rem;
    vertical-align: middle;
  }

  .c-pos {
    width: 44px;
    text-align: center;
  }

  .pos-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
  }
  .pos-badge.p1 {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.4);
  }
  .pos-badge.podium {
    color: #fff;
    font-weight: 800;
  }

  .c-driver {
    min-width: 220px;
  }

  .driver-cell {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .team-stripe {
    width: 3.5px;
    height: 26px;
    border-radius: 2px;
    background: var(--tc);
    flex-shrink: 0;
  }

  .driver-meta {
    display: flex;
    flex-direction: column;
  }

  .name-line {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .driver-code {
    font-weight: 800;
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    color: #fff;
  }

  .driver-fullname {
    font-size: 0.85rem;
    font-weight: 600;
    color: #e2e2ec;
  }

  .constructor-tag {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .c-num {
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .pts-val {
    font-weight: 800;
    color: #fff;
  }

  .highlight-win {
    color: #ffd700;
    font-weight: 800;
  }
  .highlight-pod {
    color: #e2e2ec;
    font-weight: 700;
  }

  .avg-val {
    color: #64C4FF;
  }

  .sprint-val {
    color: var(--accent-2);
  }

  .c-form {
    min-width: 130px;
  }

  .form-bubbles {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .form-dot {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    font-size: 0.68rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #23232c;
    color: var(--text-muted);
  }

  .form-dot.f-p1 {
    background: #ffd700;
    color: #000;
  }

  .form-dot.f-pod {
    background: #4a4a58;
    color: #fff;
  }

  .form-dot.f-top5 {
    background: #333342;
    color: #cfcfe2;
  }
</style>
