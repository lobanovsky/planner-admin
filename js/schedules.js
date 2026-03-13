let currentMonday = getMonday(new Date());
let currentTemplate = null;
let currentSlots = [];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatWeekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay();
  const idx = dow === 0 ? 6 : dow - 1;
  return DAY_NAMES[idx];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

async function loadSchedule() {
  const weekStr = toISODate(currentMonday);
  document.getElementById('week-label').textContent = formatWeekLabel(currentMonday);

  const emptyEl = document.getElementById('schedule-empty');
  const draftEl = document.getElementById('schedule-draft');
  const pubEl = document.getElementById('schedule-published');
  emptyEl.classList.add('hidden');
  draftEl.classList.add('hidden');
  pubEl.classList.add('hidden');

  try {
    const templates = await api.get(`/api/schedules?weekStart=${weekStr}`);
    if (!templates || templates.length === 0) {
      currentTemplate = null;
      currentSlots = [];
      emptyEl.classList.remove('hidden');
      return;
    }
    const tmpl = templates[0];
    const detail = await api.get(`/api/schedules/${tmpl.id}`);
    currentTemplate = detail.template;
    currentSlots = detail.slots || [];

    if (currentTemplate.status === 'DRAFT') {
      renderSlots(document.getElementById('slots-list'), currentSlots, true);
      draftEl.classList.remove('hidden');
    } else {
      renderSlots(document.getElementById('slots-list-pub'), currentSlots, false);
      pubEl.classList.remove('hidden');
    }
  } catch (err) {
    emptyEl.classList.remove('hidden');
    document.querySelector('#schedule-empty p').textContent = 'Ошибка загрузки: ' + (err.message || '');
  }
}

function renderSlots(container, slots, isDraft) {
  if (!slots.length) {
    container.innerHTML = '<div class="empty-state"><p>Слотов пока нет</p></div>';
    return;
  }
  const sorted = [...slots].sort((a, b) => {
    if (a.slotDate !== b.slotDate) return a.slotDate.localeCompare(b.slotDate);
    return a.startTime.localeCompare(b.startTime);
  });
  container.innerHTML = sorted.map(s => {
    const venueName = s.venue?.name || '—';
    const typeLabel = s.slotType === 'INDIVIDUAL' ? 'Индивидуальная' : 'Групповая';
    const isFull = s.bookingCount >= s.capacity;
    return `
      <div class="slot-card">
        <div class="slot-info">
          <div class="slot-title">${getDayName(s.slotDate)}, ${formatDate(s.slotDate)} &bull; ${escHtml(venueName)}</div>
          <div class="slot-detail">${s.startTime.slice(0,5)} &bull; ${s.durationMinutes} мин &bull; ${typeLabel}</div>
          <div class="slot-count ${isFull ? 'slot-count-full' : ''}">${s.bookingCount} / ${s.capacity} записей</div>
        </div>
        ${isDraft ? `<button class="btn-icon-sm btn-icon-danger" onclick="confirmDeleteSlot('${s.id}')">🗑</button>` : ''}
      </div>
    `;
  }).join('');
}

async function createSchedule() {
  const weekStr = toISODate(currentMonday);
  try {
    await api.post('/api/schedules', { weekStart: weekStr });
    await loadSchedule();
  } catch (err) {
    alert('Ошибка: ' + (err.message || 'не удалось создать расписание'));
  }
}

async function deleteSchedule() {
  if (!currentTemplate) return;
  openConfirm(
    'Удалить расписание?',
    'Расписание и все слоты будут удалены безвозвратно.',
    async () => {
      await api.delete(`/api/schedules/${currentTemplate.id}`);
      await loadSchedule();
    }
  );
}

async function publishSchedule() {
  if (!currentTemplate) return;
  openConfirm(
    'Опубликовать расписание?',
    'После публикации ученики увидят расписание. Добавлять и удалять слоты будет нельзя.',
    async () => {
      await api.post(`/api/schedules/${currentTemplate.id}/publish`);
      await loadSchedule();
    }
  );
}

function confirmDeleteSlot(slotId) {
  openConfirm(
    'Удалить слот?',
    'Слот будет удалён. Нельзя удалить слот с бронированиями.',
    async () => {
      await api.delete(`/api/schedules/${currentTemplate.id}/slots/${slotId}`);
      await loadSchedule();
    }
  );
}

async function openAddSlotModal() {
  const dateSelect = document.getElementById('slot-date');
  dateSelect.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    const iso = toISODate(d);
    const opt = document.createElement('option');
    opt.value = iso;
    opt.textContent = `${DAY_NAMES[i]}, ${formatDate(iso)}`;
    dateSelect.appendChild(opt);
  }

  if (!venuesList.length) {
    try { venuesList = await api.get('/api/venues'); } catch {}
  }

  const venueSelect = document.getElementById('slot-venue');
  venueSelect.innerHTML = venuesList.length
    ? venuesList.map(v => `<option value="${v.id}">${escHtml(v.name)}</option>`).join('')
    : '<option value="">Нет катков</option>';

  document.getElementById('slot-error').classList.add('hidden');
  openModal('slot-modal');
}

function initSlotTypeToggle() {
  document.querySelectorAll('input[name="slot-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isGroup = document.querySelector('input[name="slot-type"]:checked').value === 'GROUP';
      document.getElementById('capacity-group').style.display = isGroup ? 'block' : 'none';
    });
  });
}

function initSchedules() {
  document.getElementById('week-prev').addEventListener('click', () => {
    currentMonday.setDate(currentMonday.getDate() - 7);
    loadSchedule();
  });
  document.getElementById('week-next').addEventListener('click', () => {
    currentMonday.setDate(currentMonday.getDate() + 7);
    loadSchedule();
  });
  document.getElementById('create-schedule-btn').addEventListener('click', createSchedule);
  document.getElementById('publish-btn').addEventListener('click', publishSchedule);
  document.getElementById('delete-schedule-btn').addEventListener('click', deleteSchedule);
  document.getElementById('add-slot-btn').addEventListener('click', openAddSlotModal);

  initSlotTypeToggle();

  document.getElementById('slot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('slot-error');
    errEl.classList.add('hidden');

    const slotDate = document.getElementById('slot-date').value;
    const venueId = document.getElementById('slot-venue').value;
    const startTime = document.getElementById('slot-time').value;
    const durationMinutes = parseInt(document.getElementById('slot-duration').value, 10);
    const slotType = document.querySelector('input[name="slot-type"]:checked').value;
    const capacity = slotType === 'GROUP'
      ? parseInt(document.getElementById('slot-capacity').value, 10)
      : 1;

    if (!venueId) {
      errEl.textContent = 'Добавьте хотя бы один каток';
      errEl.classList.remove('hidden');
      return;
    }

    try {
      await api.post(`/api/schedules/${currentTemplate.id}/slots`, {
        venueId, slotDate, startTime, durationMinutes, slotType, capacity
      });
      closeModal('slot-modal');
      await loadSchedule();
    } catch (err) {
      errEl.textContent = err.message || 'Ошибка добавления слота';
      errEl.classList.remove('hidden');
    }
  });
}
