<script>
  import { getDriverColor, getFlag } from '../teamColors.js';
  import {
    getUserPrediction,
    saveUserPrediction,
    getCommunityPredictions,
    subscribeToPredictions,
  } from '../appwrite.js';

  let { drivers = [], calendar = [] } = $props();

  const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];

  // Group midfield drivers by constructor so teammates are grouped together
  let teamGroups = $derived.by(() => {
    const midfield = drivers.filter((d) => !TOP_TEAMS.includes(d.constructorId));
    const groups = new Map();

    for (const d of midfield) {
      const cId = d.constructorId || 'other';
      if (!groups.has(cId)) {
        groups.set(cId, {
          constructorId: cId,
          constructorName: d.constructor || cId,
          drivers: [],
        });
      }
      groups.get(cId).drivers.push(d);
    }

    return [...groups.values()].sort((a, b) =>
      a.constructorName.localeCompare(b.constructorName)
    );
  });

  let driversMap = $derived(
    Object.fromEntries(drivers.map((d) => [d.id, d]))
  );

  // Find next upcoming race from calendar
  let nextRace = $derived.by(() => {
    if (!calendar || calendar.length === 0) return { name: 'Upcoming Grand Prix', country: 'F1', date: '' };
    const now = new Date();
    const upcoming = calendar.find((r) => new Date(r.date) > now);
    return upcoming || calendar[calendar.length - 1];
  });

  // Default driver selections
  let p1 = $state('sainz');
  let p2 = $state('alonso');
  let p3 = $state('gasly');

  let copied = $state(false);
  let saving = $state(false);
  let saveSuccess = $state(false);
  let savedPick = $state(null);
  let now = $state(Date.now());
  let communityData = $state({ total: 0, p1: {}, p2: {}, p3: {} });
  let loadingCommunity = $state(false);

  // Live timer interval to update countdown
  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now();
    }, 1000);
    return () => clearInterval(interval);
  });

  // Target qualifying time in ms
  let qualTime = $derived.by(() => {
    if (nextRace?.qualifyingIso) {
      return new Date(nextRace.qualifyingIso).getTime();
    }
    if (nextRace?.date) {
      // Fallback: 24h before race date at 14:00 UTC
      return new Date(`${nextRace.date}T14:00:00Z`).getTime() - 86400000;
    }
    return null;
  });

  let isLocked = $derived(qualTime !== null && now >= qualTime);

  let countdown = $derived.by(() => {
    if (!qualTime) return null;
    const diff = qualTime - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
  });

  // Load user prediction and community predictions on mount / round change
  $effect(() => {
    const round = nextRace?.round;
    if (!round) return;

    // Load locally saved pick
    const local = getUserPrediction(round);
    if (local) {
      savedPick = local;
      p1 = local.p1 || p1;
      p2 = local.p2 || p2;
      p3 = local.p3 || p3;
    } else {
      savedPick = null;
    }

    loadCommunity(round);

    const unsubscribe = subscribeToPredictions(round, (updated) => {
      communityData = updated;
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  });

  async function loadCommunity(round) {
    if (!round) return;
    loadingCommunity = true;
    try {
      const data = await getCommunityPredictions(round);
      communityData = data;
    } catch (e) {
      console.warn('Could not load community predictions:', e);
    } finally {
      loadingCommunity = false;
    }
  }

  async function handleSavePrediction() {
    if (isLocked || !nextRace?.round || saving) return;
    saving = true;
    try {
      const rec = await saveUserPrediction(nextRace.round, { p1, p2, p3 });
      savedPick = rec;
      saveSuccess = true;
      setTimeout(() => { saveSuccess = false; }, 3500);
      await loadCommunity(nextRace.round);
    } catch (e) {
      console.error('Save prediction failed:', e);
    } finally {
      saving = false;
    }
  }

  function getConsensusTop(countsMap, total) {
    if (!countsMap || Object.keys(countsMap).length === 0) return [];
    const entries = Object.entries(countsMap).filter(([_, cnt]) => cnt > 0);
    if (entries.length === 0) return [];
    const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 3);
    const sum = total || sorted.reduce((acc, curr) => acc + curr[1], 0);
    if (!sum) return [];
    return sorted.map(([id, cnt]) => ({
      id,
      driver: driversMap[id] || { name: id, code: id.toUpperCase(), constructor: '' },
      count: cnt,
      percent: Math.round((cnt / sum) * 100),
    }));
  }

  let topP1List = $derived(getConsensusTop(communityData.p1, communityData.total));
  let topP2List = $derived(getConsensusTop(communityData.p2, communityData.total));
  let topP3List = $derived(getConsensusTop(communityData.p3, communityData.total));

  function generateTweetText() {
    const d1 = driversMap[p1];
    const d2 = driversMap[p2];
    const d3 = driversMap[p3];
    const flag = getFlag(nextRace?.country);

    return `My Formula 1.5 Podium Prediction for the ${nextRace?.name} ${flag}:

🥇 1. ${d1?.name ?? p1} (${d1?.constructor ?? ''})
🥈 2. ${d2?.name ?? p2} (${d2?.constructor ?? ''})
🥉 3. ${d3?.name ?? p3} (${d3?.constructor ?? ''})

Pick yours & see the live F1.5 standings:
https://jai-dewani.github.io/AlternateF1/

#F1 #F1point5 #Formula1`;
  }

  function handlePostToX() {
    const text = generateTweetText();
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(generateTweetText());
      copied = true;
      setTimeout(() => { copied = false; }, 2500);
    } catch (e) {}
  }
</script>

<section class="podium-hero" aria-label="Podium Prediction Generator">
  <div class="hero-top">
    <div class="hero-tag-row">
      <div class="hero-tag">
        <span class="pulse-dot"></span> NEXT RACE PREDICTOR
      </div>

      <!-- Live Qualifying Countdown Timer -->
      {#if countdown}
        <div class="countdown-tag open">
          <span class="timer-dot"></span>
          <span>LOCKS IN: <strong>{countdown}</strong> (Qualifying)</span>
        </div>
      {:else if isLocked}
        <div class="countdown-tag locked">
          <span class="lock-icon">🔒</span>
          <span>PREDICTIONS LOCKED (Qualifying Underway)</span>
        </div>
      {/if}
    </div>

    <h2>Predict the {nextRace?.name} {getFlag(nextRace?.country)}</h2>
    <p class="hero-desc">
      Pick your top 3 midfield finishers for the upcoming race, save your official prediction, and see how the community voted.
    </p>
  </div>

  <!-- Stepped Motorsport Podium (2 - 1 - 3 Order) -->
  <div class="podium-stage">
    <!-- P2 Step (Left / Silver / Medium Height) -->
    <div class="podium-slot slot-p2" class:slot-disabled={isLocked} style="--team-color: {getDriverColor(driversMap[p2])}">
      <div class="driver-card">
        <div class="card-header">
          <span class="medal silver">🥈 P2</span>
          {#if isLocked}
            <span class="change-tag locked">Locked 🔒</span>
          {:else}
            <span class="change-tag">Change ▾</span>
          {/if}
        </div>
        <div class="driver-body">
          <div class="stripe" style="background: {getDriverColor(driversMap[p2])}"></div>
          <div class="driver-info">
            <div class="driver-code">{driversMap[p2]?.code ?? p2}</div>
            <div class="driver-name">{driversMap[p2]?.name ?? p2}</div>
            <div class="team-name">{driversMap[p2]?.constructor ?? ''}</div>
          </div>
        </div>
      </div>
      <div class="pedestal ped-2">
        <span class="ped-num">2</span>
      </div>
      <select bind:value={p2} disabled={isLocked} class="card-select" aria-label="2nd place prediction">
        {#each teamGroups as group}
          <optgroup label="── {group.constructorName} ──">
            {#each group.drivers as d}
              <option value={d.id}>{d.name} ({d.code})</option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </div>

    <!-- P1 Step (Center / Gold / Tallest) -->
    <div class="podium-slot slot-p1" class:slot-disabled={isLocked} style="--team-color: {getDriverColor(driversMap[p1])}">
      <div class="driver-card">
        <div class="card-header">
          <span class="medal gold">🥇 P1 · WINNER</span>
          {#if isLocked}
            <span class="change-tag locked">Locked 🔒</span>
          {:else}
            <span class="change-tag">Change ▾</span>
          {/if}
        </div>
        <div class="driver-body">
          <div class="stripe" style="background: {getDriverColor(driversMap[p1])}"></div>
          <div class="driver-info">
            <div class="driver-code">{driversMap[p1]?.code ?? p1}</div>
            <div class="driver-name">{driversMap[p1]?.name ?? p1}</div>
            <div class="team-name">{driversMap[p1]?.constructor ?? ''}</div>
          </div>
        </div>
      </div>
      <div class="pedestal ped-1">
        <span class="ped-num">1</span>
      </div>
      <select bind:value={p1} disabled={isLocked} class="card-select" aria-label="1st place prediction">
        {#each teamGroups as group}
          <optgroup label="── {group.constructorName} ──">
            {#each group.drivers as d}
              <option value={d.id}>{d.name} ({d.code})</option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </div>

    <!-- P3 Step (Right / Bronze / Lowest Height) -->
    <div class="podium-slot slot-p3" class:slot-disabled={isLocked} style="--team-color: {getDriverColor(driversMap[p3])}">
      <div class="driver-card">
        <div class="card-header">
          <span class="medal bronze">🥉 P3</span>
          {#if isLocked}
            <span class="change-tag locked">Locked 🔒</span>
          {:else}
            <span class="change-tag">Change ▾</span>
          {/if}
        </div>
        <div class="driver-body">
          <div class="stripe" style="background: {getDriverColor(driversMap[p3])}"></div>
          <div class="driver-info">
            <div class="driver-code">{driversMap[p3]?.code ?? p3}</div>
            <div class="driver-name">{driversMap[p3]?.name ?? p3}</div>
            <div class="team-name">{driversMap[p3]?.constructor ?? ''}</div>
          </div>
        </div>
      </div>
      <div class="pedestal ped-3">
        <span class="ped-num">3</span>
      </div>
      <select bind:value={p3} disabled={isLocked} class="card-select" aria-label="3rd place prediction">
        {#each teamGroups as group}
          <optgroup label="── {group.constructorName} ──">
            {#each group.drivers as d}
              <option value={d.id}>{d.name} ({d.code})</option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </div>
  </div>

  <div class="hero-actions">
    {#if !isLocked}
      <button
        class="save-btn"
        class:saved={saveSuccess}
        onclick={handleSavePrediction}
        disabled={saving}
      >
        {#if saving}
          <span class="spinner-sm"></span> Saving…
        {:else if saveSuccess}
          ✓ Prediction Saved!
        {:else if savedPick}
          💾 Update Prediction
        {:else}
          🔒 Lock In Prediction
        {/if}
      </button>
    {:else}
      <div class="locked-action-pill">
        🔒 Qualifying Underway · Predictions Locked
      </div>
    {/if}

    <button class="post-btn" onclick={handlePostToX}>
      <span class="x-icon">𝕏</span> Post to X
    </button>
    <button class="copy-btn" onclick={handleCopyText}>
      {copied ? '✓ Copied!' : '📋 Copy Text'}
    </button>
  </div>

  <!-- User's Saved Prediction Banner -->
  {#if savedPick}
    <div class="saved-pick-banner">
      <div class="saved-pick-info">
        <span class="saved-check-badge">✓</span>
        <div class="saved-text-group">
          <span class="saved-label">Your Pick for Round {nextRace?.round}:</span>
          <span class="saved-drivers">
            🥇 <strong>{driversMap[savedPick.p1]?.name || savedPick.p1}</strong> ·
            🥈 <strong>{driversMap[savedPick.p2]?.name || savedPick.p2}</strong> ·
            🥉 <strong>{driversMap[savedPick.p3]?.name || savedPick.p3}</strong>
          </span>
        </div>
      </div>
      {#if !isLocked}
        <span class="editable-pill">Editable until Qualifying</span>
      {:else}
        <span class="locked-pill">Locked for Race</span>
      {/if}
    </div>
  {/if}

  <!-- Community Consensus Breakdown -->
  <div class="community-consensus">
    <div class="consensus-header">
      <div class="consensus-title">
        <span class="consensus-icon">📊</span>
        <h3>Midfield Community Consensus</h3>
      </div>
      <span class="consensus-count">
        {communityData.total || 0} fan prediction{communityData.total === 1 ? '' : 's'}
      </span>
    </div>

    <div class="consensus-columns">
      <!-- P1 Fan Favorites -->
      <div class="consensus-card">
        <div class="card-step-badge gold">🥇 P1 Favorite</div>
        {#if topP1List.length > 0}
          <div class="consensus-list">
            {#each topP1List as item}
              <div class="consensus-row">
                <div class="row-driver">
                  <span class="driver-bullet" style="background: {getDriverColor(item.driver)}"></span>
                  <span class="driver-name">{item.driver.code || item.driver.name}</span>
                </div>
                <div class="bar-container">
                  <div
                    class="bar-fill"
                    style="width: {item.percent}%; background: {getDriverColor(item.driver)}"
                  ></div>
                </div>
                <span class="percent-val">{item.percent}%</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-consensus">No predictions yet</p>
        {/if}
      </div>

      <!-- P2 Fan Favorites -->
      <div class="consensus-card">
        <div class="card-step-badge silver">🥈 P2 Favorite</div>
        {#if topP2List.length > 0}
          <div class="consensus-list">
            {#each topP2List as item}
              <div class="consensus-row">
                <div class="row-driver">
                  <span class="driver-bullet" style="background: {getDriverColor(item.driver)}"></span>
                  <span class="driver-name">{item.driver.code || item.driver.name}</span>
                </div>
                <div class="bar-container">
                  <div
                    class="bar-fill"
                    style="width: {item.percent}%; background: {getDriverColor(item.driver)}"
                  ></div>
                </div>
                <span class="percent-val">{item.percent}%</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-consensus">No predictions yet</p>
        {/if}
      </div>

      <!-- P3 Fan Favorites -->
      <div class="consensus-card">
        <div class="card-step-badge bronze">🥉 P3 Favorite</div>
        {#if topP3List.length > 0}
          <div class="consensus-list">
            {#each topP3List as item}
              <div class="consensus-row">
                <div class="row-driver">
                  <span class="driver-bullet" style="background: {getDriverColor(item.driver)}"></span>
                  <span class="driver-name">{item.driver.code || item.driver.name}</span>
                </div>
                <div class="bar-container">
                  <div
                    class="bar-fill"
                    style="width: {item.percent}%; background: {getDriverColor(item.driver)}"
                  ></div>
                </div>
                <span class="percent-val">{item.percent}%</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-consensus">No predictions yet</p>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  .podium-hero {
    background: linear-gradient(180deg, #18181f 0%, #121217 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.5rem 1.5rem 1.75rem;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  }

  .hero-top {
    text-align: center;
    max-width: 600px;
    margin: 0 auto 1.25rem;
  }

  .hero-tag-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    flex-wrap: wrap;
    margin-bottom: .6rem;
  }

  .hero-tag {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .08em;
    color: #ff8000;
    background: rgba(255, 128, 0, 0.12);
    border: 1px solid rgba(255, 128, 0, 0.28);
    padding: .2rem .65rem;
    border-radius: 999px;
  }

  .countdown-tag {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    font-size: .68rem;
    font-weight: 700;
    letter-spacing: .05em;
    padding: .2rem .75rem;
    border-radius: 999px;
    font-variant-numeric: tabular-nums;
  }

  .countdown-tag.open {
    color: #10b981;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .countdown-tag.locked {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .timer-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.85); }
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff8000;
    box-shadow: 0 0 8px #ff8000;
  }

  h2 {
    font-size: 1.35rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -.01em;
  }

  .hero-desc {
    color: var(--text-muted);
    font-size: .85rem;
    margin-top: .35rem;
  }

  /* ── 2 - 1 - 3 Stepped Podium ── */
  .podium-stage {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.85rem;
    margin: 1.25rem auto 1.75rem;
    max-width: 860px;
  }

  .podium-slot {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
  }

  .podium-slot:hover {
    transform: translateY(-4px);
  }

  /* Driver Card on top of pedestal */
  .driver-card {
    background: linear-gradient(180deg, #1f1f28 0%, #15151c 100%);
    border: 1px solid var(--border);
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    padding: 0.9rem 1rem 0.8rem;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .slot-p1 .driver-card {
    border-color: rgba(255, 215, 0, 0.45);
    box-shadow: 0 -4px 20px rgba(255, 215, 0, 0.12);
  }
  .slot-p2 .driver-card {
    border-color: rgba(209, 213, 219, 0.35);
  }
  .slot-p3 .driver-card {
    border-color: rgba(205, 127, 50, 0.35);
  }

  .podium-slot:hover .driver-card {
    border-color: var(--team-color, #fff);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }

  .medal {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .medal.gold   { color: #ffd700; }
  .medal.silver { color: #d1d5db; }
  .medal.bronze { color: #cd7f32; }

  .change-tag {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: color 0.15s;
  }
  .podium-slot:hover .change-tag {
    color: #fff;
  }

  .driver-body {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stripe {
    width: 4px;
    height: 44px;
    border-radius: 2px;
    flex-shrink: 0;
    box-shadow: 0 0 10px var(--team-color, transparent);
  }

  .driver-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .driver-code {
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    font-style: italic;
    color: #fff;
    line-height: 1;
  }

  .driver-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: #e2e2ec;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 0.2rem;
  }

  .team-name {
    font-size: 0.72rem;
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Stepped Pedestal Blocks ── */
  .pedestal {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0 0 6px 6px;
    border: 1px solid var(--border);
    position: relative;
    overflow: hidden;
  }

  .ped-1 {
    height: 100px;
    background: linear-gradient(180deg, #2b240d 0%, #171305 100%);
    border-color: rgba(255, 215, 0, 0.45);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 215, 0, 0.35);
  }
  .ped-2 {
    height: 65px;
    background: linear-gradient(180deg, #222429 0%, #121316 100%);
    border-color: rgba(209, 213, 219, 0.35);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
  .ped-3 {
    height: 45px;
    background: linear-gradient(180deg, #251b14 0%, #140d08 100%);
    border-color: rgba(205, 127, 50, 0.35);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .ped-num {
    font-size: 2.2rem;
    font-weight: 900;
    font-style: italic;
    opacity: 0.85;
    letter-spacing: -0.02em;
  }
  .ped-1 .ped-num { color: #ffd700; font-size: 2.8rem; }
  .ped-2 .ped-num { color: #d1d5db; }
  .ped-3 .ped-num { color: #cd7f32; }

  /* ── Invisible full-card select overlay ── */
  .card-select {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 5;
    -webkit-appearance: none;
    appearance: none;
  }
  .card-select optgroup {
    background: #18181f;
    color: #ff8000;
    font-weight: 700;
  }
  .card-select option {
    background: #101015;
    color: #e8e8ec;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .75rem;
  }

  .post-btn {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    background: #fff;
    color: #000;
    font-size: .88rem;
    font-weight: 700;
    padding: .65rem 1.4rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: transform .15s, background .15s, box-shadow .15s;
  }
  .post-btn:hover {
    background: #e6e6e6;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
  }
  .x-icon {
    font-size: 1rem;
    font-weight: 900;
  }

  .copy-btn {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
    padding: .65rem 1.1rem;
    border-radius: 8px;
    font-size: .82rem;
    cursor: pointer;
    transition: background .15s, color .15s;
  }
  .copy-btn:hover {
    background: var(--bg-hover);
    color: #fff;
  }

  .slot-disabled {
    cursor: not-allowed;
    opacity: 0.9;
  }
  .card-select:disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
  .change-tag.locked {
    color: #ef4444;
  }

  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    background: #e10600;
    color: #fff;
    font-size: .88rem;
    font-weight: 700;
    padding: .65rem 1.4rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: transform .15s, background .15s, box-shadow .15s;
  }
  .save-btn:hover:not(:disabled) {
    background: #ff1801;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(225, 6, 0, 0.4);
  }
  .save-btn.saved {
    background: #10b981;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
  }
  .save-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .locked-action-pill {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    font-size: .82rem;
    font-weight: 700;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: .6rem 1.1rem;
    border-radius: 8px;
  }

  /* ── User Saved Pick Banner ── */
  .saved-pick-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin: 1.5rem auto 0;
    padding: .85rem 1.25rem;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 10px;
    max-width: 780px;
  }
  .saved-pick-info {
    display: flex;
    align-items: center;
    gap: .75rem;
    min-width: 0;
  }
  .saved-check-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #10b981;
    color: #fff;
    font-size: .75rem;
    font-weight: 900;
    flex-shrink: 0;
  }
  .saved-text-group {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .saved-label {
    font-size: .7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 700;
  }
  .saved-drivers {
    font-size: .88rem;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .editable-pill {
    font-size: .7rem;
    font-weight: 700;
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: .25rem .65rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .locked-pill {
    font-size: .7rem;
    font-weight: 700;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: .25rem .65rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  /* ── Community Consensus Breakdown ── */
  .community-consensus {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .consensus-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: .5rem;
  }
  .consensus-title {
    display: flex;
    align-items: center;
    gap: .5rem;
  }
  .consensus-title h3 {
    font-size: .95rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
    letter-spacing: -.01em;
  }
  .consensus-count {
    font-size: .75rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.06);
    padding: .2rem .6rem;
    border-radius: 999px;
  }

  .consensus-columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: .85rem;
  }
  .consensus-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: .85rem;
  }
  .card-step-badge {
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .04em;
    margin-bottom: .65rem;
  }
  .card-step-badge.gold { color: #ffd700; }
  .card-step-badge.silver { color: #d1d5db; }
  .card-step-badge.bronze { color: #cd7f32; }

  .consensus-list {
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .consensus-row {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-size: .78rem;
  }
  .row-driver {
    display: flex;
    align-items: center;
    gap: .35rem;
    width: 65px;
    flex-shrink: 0;
  }
  .driver-bullet {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .driver-name {
    font-weight: 700;
    color: #e2e2ec;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar-container {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width .4s cubic-bezier(0.2, 0, 0, 1);
  }
  .percent-val {
    font-size: .72rem;
    color: var(--text-muted);
    width: 32px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .empty-consensus {
    font-size: .75rem;
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
  }

  .spinner-sm {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 680px) {
    .consensus-columns {
      grid-template-columns: 1fr;
    }
    .saved-pick-banner {
      flex-direction: column;
      align-items: flex-start;
    }
    .hero-actions {
      flex-direction: column;
      width: 100%;
    }
    .hero-actions button, .locked-action-pill {
      width: 100%;
      justify-content: center;
    }
    .podium-stage {
      gap: 0.4rem;
    }
    .driver-card {
      padding: 0.7rem 0.5rem;
    }
    .driver-code {
      font-size: 1.25rem;
    }
    .driver-name {
      font-size: 0.75rem;
    }
    .team-name {
      display: none;
    }
    .stripe {
      height: 32px;
      width: 3px;
    }
    .ped-1 { height: 70px; }
    .ped-2 { height: 48px; }
    .ped-3 { height: 32px; }
    .ped-num { font-size: 1.6rem; }
    .ped-1 .ped-num { font-size: 2rem; }
  }
</style>
