<script>
  import { getDriverColor, getFlag } from '../teamColors.js';

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
    window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=600,height=520');
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
    <div class="hero-tag">
      <span class="pulse-dot"></span> NEXT RACE PREDICTOR
    </div>
    <h2>Predict the {nextRace?.name} {getFlag(nextRace?.country)}</h2>
    <p class="hero-desc">
      Pick your top 3 midfield finishers for the upcoming race and share your prediction directly to 𝕏.
    </p>
  </div>

  <!-- Stepped Motorsport Podium (2 - 1 - 3 Order) -->
  <div class="podium-stage">
    <!-- P2 Step (Left / Silver / Medium Height) -->
    <div class="podium-slot slot-p2" style="--team-color: {getDriverColor(driversMap[p2])}">
      <div class="driver-card">
        <div class="card-header">
          <span class="medal silver">🥈 P2</span>
          <span class="change-tag">Change ▾</span>
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
      <select bind:value={p2} class="card-select" aria-label="2nd place prediction">
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
    <div class="podium-slot slot-p1" style="--team-color: {getDriverColor(driversMap[p1])}">
      <div class="driver-card">
        <div class="card-header">
          <span class="medal gold">🥇 P1 · WINNER</span>
          <span class="change-tag">Change ▾</span>
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
      <select bind:value={p1} class="card-select" aria-label="1st place prediction">
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
    <div class="podium-slot slot-p3" style="--team-color: {getDriverColor(driversMap[p3])}">
      <div class="driver-card">
        <div class="card-header">
          <span class="medal bronze">🥉 P3</span>
          <span class="change-tag">Change ▾</span>
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
      <select bind:value={p3} class="card-select" aria-label="3rd place prediction">
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
    <button class="post-btn" onclick={handlePostToX}>
      <span class="x-icon">𝕏</span> Post Prediction to X
    </button>
    <button class="copy-btn" onclick={handleCopyText}>
      {copied ? '✓ Copied to Clipboard!' : '📋 Copy Text'}
    </button>
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
    margin-bottom: .6rem;
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

  @media (max-width: 680px) {
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
