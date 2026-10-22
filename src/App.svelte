<script>
  let season = $state(null);
  let loading = $state(true);
  let error = $state(null);

  async function loadSeason() {
    try {
      const res = await fetch('./data/season.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      season = await res.json();
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadSeason();
  });
</script>

{#if loading}
  <p>Loading season data…</p>
{:else if error}
  <p>Error: {error}</p>
{:else}
  <h1>F1 2026: What If Antonelli Never Raced?</h1>
  <p>Last updated: {season.meta.generatedAt}</p>
  <p>{season.rounds.length} rounds loaded.</p>
{/if}
