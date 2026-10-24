<script>
  import { getDriverColor, getFlag } from '../teamColors.js';

  let { isOpen, onClose, drivers, calendar } = $props();

  // Find next upcoming race from calendar
  let nextRace = $derived.by(() => {
    if (!calendar || calendar.length === 0) return { name: 'Upcoming Grand Prix', country: 'F1' };
    const now = new Date();
    const upcoming = calendar.find((r) => new Date(r.date) > now);
    return upcoming || calendar[calendar.length - 1];
  });

  // Default midfield drivers for P1, P2, P3
  let p1 = $state('sainz');
  let p2 = $state('alonso');
  let p3 = $state('gasly');

  let canvasEl = $state(null);
  let statusMsg = $state('');

  // Midfield drivers filter
  const TOP_TEAMS = ['red_bull', 'mclaren', 'ferrari', 'mercedes'];
  let midfieldDrivers = $derived(
    drivers.filter((d) => !TOP_TEAMS.includes(d.constructorId))
  );

  let driversMap = $derived(
    Object.fromEntries(drivers.map((d) => [d.id, d]))
  );

  function drawPodium() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    const W = 1200;
    const H = 675;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0a0a0d');
    bgGrad.addColorStop(0.5, '#121218');
    bgGrad.addColorStop(1, '#07070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Decorative glow grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Header Badge
    ctx.fillStyle = '#ff8000';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FORMULA 1.5 · 2026 MIDFIELD CHAMPIONSHIP', W / 2, 60);

    // Subtitle / Next Race
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px Inter, system-ui, sans-serif';
    const flag = getFlag(nextRace.country);
    ctx.fillText(`${nextRace.name} ${flag} · Podium Prediction`, W / 2, 115);

    ctx.fillStyle = '#7e7e95';
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillText('Excluding Red Bull, McLaren, Ferrari & Mercedes', W / 2, 150);

    // Podium Configuration: Left = P2, Center = P1, Right = P3
    const baseY = 550;
    const podiums = [
      { pos: 2, driverId: p2, x: 230, w: 220, h: 220, label: '2ND', color: '#c0c0c8', accent: '#a0a0b0' },
      { pos: 1, driverId: p1, x: 490, w: 220, h: 300, label: '1ST', color: '#ffd700', accent: '#ff8000' },
      { pos: 3, driverId: p3, x: 750, w: 220, h: 170, label: '3RD', color: '#cd7f32', accent: '#b06525' },
    ];

    for (const pod of podiums) {
      const driver = driversMap[pod.driverId] || { name: pod.driverId, code: pod.driverId, constructor: 'F1.5' };
      const teamColor = getDriverColor(driver);
      const topY = baseY - pod.h;

      // Glow behind driver
      const glow = ctx.createRadialGradient(pod.x + pod.w / 2, topY - 30, 10, pod.x + pod.w / 2, topY - 30, 120);
      glow.addColorStop(0, `${teamColor}44`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(pod.x - 30, topY - 140, pod.w + 60, 160);

      // Driver Name Card (Above Podium)
      ctx.fillStyle = '#181820';
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2;
      roundRect(ctx, pod.x + 10, topY - 110, pod.w - 20, 95, 12, true, true);

      // Team Color Stripe on card
      ctx.fillStyle = teamColor;
      roundRect(ctx, pod.x + 10, topY - 110, 6, 95, 2, true, false);

      // Driver Code & Pos Badge
      ctx.fillStyle = pod.color;
      ctx.font = '900 24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`P${pod.pos}`, pod.x + 26, topY - 78);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Inter, system-ui, sans-serif';
      ctx.fillText(driver.code, pod.x + 72, topY - 78);

      // Driver Full Name & Team
      ctx.fillStyle = '#e8e8ec';
      ctx.font = '600 17px Inter, system-ui, sans-serif';
      ctx.fillText(driver.name, pod.x + 26, topY - 50);

      ctx.fillStyle = '#7e7e95';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText(driver.constructor, pod.x + 26, topY - 28);

      // Podium Block
      const blockGrad = ctx.createLinearGradient(pod.x, topY, pod.x, baseY);
      blockGrad.addColorStop(0, '#22222c');
      blockGrad.addColorStop(1, '#15151c');
      ctx.fillStyle = blockGrad;
      ctx.strokeStyle = pod.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, pod.x, topY, pod.w, pod.h, 10, true, true);

      // Position Number on Podium
      ctx.fillStyle = pod.color;
      ctx.font = '900 72px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(pod.pos), pod.x + pod.w / 2, topY + 95);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 18px Inter, system-ui, sans-serif';
      ctx.fillText(pod.label, pod.x + pod.w / 2, topY + 130);
    }

    // Base podium floor line
    ctx.strokeStyle = '#2a2a35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, baseY);
    ctx.lineTo(W - 100, baseY);
    ctx.stroke();

    // Watermark
    ctx.fillStyle = '#555566';
    ctx.font = '15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('alt-f1 · jai-dewani.github.io/AlternateF1 · Built with Svelte 5', W / 2, H - 35);
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  $effect(() => {
    // Redraw whenever P1, P2, P3 change or modal opens
    if (isOpen && canvasEl) {
      drawPodium();
    }
  });

  function getShareCaption() {
    const d1 = driversMap[p1]?.name || 'P1';
    const d2 = driversMap[p2]?.name || 'P2';
    const d3 = driversMap[p3]?.name || 'P3';
    const flag = getFlag(nextRace.country);

    return `My 2026 F1.5 podium prediction for the ${nextRace.name} ${flag}:\n🥇 ${d1}\n🥈 ${d2}\n🥉 ${d3}\n\nBuild your midfield podium & challenge mine 👇\nhttps://jai-dewani.github.io/AlternateF1/ #F1 #F1point5 #Formula1`;
  }

  async function handleShareToX() {
    statusMsg = 'Generating image…';
    if (!canvasEl) return;

    canvasEl.toBlob(async (blob) => {
      if (!blob) return;

      // 1. Mobile Web Share API
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'f15-podium.png', { type: 'image/png' })] })) {
        try {
          await navigator.share({
            files: [new File([blob], 'f15-podium.png', { type: 'image/png' })],
            title: 'F1.5 Podium Prediction',
            text: getShareCaption(),
          });
          statusMsg = 'Shared successfully!';
          return;
        } catch (e) {
          // fallback to clipboard
        }
      }

      // 2. Desktop: Copy image to clipboard & open X intent
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        statusMsg = '✅ Podium image copied! Paste (Cmd+V) in your tweet.';
      } catch (e) {
        statusMsg = 'Downloaded image! Drag into your tweet.';
        downloadImage();
      }

      // Open Twitter Composer
      const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareCaption())}`;
      window.open(tweetUrl, '_blank', 'width=600,height=450');
    });
  }

  function downloadImage() {
    if (!canvasEl) return;
    const a = document.createElement('a');
    a.download = `f15-podium-${nextRace.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.href = canvasEl.toDataURL('image/png');
    a.click();
  }
</script>

{#if isOpen}
  <div
    class="overlay"
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    tabindex="-1"
    role="presentation"
  >
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="0"
    >
      <div class="modal-header">
        <div>
          <h3>🏆 Build Your F1.5 Podium Pick</h3>
          <p class="sub">Predict the top 3 midfield finishers for the {nextRace.name} {getFlag(nextRace.country)}</p>
        </div>
        <button class="close-btn" onclick={onClose} aria-label="Close">✕</button>
      </div>

      <!-- Driver Selectors -->
      <div class="selectors">
        <div class="select-col gold">
          <label for="p1-select">🥇 1st Place (P1)</label>
          <select id="p1-select" bind:value={p1}>
            {#each midfieldDrivers as d}
              <option value={d.id}>{d.name} ({d.constructor})</option>
            {/each}
          </select>
        </div>

        <div class="select-col silver">
          <label for="p2-select">🥈 2nd Place (P2)</label>
          <select id="p2-select" bind:value={p2}>
            {#each midfieldDrivers as d}
              <option value={d.id}>{d.name} ({d.constructor})</option>
            {/each}
          </select>
        </div>

        <div class="select-col bronze">
          <label for="p3-select">🥉 3rd Place (P3)</label>
          <select id="p3-select" bind:value={p3}>
            {#each midfieldDrivers as d}
              <option value={d.id}>{d.name} ({d.constructor})</option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Preview Canvas -->
      <div class="canvas-box">
        <canvas bind:this={canvasEl} width="1200" height="675"></canvas>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="share-btn" onclick={handleShareToX}>
          <span>𝕏</span> Share Image to X (Twitter)
        </button>
        <button class="dl-btn" onclick={downloadImage}>
          📥 Download PNG
        </button>
      </div>

      {#if statusMsg}
        <p class="status-tip">{statusMsg}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(6px);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal {
    background: #15151b;
    border: 1px solid #2a2a38;
    border-radius: 14px;
    width: 100%;
    max-width: 820px;
    max-height: 94vh;
    overflow-y: auto;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }
  h3 { font-size: 1.25rem; font-weight: 800; color: #fff; }
  .sub { font-size: 0.85rem; color: #888899; margin-top: 0.2rem; }

  .close-btn {
    background: none;
    border: none;
    color: #888899;
    font-size: 1.3rem;
    cursor: pointer;
    line-height: 1;
    padding: 0.2rem;
  }
  .close-btn:hover { color: #fff; }

  .selectors {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
  .select-col {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  label { font-size: 0.8rem; font-weight: 700; color: #aaaab8; }
  .gold label { color: #ffd700; }
  .silver label { color: #c0c0c8; }
  .bronze label { color: #cd7f32; }

  select {
    background: #1e1e28;
    border: 1px solid #2f2f3d;
    color: #fff;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  select:focus { border-color: #ff8000; }

  .canvas-box {
    background: #000;
    border: 1px solid #2a2a35;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 1.25rem;
  }
  canvas {
    width: 100%;
    height: auto;
    display: block;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .share-btn {
    flex: 2;
    background: #ffffff;
    color: #000;
    border: none;
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    font-weight: 800;
    font-size: 0.95rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s;
  }
  .share-btn:hover { background: #e0e0e0; }
  .share-btn span { font-size: 1.1rem; }

  .dl-btn {
    flex: 1;
    background: #252532;
    color: #fff;
    border: 1px solid #3a3a4c;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .dl-btn:hover { background: #323244; }

  .status-tip {
    font-size: 0.8rem;
    color: #ff8000;
    margin-top: 0.75rem;
    text-align: center;
    font-weight: 600;
  }

  @media (max-width: 650px) {
    .selectors { grid-template-columns: 1fr; }
  }
</style>
