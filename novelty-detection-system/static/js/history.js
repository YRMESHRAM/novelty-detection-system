/**
 * history.js
 * ----------
 * All logic for the Prediction History page:
 * - Load and display all predictions (GET /api/history)
 * - Filter by All / Normal / Novel
 * - Search by any column
 * - Clear all history (DELETE /api/history) with confirmation modal
 * - Load summary statistics (GET /api/statistics)
 */

'use strict';

const API_BASE = '';

// ── State ──────────────────────────────────────────────────────────────────
let allRecords     = [];   // full list from API
let filteredRecords = [];  // after filter + search
let currentFilter  = 'all';

// ── DOM ────────────────────────────────────────────────────────────────────
const tbody         = document.getElementById('history-tbody');
const tableWrapper  = document.getElementById('table-wrapper');
const tableLoading  = document.getElementById('table-loading');
const emptyState    = document.getElementById('empty-state');
const noMatchState  = document.getElementById('no-match-state');
const recordCount   = document.getElementById('record-count');

const searchInput       = document.getElementById('search-input');
const clearHistoryBtn   = document.getElementById('clear-history-btn');
const confirmOverlay    = document.getElementById('confirm-overlay');
const confirmYes        = document.getElementById('confirm-yes');
const confirmNo         = document.getElementById('confirm-no');

// Stats
const histStatTotal  = document.getElementById('hist-stat-total');
const histStatNormal = document.getElementById('hist-stat-normal');
const histStatNovel  = document.getElementById('hist-stat-novel');
const histStatRate   = document.getElementById('hist-stat-rate');


// ── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  loadStatistics();
  setupEventListeners();
});


// ── SETUP EVENTS ──────────────────────────────────────────────────────────
function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = btn.dataset.filter;
      applyFilterAndSearch();
    });
  });

  // Search
  searchInput?.addEventListener('input', () => {
    applyFilterAndSearch();
  });

  // Clear history button
  clearHistoryBtn?.addEventListener('click', () => {
    confirmOverlay?.classList.remove('hidden');
    confirmOverlay.style.display = 'flex';
  });

  // Confirm yes
  confirmYes?.addEventListener('click', async () => {
    closeConfirm();
    await clearHistory();
  });

  // Confirm no
  confirmNo?.addEventListener('click', closeConfirm);

  // Click outside modal
  confirmOverlay?.addEventListener('click', e => {
    if (e.target === confirmOverlay) closeConfirm();
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeConfirm();
  });
}

function closeConfirm() {
  confirmOverlay?.classList.add('hidden');
  if (confirmOverlay) confirmOverlay.style.display = 'none';
}


// ── LOAD HISTORY ──────────────────────────────────────────────────────────
async function loadHistory() {
  showLoading(true);

  try {
    const res  = await fetch(`${API_BASE}/api/history`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to load history.');

    allRecords = data;
    filteredRecords = [...allRecords];

    showLoading(false);

    if (allRecords.length === 0) {
      showEmptyState();
    } else {
      applyFilterAndSearch();
    }

  } catch (err) {
    showLoading(false);
    showToast(`Error loading history: ${err.message}`, 'error');
    showEmptyState();
  }
}


// ── LOAD STATISTICS ────────────────────────────────────────────────────────
async function loadStatistics() {
  try {
    const res  = await fetch(`${API_BASE}/api/statistics`);
    const data = await res.json();

    histStatTotal.textContent  = data.total_predictions;
    histStatNormal.textContent = data.normal_count;
    histStatNovel.textContent  = data.novel_count;
    histStatRate.textContent   = `${data.novelty_rate}%`;

  } catch {
    // Silently fail
  }
}


// ── FILTER + SEARCH ────────────────────────────────────────────────────────
function applyFilterAndSearch() {
  const query = (searchInput?.value || '').toLowerCase().trim();

  // Step 1: Filter by type
  let result = allRecords;
  if (currentFilter === 'normal') {
    result = allRecords.filter(r => r.prediction === 'Normal');
  } else if (currentFilter === 'novel') {
    result = allRecords.filter(r => r.prediction === 'Novel/Unusual');
  }

  // Step 2: Search across all fields
  if (query) {
    result = result.filter(r => {
      const searchable = [
        r.timestamp,
        String(r.temperature),
        String(r.pressure),
        String(r.vibration),
        String(r.speed),
        r.prediction,
        String(r.score)
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }

  filteredRecords = result;
  renderTable(filteredRecords);
}


// ── RENDER TABLE ───────────────────────────────────────────────────────────
function renderTable(records) {
  if (!tbody) return;

  // Hide all state elements first
  emptyState?.classList.add('hidden');
  noMatchState?.classList.add('hidden');
  tableWrapper?.style.removeProperty('display');

  if (allRecords.length === 0) {
    tableWrapper.style.display = 'none';
    emptyState?.classList.remove('hidden');
    recordCount.textContent = '0 records';
    return;
  }

  if (records.length === 0) {
    tableWrapper.style.display = 'none';
    noMatchState?.classList.remove('hidden');
    recordCount.textContent = 'No matches';
    return;
  }

  tableWrapper.style.display = 'block';
  recordCount.textContent = `${records.length} record${records.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = '';

  records.forEach((r, idx) => {
    const isNormal = r.prediction === 'Normal';
    const badgeHtml = isNormal
      ? `<span class="badge badge-normal">✅ Normal</span>`
      : `<span class="badge badge-novel">⚠️ Novel</span>`;

    const scoreColor = isNormal ? 'var(--normal-color)' : 'var(--novel-color)';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size: 12px;">${idx + 1}</td>
      <td style="white-space: nowrap; font-size: 13px;">${escapeHtml(r.timestamp)}</td>
      <td class="score-mono">${Number(r.temperature).toFixed(2)}</td>
      <td class="score-mono">${Number(r.pressure).toFixed(2)}</td>
      <td class="score-mono">${Number(r.vibration).toFixed(2)}</td>
      <td class="score-mono">${Number(r.speed).toFixed(2)}</td>
      <td>${badgeHtml}</td>
      <td class="score-mono" style="color: ${scoreColor};">${Number(r.score).toFixed(4)}</td>
    `;
    tbody.appendChild(tr);
  });
}


// ── CLEAR HISTORY ──────────────────────────────────────────────────────────
async function clearHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to clear history.');

    showToast('All prediction history has been cleared.', 'success');
    allRecords      = [];
    filteredRecords = [];
    renderTable([]);
    loadStatistics();

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}


// ── UI HELPERS ─────────────────────────────────────────────────────────────
function showLoading(isLoading) {
  tableLoading?.style.removeProperty('display');
  tableWrapper?.style.removeProperty('display');

  if (isLoading) {
    tableLoading && (tableLoading.style.display = 'block');
    tableWrapper && (tableWrapper.style.display = 'none');
  } else {
    tableLoading && (tableLoading.style.display = 'none');
  }
}

function showEmptyState() {
  tableWrapper && (tableWrapper.style.display   = 'none');
  tableLoading && (tableLoading.style.display   = 'none');
  emptyState?.classList.remove('hidden');
  recordCount.textContent = '0 records';
}

/** Prevent XSS by escaping HTML special characters. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
