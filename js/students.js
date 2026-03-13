let studentsList = [];

async function loadStudents() {
  const container = document.getElementById('students-list');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  try {
    studentsList = await api.get('/api/students');
    renderStudents();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>Ошибка загрузки: ${err.message || ''}</p></div>`;
  }
}

function renderStudents() {
  const container = document.getElementById('students-list');
  if (!studentsList.length) {
    container.innerHTML = '<div class="empty-state"><p>Учеников пока нет</p></div>';
    return;
  }
  container.innerHTML = studentsList.map(s => `
    <div class="card">
      <div class="card-header">
        <div style="flex:1">
          <div class="card-title">${escHtml(s.name)}</div>
          ${s.telegramId ? `<div class="card-sub">Telegram ID: ${s.telegramId}</div>` : ''}
          <div class="token-row">
            <span class="token-text" id="token-${s.id}">${s.token ? truncToken(s.token) : '—'}</span>
            ${s.token ? `<button class="btn btn-ghost btn-sm" onclick="copyToken('${s.id}', '${s.token}')">Копировать</button>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="resetToken('${s.id}')">Сбросить</button>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-icon-sm" onclick="openStudentEdit('${s.id}')">✏️</button>
          <button class="btn-icon-sm btn-icon-danger" onclick="confirmDeleteStudent('${s.id}', '${escHtml(s.name)}')">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

function truncToken(token) {
  return token.length > 12 ? token.slice(0, 12) + '...' : token;
}

async function copyToken(id, token) {
  try {
    await navigator.clipboard.writeText(token);
    const el = document.getElementById(`token-${id}`);
    if (el) { el.textContent = 'Скопировано!'; setTimeout(() => { el.textContent = truncToken(token); }, 1500); }
  } catch {
    prompt('Скопируйте токен:', token);
  }
}

async function resetToken(id) {
  openConfirm(
    'Сбросить токен?',
    'Старый токен перестанет работать. Ученику нужно будет использовать новый токен.',
    async () => {
      const data = await api.post(`/api/students/${id}/token/reset`);
      const s = studentsList.find(x => x.id === id);
      if (s) s.token = data.token;
      renderStudents();
    }
  );
}

function openStudentAdd() {
  document.getElementById('student-modal-title').textContent = 'Новый ученик';
  document.getElementById('student-id').value = '';
  document.getElementById('student-name').value = '';
  document.getElementById('student-telegram').value = '';
  document.getElementById('student-error').classList.add('hidden');
  openModal('student-modal');
}

function openStudentEdit(id) {
  const s = studentsList.find(x => x.id === id);
  if (!s) return;
  document.getElementById('student-modal-title').textContent = 'Редактировать ученика';
  document.getElementById('student-id').value = s.id;
  document.getElementById('student-name').value = s.name;
  document.getElementById('student-telegram').value = s.telegramId || '';
  document.getElementById('student-error').classList.add('hidden');
  openModal('student-modal');
}

function confirmDeleteStudent(id, name) {
  openConfirm(
    'Удалить ученика?',
    `Ученик «${name}» будет удалён со всеми записями.`,
    async () => {
      await api.delete(`/api/students/${id}`);
      await loadStudents();
    }
  );
}

function initStudents() {
  document.getElementById('add-student-btn').addEventListener('click', openStudentAdd);

  document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('student-id').value;
    const name = document.getElementById('student-name').value.trim();
    const telegramIdRaw = document.getElementById('student-telegram').value.trim();
    const telegramId = telegramIdRaw ? parseInt(telegramIdRaw, 10) : null;
    const errEl = document.getElementById('student-error');
    errEl.classList.add('hidden');

    try {
      if (id) {
        await api.put(`/api/students/${id}`, { name, telegramId });
      } else {
        await api.post('/api/students', { name, telegramId });
      }
      closeModal('student-modal');
      await loadStudents();
    } catch (err) {
      errEl.textContent = err.message || 'Ошибка сохранения';
      errEl.classList.remove('hidden');
    }
  });
}
