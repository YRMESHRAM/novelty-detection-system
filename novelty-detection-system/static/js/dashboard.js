/**
 * dashboard.js
 * ------------
 * All logic for the Dashboard page:
 * - Form validation
 * - POST /api/predict
 * - Render result card
 * - Load statistics (GET /api/statistics)
 * - Render Chart.js charts (GET /api/chart-data)
 */

'use strict';

const API_BASE = '';  // Flask runs on same origin

// ─────────────────────────────────────────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────────────────────────────────────────
const form         = document.getElementById('predict-form');
const analyzeBtn   = document.getElementById('analyze-btn');
const analyzeBtnTx = document.getElementById('analyze-btn-text');
const analyzeSpn   = document.getElementById('analyze-spinner');
const clearBtn     = document.getElementById('clear-btn');
const fillNormal   = document.getElementById('fill-normal');
const fillUnusual  = document.getElementById('fill-unusual');

const resultCard    = document.getElementById('result-card');
const resultHeader  = document.getElementById('result-header');
const resultIcon    = document.getElementById('result-icon');
const resultTitle   = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');

const resultPred     = document.getElementById('result-prediction');
const resultScore    = document.getElementById('result-score');
const resultTemp     = document.getElementById('result-temp');
const resultPressure = document.getElementById('result-pressure');
const resultVib      = document.getElementById('result-vibration');
const resultSpd      = document.getElementById('result-speed');
const scoreBarFill   = document.getElementById('score-bar-fill');
const scoreBarPct    = document.getElementById('score-bar-pct');
const novelWarning   = document.getElementById('novel-warning');

// Stats
const statTotal  = document.getElementById('stat-total');
const statNormal = document.getElementById('stat-normal');
const statNovel  = document.getElementById('stat-novel');
const statRate   = document.getElementById('stat-rate');


// ─────────────────────────────────────────────────────────────────────────────
// CHART INSTANCES
// ─────────────────────────────────────────────────────────────────────────────
let doughnutChart = null;
let lineChart     = null;
let scatterChart  = null;


// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStatistics();
  loadCharts();
  initDoughnutPlaceholder();
  initLinePlaceholder();
  initScatterPlaceholder();
  setupFormEvents();
});


// ─────────────────────────────────────────────────────────────────────────────
// FORM EVENTS
// ─────────────────────────────────────────────────────────────────────────────
function setupFormEvents() {
  if (!form) return;

  form.addEventListener('submit', handleSubmit);

  clearBtn?.addEventListener('click', () => {
    form.reset();
    clearValidationErrors();
    resultCard.classList.remove('visible');
    resultCard.style.display = 'none';
  });

  fillNormal?.addEventListener('click', () => {
    document.getElementById('input-temperature').value = 25;
    document.getElementById('input-pressure').value    = 100;
    document.getElementById('input-vibration').value   = 3;
    document.getElementById('input-speed').value       = 55;
    clearValidationErrors();
  });

  fillUnusual?.addEventListener('click', () => {
    document.getElementById('input-temperature').value = 90;
    document.getElementById('input-pressure').value    = 175;
    document.getElementById('input-vibration').value   = 22;
    document.getElementById('input-speed').value       = 130;
    clearValidationErrors();
  });

  // Clear individual error on input
  ['input-temperature', 'input-pressure', 'input-vibration', 'input-speed'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', () => el.classList.remove('error'));
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// FORM VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
function validateInputs() {
  const fields = [
    { id: 'input-temperature', name: 'Temperature', min: -50,  max: 500  },
    { id: 'input-pressure',    name: 'Pressure',    min:   0,  max: 1000 },
    { id: 'input-vibration',   name: 'Vibration',   min:   0,  max: 500  },
    { id: 'input-speed',       name: 'Speed',       min:   0,  max: 500  },
  ];

  let valid = true;
  const errors = [];

  fields.forEach(f => {
    const el  = document.getElementById(f.id);
    const raw = el.value.trim();

    if (raw === '') {
      el.classList.add('error');
      errors.push(`${f.name} is required.`);
      valid = false;
      return;
    }

    const val = parseFloat(raw);
    if (isNaN(val)) {
      el.classList.add('error');
      errors.push(`${f.name} must be a number.`);
      valid = false;
      return;
    }

    if (val < f.min || val > f.max) {
      el.classList.add('error');
      errors.push(`${f.name} must be between ${f.min} and ${f.max}.`);
      valid = false;
    }
  });

  if (!valid) {
    showToast(errors[0], 'error');
  }

  return valid;
}

function clearValidationErrors() {
  ['input-temperature', 'input-pressure', 'input-vibration', 'input-speed'].forEach(id => {
    document.getElementById(id)?.classList.remove('error');
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  clearValidationErrors();

  if (!validateInputs()) return;

  const payload = {
    temperature: parseFloat(document.getElementById('input-temperature').value),
    pressure:    parseFloat(document.getElementById('input-pressure').value),
    vibration:   parseFloat(document.getElementById('input-vibration').value),
    speed:       parseFloat(document.getElementById('input-speed').value),
  };

  // Loading state
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/api/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unknown server error.');
    }

    renderResult(data);
    showToast(
      data.status === 'normal' ? 'Normal pattern detected.' : '⚠️ Novel pattern detected!',
      data.status === 'normal' ? 'success' : 'error'
    );

    // Refresh stats + charts
    loadStatistics();
    loadCharts();

  } catch (err) {
    if (err.message === 'Failed to fetch') {
      showToast('Unable to connect to the server. Is Flask running?', 'error');
    } else {
      showToast(`Error: ${err.message}`, 'error');
    }
  } finally {
    setLoading(false);
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// LOADING STATE
// ─────────────────────────────────────────────────────────────────────────────
function setLoading(isLoading) {
  if (!analyzeBtn) return;
  analyzeBtn.disabled      = isLoading;
  analyzeBtnTx.textContent = isLoading ? 'Analyzing...' : '⚡ Analyze Pattern';
  analyzeSpn.classList.toggle('hidden', !isLoading);
}


// ─────────────────────────────────────────────────────────────────────────────
// RENDER RESULT CARD
// ─────────────────────────────────────────────────────────────────────────────
function renderResult(data) {
  const isNormal = data.status === 'normal';

  // Show card
  resultCard.style.display = 'block';
  resultCard.classList.add('visible');

  // Icon & title
  resultIcon.className  = `result-icon ${isNormal ? 'normal' : 'novel'}`;
  resultIcon.textContent = isNormal ? '✓' : '⚠';
  resultTitle.className  = `result-title ${isNormal ? 'normal' : 'novel'}`;
  resultTitle.textContent = isNormal ? '✓ NORMAL PATTERN' : '⚠ NOVEL / UNUSUAL PATTERN';
  resultMessage.textContent = data.message;

  // Values
  resultPred.textContent     = data.prediction;
  resultPred.style.color     = isNormal ? 'var(--normal-color)' : 'var(--novel-color)';
  resultScore.textContent    = data.score.toFixed(4);
  resultTemp.textContent     = `${data.inputs.temperature} °C`;
  resultPressure.textContent = `${data.inputs.pressure} hPa`;
  resultVib.textContent      = `${data.inputs.vibration} mm/s`;
  resultSpd.textContent      = `${data.inputs.speed} RPM`;

  // Score bar — decision_function range roughly [-0.5, 0.5]
  // We map to [0%..100%]: more negative = higher anomaly %
  const pct = Math.min(100, Math.max(0, Math.round((0.5 - data.score) / 1.0 * 100)));
  scoreBarFill.style.width = `${pct}%`;
  scoreBarFill.className   = `score-bar-fill ${isNormal ? 'normal' : 'novel'}`;
  scoreBarPct.textContent  = `${pct}%`;

  // Novel warning
  novelWarning.classList.toggle('hidden', isNormal);

  // Scroll into view
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// ─────────────────────────────────────────────────────────────────────────────
// LOAD STATISTICS
// ─────────────────────────────────────────────────────────────────────────────
async function loadStatistics() {
  try {
    const res  = await fetch(`${API_BASE}/api/statistics`);
    const data = await res.json();

    animateCounter(statTotal,  0, data.total_predictions);
    animateCounter(statNormal, 0, data.normal_count);
    animateCounter(statNovel,  0, data.novel_count);
    statRate.textContent = `${data.novelty_rate}%`;

  } catch {
    // Silently fail — stats will just show dashes
  }
}

/** Animate a number counter element from `from` to `to`. */
function animateCounter(el, from, to) {
  if (!el) return;
  const duration = 600;
  const start    = performance.now();

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased  = 1 - Math.pow(1 - progress, 3);  // ease-out cubic
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}


// ─────────────────────────────────────────────────────────────────────────────
// CHART.JS CHARTS
// ─────────────────────────────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
    },
    tooltip: {
      backgroundColor: '#111827',
      borderColor:     'rgba(99,102,241,0.3)',
      borderWidth:     1,
      titleColor:      '#f1f5f9',
      bodyColor:       '#94a3b8',
    }
  },
  scales: {
    x: {
      ticks:  { color: '#64748b', font: { size: 11 } },
      grid:   { color: 'rgba(255,255,255,0.04)' }
    },
    y: {
      ticks:  { color: '#64748b', font: { size: 11 } },
      grid:   { color: 'rgba(255,255,255,0.04)' }
    }
  }
};


// ── Placeholder charts (shown before data arrives) ─────────────────────────
function initDoughnutPlaceholder() {
  const ctx = document.getElementById('chart-doughnut')?.getContext('2d');
  if (!ctx) return;

  doughnutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   ['Normal', 'Novel/Unusual'],
      datasets: [{
        data:            [1, 0],
        backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)'],
        borderColor:     ['rgba(16,185,129,1)',    'rgba(245,158,11,1)'],
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: CHART_DEFAULTS.plugins.tooltip,
      }
    }
  });

  renderDoughnutLegend(1, 0);
}

function renderDoughnutLegend(normal, novel) {
  const el = document.getElementById('doughnut-legend');
  if (!el) return;
  el.innerHTML = `
    <span style="display:flex;align-items:center;gap:6px;color:#94a3b8;">
      <span style="width:10px;height:10px;border-radius:50%;background:#10b981;display:inline-block;"></span>
      Normal (${normal})
    </span>
    <span style="display:flex;align-items:center;gap:6px;color:#94a3b8;">
      <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
      Novel (${novel})
    </span>
  `;
}

function initLinePlaceholder() {
  const ctx = document.getElementById('chart-line')?.getContext('2d');
  if (!ctx) return;

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   ['No data yet'],
      datasets: [{
        label:           'Anomaly Score',
        data:            [0],
        borderColor:     'rgba(99,102,241,0.9)',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension:         0.4,
        fill:            true,
        pointBackgroundColor: 'rgba(99,102,241,1)',
        pointRadius:     4,
      }]
    },
    options: { ...CHART_DEFAULTS }
  });
}

function initScatterPlaceholder() {
  const ctx = document.getElementById('chart-scatter')?.getContext('2d');
  if (!ctx) return;

  scatterChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label:           'Normal',
          data:            [],
          backgroundColor: 'rgba(16,185,129,0.6)',
          borderColor:     'rgba(16,185,129,1)',
          pointRadius:     5,
        },
        {
          label:           'Novel/Unusual',
          data:            [],
          backgroundColor: 'rgba(245,158,11,0.7)',
          borderColor:     'rgba(245,158,11,1)',
          pointRadius:     7,
          pointStyle:      'rectRot',
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx => `Temp: ${ctx.parsed.x}°C, Pressure: ${ctx.parsed.y} hPa`
          }
        }
      },
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, title: { display: true, text: 'Temperature (°C)', color: '#64748b' } },
        y: { ...CHART_DEFAULTS.scales.y, title: { display: true, text: 'Pressure (hPa)',   color: '#64748b' } },
      }
    }
  });
}


// ── Load and refresh all charts ────────────────────────────────────────────
async function loadCharts() {
  try {
    const [statsRes, chartRes] = await Promise.all([
      fetch(`${API_BASE}/api/statistics`),
      fetch(`${API_BASE}/api/chart-data`)
    ]);

    const stats     = await statsRes.json();
    const chartData = await chartRes.json();

    updateDoughnut(stats.normal_count, stats.novel_count);
    updateLineChart(chartData.labels, chartData.scores, chartData.statuses);
    updateScatterChart(chartData.scatter);

  } catch {
    // Charts stay as placeholders if no data
  }
}

function updateDoughnut(normal, novel) {
  if (!doughnutChart) return;
  const total = normal + novel;
  doughnutChart.data.datasets[0].data = total === 0 ? [1, 0] : [normal, novel];
  doughnutChart.update();
  renderDoughnutLegend(normal, novel);
}

function updateLineChart(labels, scores, statuses) {
  if (!lineChart || !labels.length) return;

  // Shorten timestamps to HH:MM:SS
  const shortLabels = labels.map(l => {
    const parts = l.split(' ');
    return parts[1] || parts[0];
  });

  // Color each point based on status
  const pointColors = (statuses || []).map(s =>
    s === 'Normal' ? 'rgba(16,185,129,1)' : 'rgba(245,158,11,1)'
  );

  lineChart.data.labels                                  = shortLabels;
  lineChart.data.datasets[0].data                        = scores;
  lineChart.data.datasets[0].pointBackgroundColor        = pointColors;
  lineChart.data.datasets[0].pointBorderColor            = pointColors;
  lineChart.update();
}

function updateScatterChart(scatter) {
  if (!scatterChart || !scatter.length) return;

  const normalPts = scatter.filter(p => p.status === 'normal').map(p => ({ x: p.x, y: p.y }));
  const novelPts  = scatter.filter(p => p.status === 'novel').map( p => ({ x: p.x, y: p.y }));

  scatterChart.data.datasets[0].data = normalPts;
  scatterChart.data.datasets[1].data = novelPts;
  scatterChart.update();
}
