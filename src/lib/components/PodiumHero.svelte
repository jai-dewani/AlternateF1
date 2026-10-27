<script>
  import { getDriverColor, getFlag } from '../teamColors.js';

  let { drivers = [], calendar = [] } = $props();

  const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];

  let midfieldDrivers = $derived(
    drivers.filter((d) => !TOP_TEAMS.includes(d.constructorId))
  );

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

  <div class="podium-grid">
    <!-- P1 Selector (Gold) -->
    <div class="podium-col p1-col">
      <div class="medal-badge gold">🥇 1st Place</div>
      <div class="select-wrap" style="--team-color: {getDriverColor(driversMap[p1])}">
        <select bind:value={p1} aria-label="1st place driver prediction">
          {#each midfieldDrivers as d}
            <option value={d.id}>{d.name} ({d.constructor})</option>
          {/each}
        </select>
      </div>
      <div class="driver-card-mini">
        <span class="color-bar" style="background: {getDriverColor(driversMap[p1])}"></span>
        <span class="driver-name">{driversMap[p1]?.name ?? p1}</span>
        <span class="constructor-name">{driversMap[p1]?.constructor ?? ''}</span>
      </div>
    </div>

    <!-- P2 Selector (Silver) -->
    <div class="podium-col p2-col">
      <div class="medal-badge silver">🥈 2nd Place</div>
      <div class="select-wrap" style="--team-color: {getDriverColor(driversMap[p2])}">
        <select bind:value={p2} aria-label="2nd place driver prediction">
          {#each midfieldDrivers as d}
            <option value={d.id}>{d.name} ({d.constructor})</option>
          {/each}
        </select>
      </div>
      <div class="driver-card-mini">
        <span class="color-bar" style="background: {getDriverColor(driversMap[p2])}"></span>
        <span class="driver-name">{driversMap[p2]?.name ?? p2}</span>
        <span class="constructor-name">{driversMap[p2]?.constructor ?? ''}</span>
      </div>
    </div>

    <!-- P3 Selector (Bronze) -->
    <div class="podium-col p3-col">
      <div class="medal-badge bronze">🥉 3rd Place</div>
      <div class="select-wrap" style="--team-color: {getDriverColor(driversMap[p3])}">
        <select bind:value={p3} aria-label="3rd place driver prediction">
          {#each midfieldDrivers as d}
            <option value={d.id}>{d.name} ({d.constructor})</option>
          {/each}
        </select>
      </div>
      <div class="driver-card-mini">
        <span class="color-bar" style="background: {getDriverColor(driversMap[p3])}"></span>
        <span class="driver-name">{driversMap[p3]?.name ?? p3}</span>
        <span class="constructor-name">{driversMap[p3]?.constructor ?? ''}</span>
      </div>
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
    margin: 0 auto 1.5rem;
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

  .podium-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .podium-col {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: .65rem;
    transition: transform .15s, border-color .15s;
  }

  .podium-col:hover {
    border-color: rgba(255, 255, 255, 0.18);
  }

  .medal-badge {
    font-size: .8rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .medal-badge.gold   { color: #ffd700; }
  .medal-badge.silver { color: #d1d5db; }
  .medal-badge.bronze { color: #cd7f32; }

  .select-wrap select {
    width: 100%;
    padding: .5rem .6rem;
    background: #0f0f13;
    color: #e8e8ec;
    border: 1px solid var(--border);
    border-left: 3px solid var(--team-color, #ff8000);
    border-radius: 6px;
    font-size: .82rem;
    cursor: pointer;
  }
  .select-wrap select:focus {
    outline: none;
    border-color: #ff8000;
  }

  .driver-card-mini {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-size: .8rem;
    padding-top: .2rem;
  }
  .color-bar {
    width: 3px;
    height: 16px;
    border-radius: 2px;
  }
  .driver-name {
    font-weight: 600;
    color: #fff;
  }
  .constructor-name {
    color: var(--text-muted);
    font-size: .75rem;
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

  @media (max-width: 768px) {
    .podium-grid {
      grid-template-columns: 1fr;
    }
    .hero-actions {
      flex-direction: column;
      width: 100%;
    }
    .post-btn, .copy-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
