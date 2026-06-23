// =============================================
//  BILLSAFE — MAIN APP LOGIC
//  India Edition | Warranty & Receipts Tracker
// =============================================

// ─── State ───────────────────────────────────
let receipts = [];
let currentFilter = 'all';
let currentSection = 'dashboardSection';
let cameraStream = null;
let capturedImageData = null;
let parsedData = {};
let ocrWorker = null;

// ─── Storage ─────────────────────────────────
const STORAGE_KEY = 'billsafe_receipts_v2';

function loadReceipts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    receipts = data ? JSON.parse(data) : [];
  } catch (e) {
    receipts = [];
  }
}

function saveReceipts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch (e) {
    showToast('Storage full! Please delete old receipts.', 'error');
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Init ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadReceipts();
  populateRetailerDropdown();
  setupDateInputDefault();
  renderDashboard();
  renderReceiptsList();
  renderClaimsList();
  checkAlerts();
  NotificationEngine.checkPermission();
  updateNotifPermBtn();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// ─── Navigation ──────────────────────────────
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  currentSection = sectionId;

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navMap = {
    dashboardSection: 'nav-dashboard',
    receiptsSection: 'nav-receipts',
    addSection: 'nav-add',
    claimsSection: 'nav-claims',
    settingsSection: 'nav-settings',
  };
  const navId = navMap[sectionId];
  if (navId) document.getElementById(navId)?.classList.add('active');

  // Refresh data when switching sections
  if (sectionId === 'dashboardSection') renderDashboard();
  if (sectionId === 'receiptsSection') renderReceiptsList();
  if (sectionId === 'claimsSection') renderClaimsList();
  if (sectionId === 'addSection') resetAddForm();
}

// ─── Alerts / Banner ─────────────────────────
function checkAlerts() {
  const alerts = NotificationEngine.getAlertSummary(receipts);
  const badge = document.getElementById('notifBadge');
  const criticalAlerts = alerts.filter(a => a.days <= 3);

  if (criticalAlerts.length > 0) {
    badge.style.display = 'flex';
    badge.textContent = criticalAlerts.length;
    showBanner(criticalAlerts[0].message, criticalAlerts[0].tier === 'critical' ? 'critical' : 'urgent');
  } else {
    badge.style.display = 'none';
  }

  NotificationEngine.checkAndNudge(receipts);
}

function showBanner(text, type = 'urgent') {
  const banner = document.getElementById('alertBanner');
  const alertText = document.getElementById('alertText');
  banner.className = `alert-banner ${type}`;
  alertText.textContent = text;
  banner.style.display = 'flex';
}

function dismissBanner() {
  document.getElementById('alertBanner').style.display = 'none';
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Retailer Dropdown ────────────────────────
function populateRetailerDropdown() {
  const select = document.getElementById('retailerSelect');
  const groups = {
    'quick-commerce': '⚡ Quick Commerce',
    'ecommerce': '🛍️ E-Commerce',
    'electronics': '📺 Electronics & Appliances',
    'grocery': '🛒 Grocery',
    'clothing': '👕 Fashion',
    'local': '🏬 Local Shops',
    'other': '🏷️ Other',
  };

  for (const [cat, label] of Object.entries(groups)) {
    const catRetailers = RETAILERS.filter(r => r.category === cat);
    if (catRetailers.length === 0) continue;
    const optgroup = document.createElement('optgroup');
    optgroup.label = label;
    catRetailers.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.icon} ${r.name}`;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  }
}

function onRetailerChange() {
  const retailerId = document.getElementById('retailerSelect').value;
  if (!retailerId) return;

  const retailer = getRetailerById(retailerId);
  if (!retailer) return;

  document.getElementById('storeNameInput').value = retailer.name;
  document.getElementById('returnDays').value = retailer.returnDays;
  document.getElementById('warrantyToggle').checked = retailer.warrantyMonths > 0;
  document.getElementById('warrantyMonths').value = retailer.warrantyMonths || 12;

  // Auto-set category
  const catMap = {
    'quick-commerce': 'quick-commerce',
    'ecommerce': 'electronics',
    'electronics': 'electronics',
    'grocery': 'grocery',
    'clothing': 'clothing',
  };
  const cat = catMap[retailer.category] || 'other';
  document.getElementById('categorySelect').value = cat;

  updateDeadlinePreviews();

  // Special alert for quick commerce
  if (retailer.urgencyTier === 'critical') {
    showToast(`⚡ Quick Commerce: ${retailer.note}`, 'warning');
  }
}

function setupDateInputDefault() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('purchaseDateInput').value = today;
  updateDeadlinePreviews();
}

function updateDeadlinePreviews() {
  const dateVal = document.getElementById('purchaseDateInput').value;
  if (!dateVal) return;

  const purchaseDate = new Date(dateVal);

  const returnDays = parseInt(document.getElementById('returnDays').value) || 0;
  if (document.getElementById('returnToggle').checked) {
    const rd = new Date(purchaseDate);
    rd.setDate(rd.getDate() + returnDays);
    document.getElementById('returnDeadlinePreview').textContent = formatDate(rd);
  } else {
    document.getElementById('returnDeadlinePreview').textContent = 'Off';
  }

  const wMonths = parseInt(document.getElementById('warrantyMonths').value) || 0;
  if (document.getElementById('warrantyToggle').checked) {
    const wd = new Date(purchaseDate);
    wd.setMonth(wd.getMonth() + wMonths);
    document.getElementById('warrantyDeadlinePreview').textContent = formatDate(wd);
  } else {
    document.getElementById('warrantyDeadlinePreview').textContent = 'Off';
  }
}

// Listen for date/days changes
document.addEventListener('DOMContentLoaded', () => {
  ['purchaseDateInput', 'returnDays', 'warrantyMonths', 'returnToggle', 'warrantyToggle'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateDeadlinePreviews);
  });
});

// ─── Camera ──────────────────────────────────
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    cameraStream = stream;
    const video = document.getElementById('cameraFeed');
    video.srcObject = stream;
    document.getElementById('cameraContainer').style.display = 'block';
  } catch (e) {
    showToast('Camera not available. Please upload an image instead.', 'error');
  }
}

function capturePhoto() {
  const video = document.getElementById('cameraFeed');
  const canvas = document.getElementById('captureCanvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  capturedImageData = canvas.toDataURL('image/jpeg', 0.85);
  stopCamera();
  showPreview(capturedImageData);
  runOCR(capturedImageData);
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  document.getElementById('cameraContainer').style.display = 'none';
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    capturedImageData = e.target.result;
    showPreview(capturedImageData);
    runOCR(capturedImageData);
  };
  reader.readAsDataURL(file);
}

function showPreview(dataUrl) {
  document.getElementById('pasteContainer').style.display = 'none';
  document.getElementById('previewContainer').style.display = 'block';
  document.getElementById('receiptPreview').src = dataUrl;
  document.getElementById('ocrStatus').style.display = 'flex';
  document.getElementById('ocrStatusText').textContent = 'Reading your receipt with AI...';
  document.getElementById('proceedBtn').disabled = true;
}

// ─── OCR with Tesseract.js ────────────────────
async function runOCR(imageData) {
  try {
    document.getElementById('ocrStatusText').textContent = 'Starting OCR engine...';

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = Math.round(m.progress * 100);
          const statusEl = document.getElementById('ocrStatusText');
          if (statusEl) statusEl.textContent = `Reading receipt... ${pct}%`;
        }
      }
    });

    const { data: { text } } = await worker.recognize(imageData);
    await worker.terminate();

    // Parse the extracted text
    parsedData = GSTParser.parse(text);
    applyParsedData(parsedData);

    document.getElementById('ocrStatus').style.display = 'none';
    document.getElementById('proceedBtn').disabled = false;
    showToast('✅ Receipt read successfully!', 'success');

  } catch (e) {
    console.error('OCR error:', e);
    document.getElementById('ocrStatusText').textContent = 'Could not read automatically. Fill in manually.';
    document.getElementById('proceedBtn').disabled = false;
  }
}

function applyParsedData(data) {
  if (data.storeName) document.getElementById('storeNameInput').value = data.storeName;
  if (data.retailerId) {
    document.getElementById('retailerSelect').value = data.retailerId;
    onRetailerChange();
  }
  if (data.date) {
    const d = new Date(data.date);
    document.getElementById('purchaseDateInput').value = d.toISOString().split('T')[0];
  }
  if (data.amount) document.getElementById('amountInput').value = data.amount.toFixed(2);
  if (data.gstin) document.getElementById('gstinInput').value = data.gstin;
  updateDeadlinePreviews();
}

// ─── Paste Text Mode ──────────────────────────
function showPasteMode() {
  document.getElementById('pasteContainer').style.display = 'block';
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('cameraContainer').style.display = 'none';
}

function parseAndProceed() {
  const text = document.getElementById('pasteText').value;
  if (!text.trim()) { showToast('Please paste some receipt text first.', 'error'); return; }
  parsedData = GSTParser.parse(text);
  capturedImageData = null;
  applyParsedData(parsedData);
  proceedToStep2();
}

// ─── Form Steps ──────────────────────────────
function proceedToStep2() {
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
  updateDeadlinePreviews();
}

function goToStep1() {
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step1').classList.add('active');
}

function resetCapture() {
  capturedImageData = null;
  parsedData = {};
  document.getElementById('previewContainer').style.display = 'none';
  document.getElementById('cameraContainer').style.display = 'none';
  document.getElementById('pasteContainer').style.display = 'none';
  document.getElementById('fileInput').value = '';
}

function resetAddForm() {
  resetCapture();
  document.getElementById('step1').classList.add('active');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('storeNameInput').value = '';
  document.getElementById('retailerSelect').value = '';
  document.getElementById('amountInput').value = '';
  document.getElementById('gstinInput').value = '';
  document.getElementById('notesInput').value = '';
  document.getElementById('pasteText').value = '';
  setupDateInputDefault();
}

// ─── Save Receipt ─────────────────────────────
function saveReceipt() {
  const storeName = document.getElementById('storeNameInput').value.trim() ||
                    document.getElementById('retailerSelect').options[document.getElementById('retailerSelect').selectedIndex]?.text ||
                    'Unknown Store';
  const retailerId = document.getElementById('retailerSelect').value;
  const purchaseDateVal = document.getElementById('purchaseDateInput').value;
  const amount = parseFloat(document.getElementById('amountInput').value) || 0;
  const category = document.getElementById('categorySelect').value;
  const gstin = document.getElementById('gstinInput').value.trim();
  const notes = document.getElementById('notesInput').value.trim();

  if (!purchaseDateVal) {
    showToast('Please enter a purchase date.', 'error');
    return;
  }

  const purchaseDate = new Date(purchaseDateVal);

  // Calculate deadlines
  let returnDeadline = null;
  if (document.getElementById('returnToggle').checked) {
    const days = parseInt(document.getElementById('returnDays').value) || 7;
    returnDeadline = new Date(purchaseDate);
    returnDeadline.setDate(returnDeadline.getDate() + days);
  }

  let warrantyDeadline = null;
  if (document.getElementById('warrantyToggle').checked) {
    const months = parseInt(document.getElementById('warrantyMonths').value) || 12;
    warrantyDeadline = new Date(purchaseDate);
    warrantyDeadline.setMonth(warrantyDeadline.getMonth() + months);
  }

  // Get retailer info
  const retailer = retailerId ? getRetailerById(retailerId) : null;

  const receipt = {
    id: generateId(),
    storeName: storeName.replace(/^[^a-zA-Z0-9₹]*/, '').slice(0, 60) || 'Unknown Store',
    retailerId,
    retailerIcon: retailer?.icon || '🏷️',
    purchaseDate: purchaseDate.toISOString(),
    amount,
    category,
    gstin,
    notes,
    returnDeadline: returnDeadline?.toISOString() || null,
    warrantyDeadline: warrantyDeadline?.toISOString() || null,
    receiptImage: capturedImageData || null,
    gstBreakdown: parsedData.gstBreakdown || null,
    claimStatus: null,
    claimReference: '',
    createdAt: new Date().toISOString(),
  };

  receipts.push(receipt);
  saveReceipts();

  showToast('✅ Receipt saved successfully!', 'success');
  parsedData = {};
  capturedImageData = null;

  // Quick commerce special alert
  if (retailer?.urgencyTier === 'critical') {
    setTimeout(() => {
      showBanner(`⚡ Quick commerce: only ${retailer.returnDays} day(s) to return from ${storeName}!`, 'critical');
    }, 1000);
  }

  showSection('dashboardSection');
}

// ─── Dashboard Render ─────────────────────────
function renderDashboard() {
  const total = receipts.length;
  const now = new Date();

  const activeWarranties = receipts.filter(r =>
    r.warrantyDeadline && new Date(r.warrantyDeadline) > now
  ).length;

  const expiringSoon = receipts.filter(r => {
    const d = NotificationEngine.getDaysRemaining(r.returnDeadline);
    const w = NotificationEngine.getDaysRemaining(r.warrantyDeadline);
    return (d !== null && d >= 0 && d <= 7) || (w !== null && w >= 0 && w <= 30);
  }).length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statUrgent').textContent = expiringSoon;
  document.getElementById('statWarranties').textContent = activeWarranties;
  document.getElementById('dashSubtitle').textContent = total === 0
    ? 'Start by adding your first receipt'
    : `${total} receipt${total !== 1 ? 's' : ''} tracked`;

  // Urgent items (<=3 days on return)
  const urgentReceipts = receipts.filter(r => {
    const d = NotificationEngine.getDaysRemaining(r.returnDeadline);
    return d !== null && d >= 0 && d <= 3;
  }).sort((a, b) => new Date(a.returnDeadline) - new Date(b.returnDeadline));

  const urgentSection = document.getElementById('urgentSection');
  const urgentCards = document.getElementById('urgentCards');
  if (urgentReceipts.length > 0) {
    urgentSection.style.display = 'block';
    urgentCards.innerHTML = urgentReceipts.map(r => renderReceiptCard(r, true)).join('');
  } else {
    urgentSection.style.display = 'none';
  }

  // Upcoming deadlines (sorted)
  const dashCards = document.getElementById('dashboardCards');
  const upcoming = receipts
    .filter(r => {
      const rd = NotificationEngine.getDaysRemaining(r.returnDeadline);
      const wd = NotificationEngine.getDaysRemaining(r.warrantyDeadline);
      return (rd !== null && rd >= 0) || (wd !== null && wd >= 0 && wd <= 365);
    })
    .sort((a, b) => {
      const aMin = Math.min(
        a.returnDeadline ? NotificationEngine.getDaysRemaining(a.returnDeadline) : Infinity,
        a.warrantyDeadline ? NotificationEngine.getDaysRemaining(a.warrantyDeadline) : Infinity
      );
      const bMin = Math.min(
        b.returnDeadline ? NotificationEngine.getDaysRemaining(b.returnDeadline) : Infinity,
        b.warrantyDeadline ? NotificationEngine.getDaysRemaining(b.warrantyDeadline) : Infinity
      );
      return aMin - bMin;
    });

  if (upcoming.length === 0) {
    dashCards.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <p>No receipts yet. Add your first bill!</p>
        <button class="btn-primary" onclick="showSection('addSection')">+ Add Receipt</button>
      </div>`;
  } else {
    dashCards.innerHTML = upcoming.map(r => renderReceiptCard(r)).join('');
  }
}

// ─── Receipt Card Renderer ────────────────────
function renderReceiptCard(receipt, isUrgent = false) {
  const returnDays = NotificationEngine.getDaysRemaining(receipt.returnDeadline);
  const warrantyDays = NotificationEngine.getDaysRemaining(receipt.warrantyDeadline);
  const returnTier = NotificationEngine.getUrgencyTier(returnDays);
  const warrantyTier = NotificationEngine.getUrgencyTier(warrantyDays);

  const overallTier = [returnTier, warrantyTier].reduce((best, t) => {
    const order = ['expired', 'none', 'safe', 'ok', 'soon', 'urgent', 'today', 'critical'];
    return order.indexOf(t) > order.indexOf(best) ? t : best;
  }, 'none');

  const amount = receipt.amount > 0 ? `₹${formatAmount(receipt.amount)}` : '';
  const date = formatDate(new Date(receipt.purchaseDate));

  return `
    <div class="receipt-card ${overallTier}" onclick="openReceiptModal('${receipt.id}')">
      <div class="card-header">
        <div class="store-info">
          <span class="store-icon">${receipt.retailerIcon || '🏷️'}</span>
          <div>
            <div class="store-name">${escapeHtml(receipt.storeName)}</div>
            <div class="purchase-date">${date} ${amount ? '· ' + amount : ''}</div>
          </div>
        </div>
        ${receipt.claimStatus ? `<span class="claim-badge ${receipt.claimStatus}">${claimStatusLabel(receipt.claimStatus)}</span>` : ''}
      </div>
      <div class="card-deadlines">
        ${returnDays !== null && returnDays >= 0 ? `
          <div class="deadline-item ${returnTier}">
            <span class="deadline-icon">↩️</span>
            <span class="deadline-text">Return: ${NotificationEngine.getUrgencyLabel(returnDays)}</span>
          </div>` : returnDays !== null && returnDays < 0 ? `
          <div class="deadline-item expired">
            <span>↩️</span><span>Return window closed</span>
          </div>` : ''}
        ${warrantyDays !== null && warrantyDays >= 0 ? `
          <div class="deadline-item ${warrantyTier}">
            <span class="deadline-icon">🛡️</span>
            <span class="deadline-text">Warranty: ${NotificationEngine.getUrgencyLabel(warrantyDays)}</span>
          </div>` : warrantyDays !== null && warrantyDays < 0 ? `
          <div class="deadline-item expired">
            <span>🛡️</span><span>Warranty expired</span>
          </div>` : ''}
      </div>
      ${overallTier === 'critical' ? '<div class="pulse-ring"></div>' : ''}
    </div>`;
}

// ─── Receipts List ────────────────────────────
function renderReceiptsList() {
  const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
  let filtered = receipts;

  if (query) {
    filtered = filtered.filter(r =>
      r.storeName.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      (r.notes && r.notes.toLowerCase().includes(query))
    );
  }

  if (currentFilter !== 'all') {
    filtered = filtered.filter(r => {
      const rd = NotificationEngine.getDaysRemaining(r.returnDeadline);
      const wd = NotificationEngine.getDaysRemaining(r.warrantyDeadline);
      if (currentFilter === 'urgent') return (rd !== null && rd >= 0 && rd <= 7) || (wd !== null && wd >= 0 && wd <= 30);
      if (currentFilter === 'active') return (rd !== null && rd > 0) || (wd !== null && wd > 0);
      if (currentFilter === 'expired') return (rd !== null && rd < 0) && (wd === null || wd < 0);
      return true;
    });
  }

  const container = document.getElementById('receiptsList');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No receipts found.</p></div>`;
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    container.innerHTML = filtered.map(r => renderReceiptCard(r)).join('');
  }
}

function filterReceipts() { renderReceiptsList(); }

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderReceiptsList();
}

// ─── Claims ───────────────────────────────────
function renderClaimsList() {
  const claimsContainer = document.getElementById('claimsList');
  const withClaims = receipts.filter(r => r.claimStatus);
  const warrantyReceipts = receipts.filter(r => r.warrantyDeadline && !r.claimStatus);

  let html = '';

  if (withClaims.length > 0) {
    html += '<h3 class="section-title">📋 Active Claims</h3>';
    html += withClaims.map(r => `
      <div class="claim-card ${r.claimStatus}">
        <div class="claim-header">
          <span class="store-icon">${r.retailerIcon || '🏷️'}</span>
          <div>
            <div class="claim-store">${escapeHtml(r.storeName)}</div>
            <div class="claim-date">Purchased: ${formatDate(new Date(r.purchaseDate))}</div>
          </div>
          <span class="claim-status-badge ${r.claimStatus}">${claimStatusLabel(r.claimStatus)}</span>
        </div>
        ${r.claimReference ? `<div class="claim-ref">Ref: ${escapeHtml(r.claimReference)}</div>` : ''}
        <div class="claim-actions">
          <button class="btn-small" onclick="updateClaimStatus('${r.id}')">Update Status</button>
          <button class="btn-small secondary" onclick="openReceiptModal('${r.id}')">View</button>
        </div>
      </div>`).join('');
  }

  if (warrantyReceipts.length > 0) {
    html += '<h3 class="section-title" style="margin-top:24px;">🛡️ Ready to Claim</h3>';
    html += warrantyReceipts.slice(0, 5).map(r => `
      <div class="claim-card eligible">
        <div class="claim-header">
          <span class="store-icon">${r.retailerIcon || '🏷️'}</span>
          <div>
            <div class="claim-store">${escapeHtml(r.storeName)}</div>
            <div class="claim-date">Warranty: ${r.warrantyDeadline ? formatDate(new Date(r.warrantyDeadline)) : 'N/A'}</div>
          </div>
        </div>
        <button class="btn-small" onclick="startClaim('${r.id}')">File Claim</button>
      </div>`).join('');
  }

  if (!withClaims.length && !warrantyReceipts.length) {
    html = `<div class="empty-state"><div class="empty-icon">🔧</div><p>No warranty claims yet. Add receipts with warranty to get started.</p></div>`;
  }

  claimsContainer.innerHTML = html;
}

function startClaim(receiptId) {
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const ref = prompt(`File warranty claim for ${receipt.storeName}\n\nEnter claim/reference number (optional):`);
  if (ref === null) return; // cancelled

  receipt.claimStatus = 'submitted';
  receipt.claimReference = ref || '';
  saveReceipts();
  renderClaimsList();
  showToast(`Claim filed for ${receipt.storeName}`, 'success');
}

function updateClaimStatus(receiptId) {
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const statuses = ['submitted', 'in-review', 'resolved'];
  const currentIdx = statuses.indexOf(receipt.claimStatus);
  const nextStatus = statuses[(currentIdx + 1) % statuses.length];
  receipt.claimStatus = nextStatus;
  saveReceipts();
  renderClaimsList();
  renderDashboard();
  showToast(`Claim updated to: ${claimStatusLabel(nextStatus)}`, 'success');
}

function claimStatusLabel(status) {
  return { 'submitted': '📤 Submitted', 'in-review': '🔄 In Review', 'resolved': '✅ Resolved' }[status] || status;
}

// ─── Receipt Modal ────────────────────────────
function openReceiptModal(receiptId) {
  const receipt = receipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const returnDays = NotificationEngine.getDaysRemaining(receipt.returnDeadline);
  const warrantyDays = NotificationEngine.getDaysRemaining(receipt.warrantyDeadline);
  const returnTier = NotificationEngine.getUrgencyTier(returnDays);
  const warrantyTier = NotificationEngine.getUrgencyTier(warrantyDays);

  const modal = document.getElementById('receiptModal');
  const content = document.getElementById('modalContent');

  content.innerHTML = `
    <div class="modal-header">
      <div class="modal-store">
        <span class="store-icon-lg">${receipt.retailerIcon || '🏷️'}</span>
        <div>
          <h2>${escapeHtml(receipt.storeName)}</h2>
          <p>${formatDate(new Date(receipt.purchaseDate))} ${receipt.amount > 0 ? '· ₹' + formatAmount(receipt.amount) : ''}</p>
        </div>
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>

    <div class="modal-body">
      ${receipt.receiptImage ? `
        <div class="receipt-image-container">
          <img src="${receipt.receiptImage}" alt="Receipt" class="receipt-image-full">
        </div>` : ''}

      <div class="modal-deadlines">
        ${receipt.returnDeadline ? `
          <div class="modal-deadline-block ${returnTier}">
            <div class="md-icon">↩️</div>
            <div>
              <div class="md-label">Return Deadline</div>
              <div class="md-date">${formatDate(new Date(receipt.returnDeadline))}</div>
              <div class="md-days">${NotificationEngine.getUrgencyLabel(returnDays)}</div>
            </div>
          </div>` : ''}

        ${receipt.warrantyDeadline ? `
          <div class="modal-deadline-block ${warrantyTier}">
            <div class="md-icon">🛡️</div>
            <div>
              <div class="md-label">Warranty Until</div>
              <div class="md-date">${formatDate(new Date(receipt.warrantyDeadline))}</div>
              <div class="md-days">${NotificationEngine.getUrgencyLabel(warrantyDays)}</div>
            </div>
          </div>` : ''}
      </div>

      ${receipt.gstin ? `
        <div class="modal-info-row">
          <span class="info-label">GSTIN</span>
          <span class="info-val">${receipt.gstin}</span>
        </div>` : ''}

      ${receipt.gstBreakdown && (receipt.gstBreakdown.cgst || receipt.gstBreakdown.igst) ? `
        <div class="modal-info-row">
          <span class="info-label">GST</span>
          <span class="info-val">
            ${receipt.gstBreakdown.cgst ? `CGST: ₹${receipt.gstBreakdown.cgst}` : ''}
            ${receipt.gstBreakdown.sgst ? ` + SGST: ₹${receipt.gstBreakdown.sgst}` : ''}
            ${receipt.gstBreakdown.igst ? `IGST: ₹${receipt.gstBreakdown.igst}` : ''}
          </span>
        </div>` : ''}

      ${receipt.category ? `
        <div class="modal-info-row">
          <span class="info-label">Category</span>
          <span class="info-val">${receipt.category}</span>
        </div>` : ''}

      ${receipt.notes ? `
        <div class="modal-info-row">
          <span class="info-label">Notes</span>
          <span class="info-val">${escapeHtml(receipt.notes)}</span>
        </div>` : ''}

      ${receipt.claimStatus ? `
        <div class="modal-info-row">
          <span class="info-label">Claim</span>
          <span class="info-val claim-badge ${receipt.claimStatus}">${claimStatusLabel(receipt.claimStatus)}</span>
        </div>` : ''}
    </div>

    <div class="modal-actions">
      ${!receipt.claimStatus && receipt.warrantyDeadline && warrantyDays > 0 ? `
        <button class="btn-primary" onclick="startClaim('${receipt.id}'); closeModal()">🔧 File Claim</button>` : ''}
      ${receipt.claimStatus && receipt.claimStatus !== 'resolved' ? `
        <button class="btn-primary" onclick="updateClaimStatus('${receipt.id}')">Update Claim</button>` : ''}
      <button class="btn-secondary" onclick="deleteReceipt('${receipt.id}')">🗑️ Delete</button>
    </div>`;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('receiptModal').style.display = 'none';
  document.body.style.overflow = '';
}

function deleteReceipt(id) {
  if (!confirm('Delete this receipt? This cannot be undone.')) return;
  receipts = receipts.filter(r => r.id !== id);
  saveReceipts();
  closeModal();
  renderDashboard();
  renderReceiptsList();
  renderClaimsList();
  showToast('Receipt deleted.', 'success');
}

// ─── Settings ─────────────────────────────────
function updateNotifPermBtn() {
  const btn = document.getElementById('notifPermBtn');
  if (!btn) return;
  const perm = Notification.permission;
  if (perm === 'granted') { btn.textContent = '✅ Enabled'; btn.disabled = true; }
  else if (perm === 'denied') { btn.textContent = '❌ Blocked'; btn.disabled = true; }
  else { btn.textContent = 'Enable'; btn.disabled = false; }
}

async function requestNotifPermission() {
  const granted = await NotificationEngine.requestPermission();
  updateNotifPermBtn();
  if (granted) {
    showToast('Notifications enabled!', 'success');
    NotificationEngine.fireNotification('BillSafe 🧾', 'You will now get nudges before return deadlines expire!');
  } else {
    showToast('Notifications blocked. Enable from browser settings.', 'error');
  }
}

function clearAllData() {
  if (!confirm('Clear ALL receipts? This cannot be undone!')) return;
  receipts = [];
  saveReceipts();
  renderDashboard();
  renderReceiptsList();
  renderClaimsList();
  showToast('All data cleared.', 'success');
}

// ─── Helpers ──────────────────────────────────
function formatDate(date) {
  if (!date || isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-IN').format(amount);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
