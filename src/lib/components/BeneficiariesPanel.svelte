<script>
  import { getDriverColor } from '../teamColors.js';

  let { beneficiaries, driversMap } = $props();

  let top      = $derived(beneficiaries.filter((b) => b.pointsGained > 0).slice(0, 8));
  let maxGain  = $derived(top[0]?.pointsGained ?? 1);
</script>

<div class="panel">
  <div class="head">
    <h2>Biggest Beneficiaries</h2>
    <span class="sub">Cumulative points gained</span>
  </div>

  {#if top.length === 0}
    <p class="empty">No data yet.</p>
  {:else}
    <div class="list">
      {#each top as b}
        {@const driver = driversMap[b.driverId]}
        {@const color  = getDriverColor(driver)}
        {@const pct    = (b.pointsGained / maxGain) * 100}
        <div class="row">
          <span class="code" style="color:{color}">{driver?.code ?? b.driverId}</span>
          <div class="bar-bg">
            <div class="bar-fill" style="width:{pct}%;background:{color}44;border-color:{color}"></div>
          </div>
          <span class="pts">+{b.pointsGained}</span>
          {#if b.positionsGained > 0}
            <span class="pos-gain">▲{b.positionsGained}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .head {
    padding: .9rem 1.1rem .7rem;
    border-bottom: 1px solid var(--border);
  }
  h2 {
    font-size: .8rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: .06em; color: var(--text-muted);
  }
  .sub {
    display: block; font-size: .72rem; color: var(--text-muted); margin-top: .15rem;
  }
  .empty { padding: 1rem 1.1rem; color: var(--text-muted); font-size: .85rem; }
  .list { padding: .75rem 1.1rem; display: flex; flex-direction: column; gap: .55rem; }
  .row {
    display: flex; align-items: center; gap: .6rem; font-size: .85rem;
  }
  .code { font-weight: 700; min-width: 36px; }
  .bar-bg {
    flex: 1; height: 14px; background: var(--bg); border-radius: 3px; overflow: hidden;
  }
  .bar-fill {
    height: 100%; border-radius: 3px; border: 1px solid;
    transition: width .5s ease;
  }
  .pts { min-width: 48px; text-align: right; font-weight: 600; color: var(--green); font-size: .8rem; }
  .pos-gain { font-size: .75rem; color: var(--green); min-width: 24px; }
</style>
