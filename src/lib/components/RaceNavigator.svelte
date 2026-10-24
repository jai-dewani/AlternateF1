<script>
  import { getFlag } from '../teamColors.js';

  let { rounds, selectedRound, onSelect } = $props();

  let current   = $derived(rounds[selectedRound - 1]);
  let canPrev   = $derived(selectedRound > 1);
  let canNext   = $derived(selectedRound < rounds.length);
</script>

<div class="nav-card">
  <div class="nav-row">
    <button class="arrow" disabled={!canPrev} onclick={() => onSelect(selectedRound - 1)} aria-label="Previous round">‹</button>

    <div class="race-info">
      <div class="race-main">
        <span class="flag" aria-hidden="true">{getFlag(current?.country)}</span>
        <div>
          <div class="race-name">{current?.name ?? '—'}</div>
          <div class="race-sub">{current?.circuit} · {current?.locality} · {current?.date}</div>
        </div>
      </div>
      {#if current?.hasSprint}
        <span class="sprint-tag">Sprint Weekend</span>
      {/if}
    </div>

    <button class="arrow" disabled={!canNext} onclick={() => onSelect(selectedRound + 1)} aria-label="Next round">›</button>
  </div>

  <!-- Round dots timeline -->
  <div class="timeline" role="navigation" aria-label="Round selector">
    {#each rounds as r, i}
      <button
        class="dot"
        class:active={i + 1 === selectedRound}
        class:sprint={r.hasSprint}
        title="R{r.round}: {r.name}"
        aria-label="Round {r.round}: {r.name}"
        aria-current={i + 1 === selectedRound ? 'true' : undefined}
        onclick={() => onSelect(i + 1)}
      ></button>
    {/each}
  </div>
</div>

<style>
  .nav-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1rem 1.25rem .75rem;
  }

  .nav-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .arrow {
    background: none;
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 1.6rem;
    line-height: 1;
    width: 40px; height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s, border-color .15s;
  }
  .arrow:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--text-muted); }
  .arrow:disabled { opacity: .3; cursor: not-allowed; }

  .race-info {
    flex: 1; min-width: 0;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  }

  .race-main {
    display: flex; align-items: center; gap: .75rem; min-width: 0;
  }

  .flag { font-size: 2rem; flex-shrink: 0; }

  .race-name {
    font-size: 1.05rem; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .race-sub {
    font-size: .75rem; color: var(--text-muted); margin-top: .1rem;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .sprint-tag {
    background: var(--accent-2); color: #000;
    font-size: .65rem; font-weight: 700;
    padding: .2em .55em; border-radius: 4px;
    text-transform: uppercase; letter-spacing: .06em;
    flex-shrink: 0;
  }

  .timeline {
    display: flex; gap: 5px; flex-wrap: wrap;
    padding-top: .75rem;
  }

  .dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--border); border: none;
    cursor: pointer;
    transition: background .15s, transform .15s;
    padding: 0; position: relative;
  }
  .dot:hover { background: var(--text-muted); transform: scale(1.3); }
  .dot.active { background: var(--accent); transform: scale(1.5); }
  .dot.sprint::after {
    content: ''; position: absolute; bottom: -3px; left: 50%;
    transform: translateX(-50%);
    width: 3px; height: 3px; border-radius: 50%;
    background: var(--accent-2);
  }

  @media (max-width: 600px) {
    .race-sub { display: none; }
    .flag { font-size: 1.5rem; }
  }
</style>
