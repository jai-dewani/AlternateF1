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

  let driversMap = $derived(
    Object.fromEntries(drivers.map((d) => [d.id, d]))
  );

  let activePoll = $state('golden_ticket'); // 'golden_ticket' | 'robbed_award'

  let votes = $state({});
  let loading = $state(true);
  let userChoice = $state(null);

  const POLLS = {
    golden_ticket: {
      title: '🎟️ The F1.5 Golden Ticket',
      question: 'Which midfield driver deserves an immediate promotion to a Big 4 seat in 2027?',
      candidates: ['sainz', 'alonso', 'gasly', 'hulkenberg', 'bearman', 'colapinto'],
      badge: 'Promotion Candidate',
    },
    robbed_award: {
      title: '😤 The "Robbed by Rocket Ships" Award',
      question: 'Who lost the most Grand Prix wins and podiums to car performance disparity in 2026?',
      candidates: ['alonso', 'sainz', 'hulkenberg', 'gasly', 'bearman'],
      badge: 'Unlucky Legend',
    },
  };

  async function loadVotes() {
    loading = true;
    userChoice = hasUserVotedLocally(activePoll);
    try {
      votes = await getPollVotes(activePoll);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    loadVotes();
    const unsub = subscribeToPoll(activePoll, (newVotes) => {
      votes = newVotes;
    });
    return () => unsub();
  });

  async function handleVote(driverId) {
    if (userChoice) return; // already voted
    userChoice = driverId;
    votes = await castVote(activePoll, driverId);
  }

  let totalVotes = $derived.by(() => {
    return Object.values(votes).reduce((sum, v) => sum + v, 0);
  });

  function getPercentage(driverId) {
    if (totalVotes === 0) return 0;
    return Math.round(((votes[driverId] || 0) / totalVotes) * 100);
  }

  function getShareVoteUrl(driverId) {
    const driver = driversMap[driverId];
    const poll = POLLS[activePoll];
    const text = activePoll === 'golden_ticket'
      ? `I voted for ${driver?.name || driverId} to get the 2027 F1.5 Golden Ticket! 🎟️\n\nWithout Red Bull, McLaren, Ferrari & Merc, the midfield fight is legendary.\nCast your vote & see live results 👇\nhttps://jai-dewani.github.io/AlternateF1/ #F1 #F1point5`
      : `In my book, ${driver?.name || driverId} got completely robbed by the Big 4 rocket ships in 2026! 😤\n\nCheck the re-scored F1.5 championship standings 👇\nhttps://jai-dewani.github.io/AlternateF1/ #F1 #F1point5`;

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }
</script>

<div class="polls-panel">
  <div class="panel-head">
    <div>
      <h2>Community Fan Polls</h2>
      <p class="sub">Powered by Appwrite · Live public votes</p>
    </div>
    <div class="poll-tabs">
      <button
        class:active={activePoll === 'golden_ticket'}
        onclick={() => { activePoll = 'golden_ticket'; }}
      >Golden Ticket</button>
      <button
        class:active={activePoll === 'robbed_award'}
        onclick={() => { activePoll = 'robbed_award'; }}
      >Robbed Award</button>
    </div>
  </div>

  <div class="poll-body">
    <div class="poll-info">
      <h3>{POLLS[activePoll].title}</h3>
      <p class="question">{POLLS[activePoll].question}</p>
      {#if !isConfigured}
        <span class="offline-tag">Offline preview mode (Local storage)</span>
      {/if}
    </div>

    <div class="candidates-grid">
      {#each POLLS[activePoll].candidates as driverId}
        {@const driver = driversMap[driverId]}
        {@const color = getDriverColor(driver)}
        {@const pct = getPercentage(driverId)}
        {@const count = votes[driverId] || 0}
        {@const isSelected = userChoice === driverId}

        <div class="card" class:selected={isSelected} style="--tc: {color}">
          <div class="card-inner">
            <span class="stripe"></span>
            <div class="driver-info">
              <span class="name">{driver?.name ?? driverId}</span>
              <span class="team">{driver?.constructor ?? 'Midfield'}</span>
            </div>

            {#if userChoice}
              <div class="pct-box">
                <span class="pct">{pct}%</span>
                <span class="count">({count} votes)</span>
              </div>
            {:else}
              <button class="vote-btn" onclick={() => handleVote(driverId)}>
                Vote
              </button>
            {/if}
          </div>

          {#if userChoice}
            <div class="progress-bar">
              <div class="fill" style="width: {pct}%; background: {color};"></div>
            </div>
          {/if}

          {#if isSelected}
            <div class="voted-row">
              <span class="your-vote">✓ Your Vote</span>
              <a
                href={getShareVoteUrl(driverId)}
                target="_blank"
                rel="noopener"
                class="tweet-vote-btn"
              >
                Share Pick to 𝕏
              </a>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="footer-stats">
      <span>Total Votes: <strong>{totalVotes}</strong></span>
      {#if userChoice}
        <span class="thanks">Thanks for voting! Vote recorded.</span>
      {/if}
    </div>
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

  .poll-tabs {
    display: flex;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .poll-tabs button {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.78rem;
    padding: 0.35rem 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .poll-tabs button:hover { color: var(--text); }
  .poll-tabs button.active {
    background: var(--bg-hover);
    color: var(--text);
    font-weight: 700;
  }

  .poll-body { padding: 1.25rem; }
  .poll-info { margin-bottom: 1.25rem; }
  h3 { font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem; }
  .question { font-size: 0.85rem; color: var(--text-muted); }

  .offline-tag {
    display: inline-block;
    margin-top: 0.4rem;
    font-size: 0.7rem;
    background: rgba(255, 128, 0, 0.12);
    color: #ff8000;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 128, 0, 0.25);
  }

  .candidates-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }

  .card {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: border-color 0.15s;
  }
  .card:hover { border-color: #3f3f50; }
  .card.selected { border-color: var(--tc); background: rgba(255, 255, 255, 0.02); }

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

  .voted-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.25rem;
    font-size: 0.75rem;
  }
  .your-vote { color: #3cb371; font-weight: 700; }
  .tweet-vote-btn {
    color: #fff;
    background: #1d9bf0;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
  }
  .tweet-vote-btn:hover { background: #0c85d0; text-decoration: none; }

  .footer-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 1rem;
    border-top: 1px solid var(--border);
    padding-top: 0.75rem;
  }
  .footer-stats strong { color: #fff; }
  .thanks { color: #3cb371; font-weight: 600; }
</style>
