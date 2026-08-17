/**
 * main.js
 * --------
 * Shared JavaScript utilities used across all pages.
 * - Navbar toggle (mobile menu)
 * - Toast notification system
 * - Hero canvas animation (index page only)
 */

'use strict';

// ── Navbar Mobile Toggle ───────────────────────────────────────────────────
(function initNavbar() {
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu when a link is clicked
  links.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();


// ── Toast Notification System ──────────────────────────────────────────────
/**
 * Show a toast notification.
 * @param {string} message  - Text to display
 * @param {'success'|'error'|'info'} type - Visual style
 * @param {number} duration - Auto-dismiss in ms (default 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after duration + animation
  setTimeout(() => {
    toast.remove();
  }, duration + 400);
}

// Expose globally
window.showToast = showToast;


// ── Hero Canvas Animation (index page only) ────────────────────────────────
(function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W   = canvas.width;
  const H   = canvas.height;

  // ── Particles ──────────────────────────────────────────────
  const PARTICLE_COUNT = 60;
  const particles = [];

  const palette = [
    'rgba(99,102,241,',    // indigo
    'rgba(6,182,212,',     // cyan
    'rgba(16,185,129,',    // green
    'rgba(245,158,11,',    // amber
  ];

  function randomPalette() {
    return palette[Math.floor(Math.random() * palette.length)];
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x:       Math.random() * W,
      y:       Math.random() * H,
      r:       Math.random() * 4 + 1,
      vx:      (Math.random() - 0.5) * 0.7,
      vy:      (Math.random() - 0.5) * 0.7,
      color:   randomPalette(),
      alpha:   Math.random() * 0.6 + 0.2,
      // Mark ~10% as "anomalies"
      anomaly: Math.random() < 0.1,
    });
  }

  // ── Animated Grid Lines ────────────────────────────────────
  let gridOffset = 0;

  function drawGrid() {
    ctx.strokeStyle = 'rgba(99,102,241,0.08)';
    ctx.lineWidth   = 1;

    const spacing = 40;
    const offset  = gridOffset % spacing;

    // Vertical lines
    for (let x = offset; x < W; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = offset; y < H; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  // ── Draw connections between nearby particles ──────────────
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 90) {
          ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 90)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  // ── Render loop ────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    gridOffset += 0.3;

    drawConnections();

    // Particles
    particles.forEach(p => {
      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off walls
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;

      // Draw
      ctx.beginPath();
      if (p.anomaly) {
        // Anomaly = square with glow
        ctx.shadowBlur  = 12;
        ctx.shadowColor = 'rgba(245,158,11,0.8)';
        ctx.fillStyle   = `rgba(245,158,11,${p.alpha})`;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2.5, p.r * 2.5);
        ctx.shadowBlur = 0;
      } else {
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
      }
    });

    // Label overlay
    ctx.fillStyle = 'rgba(99,102,241,0.6)';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('• Normal   ■ Anomaly', 16, H - 16);

    requestAnimationFrame(render);
  }

  render();
})();
