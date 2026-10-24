<script>
  let { totalRounds, selectedRound, onSelect } = $props();

  let playing = $state(false);
  let timerId = null;

  function play() {
    if (selectedRound >= totalRounds) onSelect(1); // restart
    playing = true;
    timerId = setInterval(() => {
      if (selectedRound >= totalRounds) { pause(); return; }
      onSelect(selectedRound + 1);
    }, 750);
  }

  function pause() {
    playing = false;
    clearInterval(timerId);
    timerId = null;
  }

  function toggle() { playing ? pause() : play(); }

  $effect(() => () => clearInterval(timerId));
</script>

<div class="panel">
  <div class="head">
    <h2>Season Scrubber</h2>
  </div>
  <div class="controls">
    <button class="play" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
      {playing ? '⏸' : '▶'}
    </button>
    <div class="slider-col">
      <input
        type="range" min="1" max={totalRounds}
        value={selectedRound}
        oninput={(e) => { pause(); onSelect(+e.currentTarget.value); }}
        class="slider"
        aria-label="Select round"
      />
      <div class="labels">
        <span>R1</span>
        <span class="current">Round {selectedRound} of {totalRounds}</span>
        <span>R{totalRounds}</span>
      </div>
    </div>
  </div>
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
  .controls {
    padding: 1rem 1.1rem;
    display: flex; align-items: center; gap: 1rem;
  }
  .play {
    background: var(--accent); border: none;
    border-radius: 50%; width: 38px; height: 38px;
    font-size: .95rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background .15s;
    color: #fff;
  }
  .play:hover { background: #c00500; }
  .slider-col { flex: 1; }
  .slider {
    width: 100%; accent-color: var(--accent);
    cursor: pointer; display: block;
  }
  .labels {
    display: flex; justify-content: space-between;
    font-size: .7rem; color: var(--text-muted); margin-top: .25rem;
  }
  .current { font-weight: 600; color: var(--text); }
</style>
