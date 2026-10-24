<script>
  import { getDriverColor, getConstructorName, getConstructorColor } from '../teamColors.js';
  import { flip } from 'svelte/animate';

  let { round, prevRound, driversMap, showWhatIf, isF15 = false } = $props();

  let standingsTab = $state('drivers'); // 'drivers' | 'constructors'

  let driverStandings = $derived(showWhatIf ? round.whatIfStandings : round.realStandings);
  let constructorStandings = $derived(round.constructorStandings || []);

  let prevPosMap = $derived.by(() => {
    if (!prevRound) return {};
    const src = showWhatIf ? prevRound.whatIfStandings : prevRound.realStandings;
    return Object.fromEntries(src.map((s) => [s.driverId, s.position]));
  });

  let driverLeader = $derived(driverStandings[0] ?? null);
  let constructorLeader = $derived(constructorStandings[0] ?? null);

  function posChange(driverId, curPos) {
    const prev = prevPosMap[driverId];
    if (prev == null) return null;
    return prev - curPos; // positive = moved up
  }
</script>

<div class="panel-head">
  <div>
    <h2>Championship Standings</h2>
    <span class="label">After R{round.round}</span>
  </div>

  {#if isF15 && constructorStandings.length > 0}
    <div class="tabs">
      <button
        class:active={standingsTab === 'drivers'}
        onclick={() => { standingsTab = 'drivers'; }}
      >Drivers</button>
      <button
        class:active={standingsTab === 'constructors'}
        onclick={() => { standingsTab = 'constructors'; }}
      >Constructors</button>
    </div>
  {/if}
</div>

<div class="scroll">
  {#if standingsTab === 'drivers'}
    <table>
      <thead>
        <tr>
          <th class="c-pos">Pos</th>
          <th>Driver</th>
          <th class="c-pts">Pts</th>
          <th class="c-gap">Gap</th>
          <th class="c-chg">Δ</th>
        </tr>
      </thead>
      <tbody>
        {#each driverStandings as entry (entry.driverId)}
          {@const driver = driversMap[entry.driverId]}
          {@const color  = getDriverColor(driver)}
          {@const change = posChange(entry.driverId, entry.position)}
          {@const gap    = driverLeader ? driverLeader.points - entry.points : 0}
          <tr animate:flip={{ duration: 280 }} style="--tc: {color}">
            <td class="c-pos">{entry.position}</td>
            <td class="c-driver">
              <span class="stripe"></span>
              <span class="code">{driver?.code ?? entry.driverId}</span>
              <span class="name">{driver?.name ?? ''}</span>
            </td>
            <td class="c-pts">{entry.points}</td>
            <td class="c-gap">{gap === 0 ? '—' : `-${gap}`}</td>
            <td class="c-chg">
              {#if change === null}<span class="eq">–</span>
              {:else if change > 0}<span class="up">▲{change}</span>
              {:else if change < 0}<span class="dn">▼{Math.abs(change)}</span>
              {:else}<span class="eq">–</span>{/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <table>
      <thead>
        <tr>
          <th class="c-pos">Pos</th>
          <th>Constructor</th>
          <th class="c-pts">Pts</th>
          <th class="c-gap">Gap</th>
        </tr>
      </thead>
      <tbody>
        {#each constructorStandings as c (c.constructorId)}
          {@const color = getConstructorColor(c.constructorId)}
          {@const name = getConstructorName(c.constructorId)}
          {@const gap = constructorLeader ? constructorLeader.points - c.points : 0}
          <tr animate:flip={{ duration: 280 }} style="--tc: {color}">
            <td class="c-pos">{c.position}</td>
            <td class="c-driver">
              <span class="stripe"></span>
              <span class="code" style="color: {color}">{name}</span>
            </td>
            <td class="c-pts">{c.points}</td>
            <td class="c-gap">{gap === 0 ? '—' : `-${gap}`}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
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
  .label {
    font-size: .75rem; color: var(--text-muted);
    background: var(--bg-hover); padding: .2em .55em; border-radius: 4px;
    display: inline-block; margin-top: 0.15rem;
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
  .tabs button.active { background: var(--bg-hover); color: var(--text); font-weight: 700; }

  .scroll { overflow-x: auto; max-height: 420px; overflow-y: auto; }

  table { width: 100%; border-collapse: collapse; font-size: .85rem; }

  thead th {
    padding: .45rem .8rem; text-align: left;
    color: var(--text-muted); font-size: .7rem; text-transform: uppercase; letter-spacing: .06em;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; background: var(--bg-card); z-index: 1;
  }

  tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
  tbody tr:hover { background: var(--bg-hover); }
  tbody tr:last-child { border-bottom: none; }

  td { padding: .55rem .8rem; vertical-align: middle; }

  .c-pos   { width: 36px; text-align: center; font-weight: 700; }
  .c-driver { display: flex; align-items: center; gap: .5rem; }
  .stripe   { width: 3px; height: 18px; border-radius: 2px; background: var(--tc); flex-shrink: 0; }
  .code     { font-weight: 700; font-size: .8rem; letter-spacing: .03em; min-width: 34px; }
  .name     { color: var(--text-muted); font-size: .78rem; }
  .c-pts   { width: 44px; text-align: right; font-weight: 600; }
  .c-gap   { width: 52px; text-align: right; color: var(--text-muted); font-size: .8rem; }
  .c-chg   { width: 44px; text-align: center; font-size: .8rem; font-weight: 600; }
  .up { color: var(--green); }
  .dn { color: var(--red);   }
  .eq { color: var(--text-muted); }
</style>
