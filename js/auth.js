function isLoggedIn() {
  return !!localStorage.getItem('jwt');
}

function logout() {
  localStorage.removeItem('jwt');
  showAuthScreen();
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function showAppScreen() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
}

function initAuth() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');

    try {
      const data = await api.post('/api/auth/trainer/login', { email, password });
      localStorage.setItem('jwt', data.token);
      showAppScreen();
      initApp();
    } catch (err) {
      errEl.textContent = err.message || 'Неверный email или пароль';
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', logout);
}
