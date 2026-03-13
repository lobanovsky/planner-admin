// Utility: escape HTML
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Modal helpers
function openModal(id) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

let _confirmCallback = null;
function openConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  _confirmCallback = onConfirm;
  openModal('confirm-modal');
}

// Tab navigation
let appInitialized = false;
const TABS = ['schedules', 'students', 'venues'];
const TAB_TITLES = { schedules: 'Расписание', students: 'Ученики', venues: 'Катки' };

let activeTab = 'schedules';

function switchTab(tab) {
  if (!TABS.includes(tab)) return;
  activeTab = tab;

  TABS.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('header-title').textContent = TAB_TITLES[tab];

  if (tab === 'schedules') loadSchedule();
  if (tab === 'students') loadStudents();
  if (tab === 'venues') loadVenues();
}

function initApp() {
  if (appInitialized) {
    switchTab(activeTab);
    return;
  }
  appInitialized = true;

  // Nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-overlay').classList.add('hidden');
  });

  // Confirm button
  document.getElementById('confirm-ok').addEventListener('click', async () => {
    if (!_confirmCallback) return;
    const cb = _confirmCallback;
    _confirmCallback = null;
    closeModal('confirm-modal');
    try {
      await cb();
    } catch (err) {
      alert('Ошибка: ' + (err.message || 'неизвестная ошибка'));
    }
  });

  initVenues();
  initStudents();
  initSchedules();

  switchTab('schedules');
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  if (isLoggedIn()) {
    showAppScreen();
    initApp();
  } else {
    showAuthScreen();
  }
});
