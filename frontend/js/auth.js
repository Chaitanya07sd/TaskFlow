/**
 * TaskFlow Authentication Scripts (Login & Register)
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupPasswordToggles();
  setupLoginForm();
  setupRegisterForm();
  checkUrlParams();
});

// Initialize Theme from localStorage or system preference
function initTheme() {
  const savedTheme = localStorage.getItem('taskflow-theme') || 'system';
  applyTheme(savedTheme);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    const currentPref = localStorage.getItem('taskflow-theme') || 'system';
    if (currentPref === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleMediaChange);
  } else if (mediaQuery.addListener) {
    mediaQuery.addListener(handleMediaChange);
  }

  setupThemeSwitcher();
}

function applyTheme(theme) {
  localStorage.setItem('taskflow-theme', theme);
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  updateThemeSwitcherUI(theme);
}

function updateThemeSwitcherUI(activeTheme) {
  const currentTheme = activeTheme || localStorage.getItem('taskflow-theme') || 'system';
  const buttons = document.querySelectorAll('.theme-toggle-option');
  buttons.forEach(btn => {
    const btnTheme = btn.dataset.theme;
    if (btnTheme === currentTheme) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
}

function setupThemeSwitcher() {
  const buttons = Array.from(document.querySelectorAll('.theme-toggle-option'));
  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });

    // Support keyboard arrow navigation between options
    btn.addEventListener('keydown', (e) => {
      let targetBtn = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        targetBtn = buttons[(index + 1) % buttons.length];
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        targetBtn = buttons[(index - 1 + buttons.length) % buttons.length];
      }
      if (targetBtn) {
        targetBtn.focus();
        applyTheme(targetBtn.dataset.theme);
      }
    });
  });
  updateThemeSwitcherUI();
}

// Setup Show/Hide Password buttons
function setupPasswordToggles() {
  const toggleBtns = document.querySelectorAll('.input-toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      // Update icon
      if (isPassword) {
        btn.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        btn.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  });
}

// Check URL query parameters on page load
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;

  if (params.get('registered') === 'true') {
    showAlert('Account created successfully! Please sign in with your credentials.', 'success');
  } else if (params.get('expired') === 'true') {
    showAlert('Your session has expired. Please sign in again.', 'error');
  } else if (params.get('logout') === 'true') {
    showAlert('You have been logged out successfully.', 'success');
  }
}

// Show alert banner inside auth card
function showAlert(message, type = 'error') {
  const alertEl = document.getElementById('auth-alert');
  if (!alertEl) return;

  alertEl.className = `auth-alert ${type} visible`;
  const iconHtml = type === 'success'
    ? '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
    : '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  alertEl.innerHTML = `${iconHtml}<span>${API.escapeHtml(message)}</span>`;
}

// Clear alert banner
function hideAlert() {
  const alertEl = document.getElementById('auth-alert');
  if (alertEl) {
    alertEl.className = 'auth-alert';
    alertEl.innerHTML = '';
  }
}

// Handle Login Form Submission
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    clearFieldErrors();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation
    let hasError = false;
    if (!email) {
      setFieldError('email', 'Email address is required');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setFieldError('email', 'Please enter a valid email address');
      hasError = true;
    }

    if (!password) {
      setFieldError('password', 'Password is required');
      hasError = true;
    }

    if (hasError) return;

    // Start loading state
    setLoading(submitBtn, true);

    try {
      const response = await API.post('/api/auth/login', { email, password });
      if (response && response.success) {
        window.location.href = '/index.html';
      } else {
        showAlert(response?.message || 'Login failed. Please verify your credentials.');
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Invalid email or password. Please try again.';
      showAlert(msg);
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

// Handle Register Form Submission
function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();
    clearFieldErrors();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    let hasError = false;

    if (!name || name.length < 2) {
      setFieldError('name', 'Full name must be at least 2 characters');
      hasError = true;
    }

    if (!email) {
      setFieldError('email', 'Email address is required');
      hasError = true;
    } else if (!isValidEmail(email)) {
      setFieldError('email', 'Please enter a valid email address');
      hasError = true;
    }

    if (!password || password.length < 6) {
      setFieldError('password', 'Password must be at least 6 characters long');
      hasError = true;
    }

    if (password !== confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    // Loading state
    setLoading(submitBtn, true);

    try {
      const response = await API.post('/api/auth/register', { name, email, password });
      if (response && response.success) {
        window.location.href = '/login.html?registered=true';
      } else {
        showAlert(response?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Unable to register. Please try again.';
      showAlert(msg);
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

// Helpers
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (input) input.classList.add('is-invalid');
  if (errorEl) errorEl.textContent = message;
}

function clearFieldErrors() {
  document.querySelectorAll('.form-input').forEach(input => input.classList.remove('is-invalid'));
  document.querySelectorAll('.form-error-msg').forEach(el => el.textContent = '');
}

function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.classList.add('loading');
  } else {
    button.classList.remove('loading');
  }
}
