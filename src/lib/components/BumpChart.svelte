<script>
  import { getDriverColor } from '../teamColors.js';
  import * as d3 from 'd3';

  let { rounds, drivers, selectedRound, showWhatIf, onRoundSelect } = $props();

  const TOP_N = 10;
  const M = { top: 16, right: 110, bottom: 36, left: 36 };
  const H = 360;

  let container = $state(null);
  let containerW = $state(700);

  $effect(() => {
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      containerW = entries[0].contentRect.width || 700;
    });
    obs.observe(container);
    return () => obs.disconnect();
  });

  let iW = $derived(Math.max(200, containerW - M.left - M.right));
  let iH = $derived(H - M.top - M.bottom);

  let topIds = $derived.by(() => {
    const last = rounds[rounds.length - 1];
    const src  = showWhatIf ? last?.whatIfStandings : last?.realStandings;
    return (src ?? []).slice(0, TOP_N).map((s) => s.driverId);
  });

  let series = $derived.by(() => {
    return topIds.map((id) => {
      const driver = drivers.find((d) => d.id === id) ?? { id, code: id, constructorId: 'unknown' };
      const positions = rounds.map((r) => {
        const src = showWhatIf ? r.whatIfStandings : r.realStandings;
        return src.find((e) => e.driverId === id)?.position ?? null;
      });
      return { id, driver, positions };
    });
  });

  let xScale = $derived(d3.scaleLinear().domain([1, Math.max(rounds.length, 2)]).range([0, iW]));
  let yScale = $derived(d3.scaleLinear().domain([1, TOP_N]).range([0, iH]));

  function makePath(positions) {
    const pts = positions
      .map((pos, i) => (pos !== null ? [xScale(i + 1), yScale(pos)] : null))
      .filter(Boolean);
    if (pts.length < 2) return '';
    return d3.line().curve(d3.curveCatmullRom)(pts) ?? '';
  }

  let xTicks = $derived(rounds.map((r, i) => ({ x: xScale(i + 1), label: `R${r.round}`, i })));
</script>

<div class="wrap" bind:this={container}>
  <svg width={containerW} height={H} aria-label="Championship positions bump chart">
    <g transform="translate({M.left},{M.top})">

      <!-- Horizontal grid -->
      {#each Array.from({ length: TOP_N }, (_, k) => k + 1) as pos}
        <line x1={0} y1={yScale(pos)} x2={iW} y2={yScale(pos)}
              stroke="#2a2a35" stroke-width="1" />
        <text x={-6} y={yScale(pos)} text-anchor="end" dominant-baseline="middle"
              fill="#7e7e95" font-size="11">P{pos}</text>
      {/each}

      <!-- X axis labels -->
      {#each xTicks as tick}
        <text
          x={tick.x} y={iH + 22}
          text-anchor="middle"
          fill={tick.i + 1 === selectedRound ? '#e8e8ec' : '#7e7e95'}
          font-size={tick.i + 1 === selectedRound ? '11' : '10'}
          font-weight={tick.i + 1 === selectedRound ? '700' : '400'}
        >{tick.label}</text>
      {/each}

      <!-- Selected-round vertical line -->
      <line
        x1={xScale(selectedRound)} y1={0}
        x2={xScale(selectedRound)} y2={iH}
        stroke="rgba(255,255,255,.18)" stroke-width="1.5" stroke-dasharray="4 4"
      />

      <!-- Driver lines + dots -->
      {#each series as { id, driver, positions }}
        {@const color = getDriverColor(driver)}
        <path d={makePath(positions)} fill="none" stroke={color}
              stroke-width="2" stroke-opacity=".85" />

        {#each positions as pos, i}
          {#if pos !== null}
            <circle
              cx={xScale(i + 1)} cy={yScale(pos)}
              r={i + 1 === selectedRound ? 7 : 4}
              fill={color}
              stroke={i + 1 === selectedRound ? '#fff' : 'none'}
              stroke-width="2"
              style="cursor:pointer"
              role="button"
              tabindex="0"
              aria-label="R{i + 1} · {driver.code} · P{pos}"
              onclick={() => onRoundSelect(i + 1)}
              onkeydown={(e) => e.key === 'Enter' && onRoundSelect(i + 1)}
            />
          {/if}
        {/each}

        <!-- Driver label at the rightmost valid position -->
        {#if positions[positions.length - 1] !== null}
          <text
            x={iW + 8} y={yScale(positions[positions.length - 1])}
            dominant-baseline="middle"
            fill={color} font-size="11" font-weight="600"
          >{driver?.code ?? id}</text>
        {/if}
      {/each}

    </g>
  </svg>
</div>

<style>
  .wrap {
    padding: 1rem;
    overflow-x: auto;
  }
  svg { display: block; }
</style>
