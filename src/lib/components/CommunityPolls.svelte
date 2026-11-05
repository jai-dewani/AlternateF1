<script>
  import { getDriverColor } from '../teamColors.js';
  import {
    getPollVotes,
    castVote,
    subscribeToPoll,
    hasUserVotedLocally,
    isConfigured,
  } from '../appwrite.js';

  let { drivers } = $props();

  const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];

  let midfieldDrivers = $derived(
    drivers.filter((d) => !TOP_TEAMS.includes(d.constructorId))
  );

  const POLLS = {
    golden_ticket: {
      title: '🎟️ The F1.5 Golden Ticket',
      question: 'Which midfield driver deserves an immediate promotion to a Big 4 seat in 2027?',
    },
    robbed_award: {
      title: '😤 The "Robbed by Rocket Ships" Award',
      question: 'Who lost the most Grand Prix wins and podiums to car performance disparity in 2026?',
    },
  };

  let pollVotes = $state({
    golden_ticket: {},
    robbed_award: {},
  });

  let userChoices = $state({
    golden_ticket: hasUserVotedLocally('golden_ticket'),
    robbed_award: hasUserVotedLocally('robbed_award'),
  });

  let loading = $state(true);

  async function loadAllVotes() {
    loading = true;
    try {
      const [gt, ra] = await Promise.all([
        getPollVotes('golden_ticket'),
        getPollVotes('robbed_award'),
      ]);
      pollVotes.golden_ticket = gt || {};
      pollVotes.robbed_award = ra || {};
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadAllVotes();
    const unsub1 = subscribeToPoll('golden_ticket', (v) => {
      pollVotes.golden_ticket = v;
    });
    const unsub2 = subscribeToPoll('robbed_award', (v) => {
      pollVotes.robbed_award = v;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  async function handleVote(pollId, driverId) {
    const previousChoice = userChoices[pollId];
    if (previousChoice === driverId) return; // already selected

    userChoices[pollId] = driverId;
    pollVotes[pollId] = await castVote(pollId, driverId, previousChoice);
  }

  function getTotalVotes(pollId) {
    return Object.values(pollVotes[pollId] || {}).reduce((sum, v) => sum + v, 0);
  }

  function getPercentage(pollId, driverId) {
    const total = getTotalVotes(pollId);
    if (total === 0) return 0;
    return Math.round(((pollVotes[pollId]?.[driverId] || 0) / total) * 100);
  }
</script>

<div class="polls-panel">
  <div class="panel-head">
    <div>
      <h2>Community Fan Polls</h2>
      <p class="sub">Powered by Appwrite · Live public votes</p>
    </div>
    {#if !isConfigured}
      <span class="offline-tag">Offline preview mode (Local storage)</span>
    {/if}
  </div>

  <div class="polls-grid">
    {#each Object.entries(POLLS) as [pollId, poll]}
      <div class="poll-column">
        <div class="poll-info">
          <h3>{poll.title}</h3>
          <p class="question">{poll.question}</p>
        </div>

        <div class="candidates-grid">
          {#each midfieldDrivers as driver}
            {@const driverId = driver.id}
            {@const color = getDriverColor(driver)}
            {@const pct = getPercentage(pollId, driverId)}
            {@const count = pollVotes[pollId]?.[driverId] || 0}
            {@const isSelected = userChoices[pollId] === driverId}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              class="card"
              class:selected={isSelected}
              class:interactive={!isSelected}
              style="--tc: {color}"
              onclick={() => handleVote(pollId, driverId)}
              role="button"
              tabindex="0"
              aria-label="Vote for {driver.name}"
            >
              <div class="card-inner">
                <span class="stripe"></span>
                <div class="driver-info">
                  <span class="name">{driver.name}</span>
                  <span class="team">{driver.constructor ?? 'Midfield'}</span>
                </div>

                {#if userChoices[pollId]}
                  <div class="pct-box">
                    <span class="pct">{pct}%</span>
                    <span class="count">({count} votes)</span>
                  </div>

                  {#if isSelected}
                    <span class="picked-badge">✓ Voted</span>
                  {:else}
                    <button
                      class="switch-btn"
                      onclick={(e) => { e.stopPropagation(); handleVote(pollId, driverId); }}
                    >
                      Vote
                    </button>
                  {/if}
                {:else}
                  <button
                    class="vote-btn"
                    onclick={(e) => { e.stopPropagation(); handleVote(pollId, driverId); }}
                  >
                    Vote
                  </button>
                {/if}
              </div>

              {#if userChoices[pollId]}
                <div class="progress-bar">
                  <div class="fill" style="width: {pct}%; background: {color};"></div>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="footer-stats">
          <span>Total Votes: <strong>{getTotalVotes(pollId)}</strong></span>
          {#if userChoices[pollId]}
            <span class="hint">Click any driver to switch your vote</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .polls-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  h2 { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .sub { font-size: 0.75rem; color: var(--text-muted); }

  .offline-tag {
    display: inline-block;
    font-size: 0.7rem;
    background: rgba(255, 128, 0, 0.12);
    color: #ff8000;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 128, 0, 0.25);
  }

  .polls-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    padding: 1.25rem;
  }
  @media (max-width: 900px) {
    .polls-grid {
      grid-template-columns: 1fr;
    }
  }

  .poll-column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.25rem;
  }

  .poll-info h3 { font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem; }
  .question { font-size: 0.85rem; color: var(--text-muted); min-height: 2.5rem; }

  .candidates-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 480px;
    overflow-y: auto;
    padding-right: 6px;
  }

  /* Custom subtle scrollbar */
  .candidates-grid::-webkit-scrollbar {
    width: 6px;
  }
  .candidates-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 3px;
  }
  .candidates-grid::-webkit-scrollbar-thumb {
    background: #2a2a35;
    border-radius: 3px;
  }
  .candidates-grid::-webkit-scrollbar-thumb:hover {
    background: #3f3f50;
  }

  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.15s ease;
    cursor: default;
    user-select: none;
  }
  .card.interactive {
    cursor: pointer;
  }
  .card.interactive:hover {
    border-color: #4a4a5e;
    background: var(--bg-hover);
  }
  .card.selected {
    border-color: var(--tc);
    background: rgba(255, 255, 255, 0.03);
  }

  .card-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .stripe { width: 3px; height: 32px; border-radius: 2px; background: var(--tc); flex-shrink: 0; }
  .driver-info { flex: 1; min-width: 0; }
  .name { display: block; font-weight: 700; font-size: 0.9rem; color: #fff; }
  .team { font-size: 0.75rem; color: var(--text-muted); }

  .vote-btn {
    background: var(--bg-hover);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 0.35rem 0.85rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .vote-btn:hover {
    background: #ff8000;
    color: #000;
    border-color: #ff8000;
  }

  .switch-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: 0.25rem 0.65rem;
    border-radius: 5px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    margin-left: 0.5rem;
  }
  .card:hover .switch-btn {
    background: #ff8000;
    color: #000;
    border-color: #ff8000;
  }

  .picked-badge {
    color: #3cb371;
    font-weight: 700;
    font-size: 0.78rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: rgba(60, 179, 113, 0.12);
    border: 1px solid rgba(60, 179, 113, 0.25);
    margin-left: 0.5rem;
  }

  .pct-box { text-align: right; }
  .pct { font-size: 1.1rem; font-weight: 800; color: #fff; }
  .count { display: block; font-size: 0.7rem; color: var(--text-muted); }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: var(--bg-hover);
    border-radius: 3px;
    overflow: hidden;
  }
  .fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

  .footer-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: auto;
    border-top: 1px solid var(--border);
    padding-top: 0.75rem;
  }
  .footer-stats strong { color: #fff; }
  .hint { color: var(--text-muted); font-size: 0.72rem; }
</style>
