<script>
  import { fly } from 'svelte/transition';
  let { newLeader, prevLeader } = $props();
</script>

<div class="banner" transition:fly={{ y: -16, duration: 380, opacity: 0 }}>
  <span class="crown">👑</span>
  <p>
    <strong>{newLeader?.name ?? newLeader?.code ?? 'Unknown'}</strong>
    takes the What-If lead from
    <strong>{prevLeader?.name ?? prevLeader?.code ?? 'Unknown'}!</strong>
  </p>
</div>

<style>
  .banner {
    display: flex; align-items: center; gap: .75rem;
    background: linear-gradient(135deg, #1f1500, #2a1e00);
    border: 1px solid var(--accent-2);
    border-radius: var(--radius);
    padding: .7rem 1.2rem;
  }
  .crown { font-size: 1.4rem; flex-shrink: 0; }
  p  { font-size: .9rem; }
  strong { color: var(--accent-2); }
</style>
