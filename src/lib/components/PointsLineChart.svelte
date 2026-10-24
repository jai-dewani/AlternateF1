<script>
  import { getDriverColor } from '../teamColors.js';
  import Chart from 'chart.js/auto';

  let { rounds, drivers, selectedRound, showWhatIf, onRoundSelect } = $props();

  let canvas = $state(null);

  function buildDatasets(_drivers, _rounds, _showWhatIf, _selectedRound) {
    // Only include drivers who have scored at least 1 point
    const scorers = _drivers.filter((d) =>
      _rounds.some((r) => {
        const s = _showWhatIf ? r.whatIfStandings : r.realStandings;
        return s.some((e) => e.driverId === d.id && e.points > 0);
      })
    );

    return scorers.map((driver) => {
      const color = getDriverColor(driver);
      const data = _rounds.map((r) => {
        const s = _showWhatIf ? r.whatIfStandings : r.realStandings;
        const e = s.find((x) => x.driverId === driver.id);
        return e?.points ?? null;
      });
      return {
        label: driver.code,
        data,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: data.map((_, i) => (i === _selectedRound - 1 ? 7 : 3)),
        pointBackgroundColor: color,
        pointBorderColor: data.map((_, i) => (i === _selectedRound - 1 ? '#fff' : color)),
        pointBorderWidth: data.map((_, i) => (i === _selectedRound - 1 ? 2 : 0)),
        tension: 0.35,
        spanGaps: true,
      };
    });
  }

  $effect(() => {
    if (!canvas) return;

    // Declare reactive deps
    const _showWhatIf    = showWhatIf;
    const _rounds        = rounds;
    const _selectedRound = selectedRound;
    const _drivers       = drivers;

    const datasets = buildDatasets(_drivers, _rounds, _showWhatIf, _selectedRound);

    const c = new Chart(canvas, {
      type: 'line',
      data: {
        labels: _rounds.map((r) => `R${r.round}`),
        datasets,
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        onClick(_evt, elements) {
          if (elements.length > 0) onRoundSelect(elements[0].index + 1);
        },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#7e7e95',
              boxWidth: 10,
              font: { size: 10, family: 'Inter, system-ui, sans-serif' },
              padding: 6,
            },
          },
          tooltip: {
            backgroundColor: '#18181d',
            borderColor: '#2a2a35',
            borderWidth: 1,
            titleColor: '#e8e8ec',
            bodyColor: '#7e7e95',
            itemSort: (a, b) => (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
            callbacks: {
              title: ([item]) => `R${item.dataIndex + 1}: ${_rounds[item.dataIndex]?.name}`,
              label: (item) => ` ${item.dataset.label}: ${item.parsed.y ?? 0} pts`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#7e7e95', font: { size: 10 }, maxRotation: 0 },
            grid:  { color: '#2a2a35' },
          },
          y: {
            ticks: { color: '#7e7e95', font: { size: 10 } },
            grid:  { color: '#2a2a35' },
            title: { display: true, text: 'Points', color: '#7e7e95', font: { size: 10 } },
          },
        },
      },
    });

    return () => c.destroy();
  });
</script>

<div class="wrap">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .wrap {
    height: 380px;
    padding: 1rem;
    position: relative;
  }
  canvas { width: 100% !important; }
</style>
