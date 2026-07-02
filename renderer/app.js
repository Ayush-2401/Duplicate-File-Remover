/* ══════════════════════════════════════════════════════════
   DUPLICATE FILE REMOVER — Frontend Logic
   ══════════════════════════════════════════════════════════ */

'use strict';

const api = window.electronAPI;

// ─── State ───────────────────────────────────────────────
let sourceFolders  = [];
let destinationDir = null;
let scanData       = null;

// ─── DOM helpers ─────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── Screen transitions ───────────────────────────────────
function goToScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    if (s.classList.contains('active')) {
      s.classList.remove('active');
      s.classList.add('exit-left');
      setTimeout(() => s.classList.remove('exit-left'), 400);
    }
  });
  setTimeout(() => {
    const next = $(id);
    next.classList.add('active');
  }, 50);
}

// ─── Title bar controls ───────────────────────────────────
$('btn-min').addEventListener('click',   () => api.minimize());
$('btn-max').addEventListener('click',   () => api.maximize());
$('btn-close').addEventListener('click', () => api.close());

// ─── Format helpers ───────────────────────────────────────
function fmtSize(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1048576)     return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824)  return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function fmtTime(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '< 1s';
  if (seconds < 60)  return Math.round(seconds) + 's';
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ══════════════════════════════════════════════════════════
// SCREEN 1 — SETUP
// ══════════════════════════════════════════════════════════

function renderSourceList() {
  const list   = $('source-list');
  const empty  = $('source-empty');
  const badge  = $('folder-count-badge');
  const clearBtn = $('btn-clear-all');

  // Clear existing items (keep empty state node)
  Array.from(list.children).forEach(c => {
    if (c !== empty) c.remove();
  });

  // Update badge & clear-all visibility
  if (sourceFolders.length === 0) {
    empty.style.display   = 'flex';
    badge.style.display   = 'none';
    clearBtn.style.display = 'none';
    return;
  }
  empty.style.display    = 'none';
  badge.style.display    = 'inline-flex';
  badge.textContent      = sourceFolders.length;
  clearBtn.style.display = 'inline-block';

  sourceFolders.forEach((fp, idx) => {
    const item = document.createElement('div');
    item.className = 'folder-item';
    item.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
        <path d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              stroke="currentColor" stroke-width="1.8"/>
      </svg>
      <span class="folder-item-path" title="${fp}">${fp}</span>
      <button class="folder-item-remove" data-idx="${idx}" title="Remove">✕</button>
    `;
    list.appendChild(item);
  });

  // Remove buttons
  list.querySelectorAll('.folder-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      sourceFolders.splice(Number(btn.dataset.idx), 1);
      renderSourceList();
    });
  });
}

// Add source folders via native dialog
$('btn-add-sources').addEventListener('click', async () => {
  const paths = await api.pickFolder();
  paths.forEach(p => {
    if (!sourceFolders.includes(p)) sourceFolders.push(p);
  });
  renderSourceList();
});

// Clear all folders
$('btn-clear-all').addEventListener('click', () => {
  sourceFolders = [];
  renderSourceList();
});

// Drag & drop folders from Windows Explorer
const dropZone = $('drop-zone');
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', (e) => {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('drag-over');
  }
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files);
  files.forEach(f => {
    // In Electron, f.path gives the real file system path
    const p = f.path;
    if (p && !sourceFolders.includes(p)) sourceFolders.push(p);
  });
  renderSourceList();
});

// Pick destination
$('btn-pick-dest').addEventListener('click', async () => {
  const p = await api.pickDestination();
  if (p) {
    destinationDir = p;
    const el = $('dest-path-text');
    el.textContent = p;
    el.classList.remove('dest-placeholder');
    el.classList.add('dest-path-text');
  }
});

// ── Scan ────────────────────────────────────────────────
$('btn-scan').addEventListener('click', async () => {
  if (sourceFolders.length === 0) {
    alert('Please add at least one source folder.');
    return;
  }
  if (!destinationDir) {
    alert('Please choose a destination folder.');
    return;
  }

  const btn = $('btn-scan');
  btn.disabled = true;
  btn.innerHTML = `<span class="scan-spinner">Scanning… <span id="scan-prog-text"></span></span>`;

  api.removeAllListeners('scan-progress');
  api.onScanProgress((d) => {
    const txt = $('scan-prog-text');
    if (txt) {
      txt.textContent = `(${d.count.toLocaleString()}) - ${d.status}`;
    }
  });

  try {
    const recursive = $('opt-recursive').checked;
    const result = await api.scanFolders({ sourceFolders, recursive });
    scanData = result;
    showScanResults(result);
    goToScreen('screen-results');
  } catch (err) {
    alert('Scan error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="M21 21l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Scan Folders`;
  }
});

// ══════════════════════════════════════════════════════════
// SCREEN 2 — SCAN RESULTS
// ══════════════════════════════════════════════════════════

function showScanResults(data) {
  $('stat-total').textContent  = data.totalFound.toLocaleString();
  $('stat-unique').textContent = data.uniqueCount.toLocaleString();
  $('stat-dupe').textContent   = data.duplicateCount.toLocaleString();

  // Fill duplicate table
  const tbody = $('dupe-tbody');
  tbody.innerHTML = '';

  if (data.duplicates.length === 0) {
    $('dupe-empty').style.display = 'flex';
    return;
  }
  $('dupe-empty').style.display = 'none';

  // Build a map of unique files for "duplicate of" display
  const uniqueMap = new Map();
  data.uniqueFiles.forEach(f => uniqueMap.set(f.hash, f.path));

  data.duplicates.slice(0, 500).forEach(f => {
    const original = uniqueMap.get(f.hash) || '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="file-name" title="${f.name}">${f.name}</td>
      <td>${fmtSize(f.size)}</td>
      <td title="${original}" style="color:var(--text-dim)">${original}</td>
    `;
    tbody.appendChild(tr);
  });

  if (data.duplicates.length > 500) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" style="text-align:center;color:var(--text-dim);padding:10px">
      … and ${(data.duplicates.length - 500).toLocaleString()} more duplicates not shown
    </td>`;
    tbody.appendChild(tr);
  }
}

$('btn-back-setup').addEventListener('click', () => goToScreen('screen-setup'));

// ── Consolidate ─────────────────────────────────────────
$('btn-consolidate').addEventListener('click', () => {
  if (!scanData) return;

  // Reset progress screen
  resetProgressScreen();
  goToScreen('screen-progress');

  // Remove old listeners before adding new ones
  ['consolidate-progress','consolidate-done','consolidate-cancelled','consolidate-error'].forEach(ch => {
    api.removeAllListeners(ch);
  });

  api.onProgress(handleProgress);
  api.onDone(handleDone);
  api.onCancelled(handleCancelled);
  api.onError((msg) => { alert('Error: ' + msg); });

  const mode = $('opt-move').checked ? 'move' : 'copy';
  api.consolidateFiles({
    uniqueFiles:  scanData.uniqueFiles,
    destination:  destinationDir,
    mode,
  });
});

// ══════════════════════════════════════════════════════════
// SCREEN 3 — PROGRESS
// ══════════════════════════════════════════════════════════

function resetProgressScreen() {
  $('prog-bar').style.width = '0%';
  $('prog-pct').textContent = '0%';
  $('prog-files-label').textContent = '0 of 0 files';
  $('prog-elapsed').textContent = '0s';
  $('prog-speed').textContent = '0 files/s';
  $('prog-eta').textContent = 'calculating…';
  $('prog-copied').textContent = '0';
  $('prog-skipped').textContent = '0';
  $('prog-errors').textContent = '0';
  $('prog-current-file').textContent = 'Initializing…';

  $('done-card').style.display = 'none';
  $('log-card').style.display = 'flex';
  $('progress-action-bar').style.display = 'flex';
  $('progress-title').textContent = 'Consolidating Files…';
  $('progress-sub').textContent = 'Please wait while your files are being processed.';
  $('log-tbody').innerHTML = '';

  // reset done-card class
  $('done-card').classList.remove('cancelled');
  $('done-icon').textContent = '✓';
}

const MAX_LOG_ROWS = 200;

function handleProgress(d) {
  const pct = Math.round((d.current / d.total) * 100);
  $('prog-bar').style.width = pct + '%';
  $('prog-pct').textContent = pct + '%';
  $('prog-files-label').textContent = `${d.current.toLocaleString()} of ${d.total.toLocaleString()} files`;
  $('prog-elapsed').textContent = fmtTime(d.elapsed);
  $('prog-speed').textContent   = d.speed > 0 ? d.speed.toFixed(1) + ' files/s' : '—';
  $('prog-eta').textContent     = d.current < d.total ? fmtTime(d.eta) : 'Done';
  $('prog-copied').textContent  = d.copied.toLocaleString();
  $('prog-skipped').textContent = d.skipped.toLocaleString();
  $('prog-errors').textContent  = d.errors.toLocaleString();
  $('prog-current-file').textContent = d.currentFile;

  // Add log row
  const tbody = $('log-tbody');
  if (tbody.children.length >= MAX_LOG_ROWS) {
    tbody.removeChild(tbody.firstChild);
  }

  const statusMap = {
    copied:  '<span class="status-pill copied">✓ Copied</span>',
    skipped: '<span class="status-pill skipped">⏭ Skipped</span>',
    error:   '<span class="status-pill error">✕ Error</span>',
  };

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${statusMap[d.status] || d.status}</td>
    <td class="file-name" title="${d.currentFile}">${d.currentFile}</td>
    <td title="${d.sourcePath}" style="color:var(--text-dim)">${shortenPath(d.sourcePath)}</td>
  `;
  tbody.appendChild(tr);

  // Auto-scroll log
  const wrap = tbody.closest('.log-table-wrap');
  wrap.scrollTop = wrap.scrollHeight;
}

function handleDone(d) {
  $('prog-bar').style.width = '100%';
  $('prog-pct').textContent = '100%';
  $('prog-eta').textContent = 'Done';
  $('prog-current-file').textContent = 'All done!';
  $('progress-title').textContent = 'Consolidation Complete!';
  $('progress-sub').textContent = '';
  $('progress-action-bar').style.display = 'none';

  const card = $('done-card');
  card.style.display = 'flex';

  $('done-title').textContent = '🎉 Consolidation Complete!';
  $('done-message').textContent = `All unique files have been ${$('opt-move').checked ? 'moved' : 'copied'} to the destination folder.`;

  $('done-stats').innerHTML = `
    <span>✅ Copied: <strong>${d.copied.toLocaleString()}</strong></span>
    <span>⏭ Skipped: <strong>${d.skipped.toLocaleString()}</strong></span>
    <span>❌ Errors: <strong>${d.errors.toLocaleString()}</strong></span>
  `;
}

function handleCancelled(d) {
  const card = $('done-card');
  card.classList.add('cancelled');
  card.style.display = 'flex';
  $('done-icon').textContent = '⏹';
  $('done-title').textContent = 'Cancelled';
  $('done-message').textContent = 'The operation was cancelled by the user.';
  $('done-stats').innerHTML = `
    <span>✅ Copied so far: <strong>${d.copied.toLocaleString()}</strong></span>
    <span>⏭ Skipped: <strong>${d.skipped.toLocaleString()}</strong></span>
  `;
  $('progress-action-bar').style.display = 'none';
  $('progress-title').textContent = 'Cancelled';
}

// Cancel button
$('btn-cancel').addEventListener('click', () => {
  if (confirm('Are you sure you want to cancel the operation?')) {
    api.cancelConsolidation();
  }
});

// Open destination folder
$('btn-open-dest').addEventListener('click', () => {
  if (destinationDir) api.openFolder(destinationDir);
});

// Start Over
$('btn-start-over').addEventListener('click', () => {
  sourceFolders  = [];
  destinationDir = null;
  scanData       = null;
  renderSourceList();
  $('dest-path-text').textContent = 'No destination selected';
  $('dest-path-text').classList.add('dest-placeholder');
  $('dest-path-text').classList.remove('dest-path-text');
  goToScreen('screen-setup');
});

// ─── Utility ─────────────────────────────────────────────
function shortenPath(p) {
  if (!p) return '—';
  const parts = p.replace(/\\/g, '/').split('/');
  if (parts.length <= 3) return p;
  return '…/' + parts.slice(-2).join('/');
}
