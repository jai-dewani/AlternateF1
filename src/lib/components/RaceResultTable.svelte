<script>
  import { getDriverColor } from '../teamColors.js';
  import { flip } from 'svelte/animate';

  let { round, driversMap, showWhatIf, activeTab, onTabChange } = $props();

  let results = $derived(
    activeTab === 'sprint'
      ? (showWhatIf ? round.whatIfSprint : round.realSprint)
      : (showWhatIf ? round.whatIfRace  : round.realRace)
  );

  // Build lookup: driverId → real position (for delta calculation)
  let realPosMap = $derived(
    Object.fromEntries(
      (activeTab === 'sprint' ? round.realSprint : round.realRace)
        .map((r) => [r.driverId, r.position])
    )
  );
  let whatIfPosMap = $derived(
    Object.fromEntries(
      (activeTab === 'sprint' ? round.whatIfSprint : round.whatIfRace)
        .map((r) => [r.driverId, r.position])
    )
  );

  function delta(driverId) {
    const real   = realPosMap[driverId];
    const whatif = whatIfPosMap[driverId];
    if (real == null || whatif == null) return 0;
    return real - whatif; // positive = moved up
  }
</script>

<div class="panel-head">
  <h2>Race Result · R{round.round}</h2>
  {#if round.hasSprint}
    <div class="tabs">
      <button class:active={activeTab === 'race'}   onclick={() => onTabChange('race')}>Race</button>
      <button class:active={activeTab === 'sprint'} onclick={() => onTabChange('sprint')}>Sprint</button>
    </div>
  {/if}
</div>

<div class="scroll">
  <table>
    <thead>
      <tr>
        <th class="c-pos">Pos</th>
        <th>Driver</th>
        <th class="c-pts">Pts</th>
        {#if showWhatIf}<th class="c-delta" title="Positions gained vs real result">Δ Pos</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each results as row (row.driverId)}
        {@const driver = driversMap[row.driverId]}
        {@const color  = getDriverColor(driver)}
        {@const d      = showWhatIf ? delta(row.driverId) : 0}
        <tr animate:flip={{ duration: 380 }} style="--tc: {color}">
          <td class="c-pos">{row.position}</td>
          <td class="c-driver">
            <span class="stripe"></span>
            <span class="code">{driver?.code ?? row.driverId}</span>
            <span class="name">{driver?.name ?? ''}</span>
          </td>
          <td class="c-pts">{row.points}</td>
          {#if showWhatIf}
            <td class="c-delta">
              {#if d > 0}<span class="up">▲{d}</span>
              {:else if d < 0}<span class="dn">▼{Math.abs(d)}</span>
              {:else}<span class="eq">–</span>{/if}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .panel-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: .9rem 1.1rem .7rem;
    border-bottom: 1px solid var(--border);
  }
  h2 {
    font-size: .8rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: .06em; color: var(--text-muted);
  }

  .tabs {
    display: flex;
    border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
  }
  .tabs button {
    padding: .25em .7em; background: none; border: none;
    color: var(--text-muted); font-size: .78rem; cursor: pointer;
    transition: background .15s, color .15s;
  }
  .tabs button:hover  { background: var(--bg-hover); color: var(--text); }
  .tabs button.active { background: var(--bg-hover); color: var(--text); font-weight: 600; }

  .scroll { overflow-x: auto; max-height: 420px; overflow-y: auto; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .85rem; }

  thead th {
    padding: .45rem .8rem; text-align: left;
    color: var(--text-muted); font-size: .7rem; text-transform: uppercase; letter-spacing: .06em;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-card); z-index: 1;
  }

  tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; will-change: transform; }
  tbody tr:hover { background: var(--bg-hover); }
  tbody tr:last-child { border-bottom: none; }

  td { padding: .55rem .8rem; vertical-align: middle; }

  .c-pos   { width: 36px; text-align: center; font-weight: 700; color: var(--text-muted); }
  tbody .c-pos { color: var(--text); }

  .c-driver { display: flex; align-items: center; gap: .5rem; }
  .stripe   { width: 3px; height: 18px; border-radius: 2px; background: var(--tc); flex-shrink: 0; }
  .code     { font-weight: 700; font-size: .8rem; letter-spacing: .03em; min-width: 34px; }
  .name     { color: var(--text-muted); font-size: .78rem; }

  .c-pts   { width: 44px; text-align: right; font-weight: 600; }
  .c-delta { width: 52px; text-align: center; font-size: .8rem; font-weight: 600; }
  .up { color: var(--green); }
  .dn { color: var(--red);   }
  .eq { color: var(--text-muted); }
</style>
