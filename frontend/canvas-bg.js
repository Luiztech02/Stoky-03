/**
 * STOCKSYS — canvas-bg.js
 * Animação de fundo: grade tecnológica com partículas e linhas de conexão
 */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles, animId;

  const PARTICLE_COLOR  = '#00d4ff';
  const LINE_COLOR      = 'rgba(0, 212, 255, 0.12)';
  const ACCENT_COLOR    = 'rgba(123, 47, 255, 0.18)';
  const GRID_COLOR      = 'rgba(0, 212, 255, 0.04)';
  const GRID_SIZE       = 60;
  const N_PARTICLES     = 55;
  const MAX_DIST        = 160;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function mkParticle() {
    return {
      x:   Math.random() * W,
      y:   Math.random() * H,
      vx:  (Math.random() - 0.5) * 0.5,
      vy:  (Math.random() - 0.5) * 0.5,
      r:   Math.random() * 1.8 + 0.6,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: N_PARTICLES }, mkParticle);
  }

  function drawGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = 1 - dist / MAX_DIST;
          ctx.strokeStyle = i % 3 === 0
            ? `rgba(123,47,255,${alpha * 0.25})`
            : `rgba(0,212,255,${alpha * 0.18})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function drawParticles(t) {
    particles.forEach((p, i) => {
      p.pulse += 0.025;
      const glow = 0.6 + 0.4 * Math.sin(p.pulse);
      const radius = p.r * glow;

      // Glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 5);
      grad.addColorStop(0, i % 4 === 0 ? `rgba(123,47,255,${0.5 * glow})` : `rgba(0,212,255,${0.5 * glow})`);
      grad.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = i % 4 === 0 ? '#7b2fff' : PARTICLE_COLOR;
      ctx.fill();
    });
  }

  function moveParticles() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
  }

  // Occasional data stream effect
  let streams = [];
  function spawnStream() {
    if (Math.random() < 0.015) {
      streams.push({
        x: Math.floor(Math.random() * (W / GRID_SIZE)) * GRID_SIZE,
        y: 0,
        speed: 2 + Math.random() * 3,
        len: 80 + Math.random() * 120,
        alpha: 0.8,
      });
    }
    streams = streams.filter(s => s.y < H + s.len);
    streams.forEach(s => {
      const grad = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, `rgba(0,212,255,${s.alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - s.len);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      s.y += s.speed;
    });
  }

  function loop(t) {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    spawnStream();
    drawConnections();
    drawParticles(t);
    moveParticles();
    animId = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { resize(); });

  init();
  loop(0);
})();
