let venuesList = [];

async function loadVenues() {
  const container = document.getElementById('venues-list');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  try {
    venuesList = await api.get('/api/venues');
    renderVenues();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Ошибка загрузки: ${err.message || ''}</p></div>`;
  }
}

function renderVenues() {
  const container = document.getElementById('venues-list');
  if (!venuesList.length) {
    container.innerHTML = '<div class="empty-state"><p>Катков пока нет</p></div>';
    return;
  }
  container.innerHTML = venuesList.map(v => `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">${escHtml(v.name)}</div>
          ${v.description ? `<div class="card-sub">${escHtml(v.description)}</div>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon-sm" onclick="openVenueEdit('${v.id}')">✏️</button>
          <button class="btn-icon-sm btn-icon-danger" onclick="confirmDeleteVenue('${v.id}', '${escHtml(v.name)}')">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openVenueAdd() {
  document.getElementById('venue-modal-title').textContent = 'Новый каток';
  document.getElementById('venue-id').value = '';
  document.getElementById('venue-name').value = '';
  document.getElementById('venue-desc').value = '';
  document.getElementById('venue-error').classList.add('hidden');
  openModal('venue-modal');
}

function openVenueEdit(id) {
  const v = venuesList.find(x => x.id === id);
  if (!v) return;
  document.getElementById('venue-modal-title').textContent = 'Редактировать каток';
  document.getElementById('venue-id').value = v.id;
  document.getElementById('venue-name').value = v.name;
  document.getElementById('venue-desc').value = v.description || '';
  document.getElementById('venue-error').classList.add('hidden');
  openModal('venue-modal');
}

function confirmDeleteVenue(id, name) {
  openConfirm(
    'Удалить каток?',
    `Каток «${name}» будет удалён.`,
    async () => {
      await api.delete(`/api/venues/${id}`);
      await loadVenues();
    }
  );
}

function initVenues() {
  document.getElementById('add-venue-btn').addEventListener('click', openVenueAdd);

  document.getElementById('venue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('venue-id').value;
    const name = document.getElementById('venue-name').value.trim();
    const description = document.getElementById('venue-desc').value.trim() || null;
    const errEl = document.getElementById('venue-error');
    errEl.classList.add('hidden');

    try {
      if (id) {
        await api.put(`/api/venues/${id}`, { name, description });
      } else {
        await api.post('/api/venues', { name, description });
      }
      closeModal('venue-modal');
      await loadVenues();
    } catch (err) {
      errEl.textContent = err.message || 'Ошибка сохранения';
      errEl.classList.remove('hidden');
    }
  });
}
