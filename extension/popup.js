const DEFAULT_SERVER = 'https://api-cortex.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const loginView = document.getElementById('login-view');
  const saveView = document.getElementById('save-view');
  const logoutBtn = document.getElementById('logout-btn');
  const loginBtn = document.getElementById('login-btn');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const userInfo = document.getElementById('user-info');
  const urlPreview = document.getElementById('url-preview');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('status');
  const serverInput = document.getElementById('server-url');

  // Load stored data
  const stored = await chrome.storage.local.get(['serverUrl', 'authToken', 'userName', 'userEmail']);
  serverInput.value = stored.serverUrl || DEFAULT_SERVER;

  // Save server URL on change
  serverInput.addEventListener('change', () => {
    chrome.storage.local.set({ serverUrl: serverInput.value });
  });

  // Get current tab URL
  let currentUrl = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || '';
    urlPreview.textContent = currentUrl || 'No URL found';
  } catch (err) {
    urlPreview.textContent = 'Could not get page URL';
  }

  // --- Auth State ---
  function getServerUrl() {
    return (serverInput.value || DEFAULT_SERVER).replace(/\/$/, '');
  }

  function showLogin() {
    loginView.classList.remove('hidden');
    saveView.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }

  function showSave(name, email) {
    loginView.classList.add('hidden');
    saveView.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    userInfo.innerHTML = `Signed in as <strong>${name}</strong>`;
  }

  // Check if we have a valid token
  if (stored.authToken) {
    // Verify token is still valid
    try {
      const res = await fetch(`${getServerUrl()}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${stored.authToken}` }
      });
      if (res.ok) {
        const user = await res.json();
        showSave(user.name, user.email);
      } else {
        await chrome.storage.local.remove(['authToken', 'userName', 'userEmail']);
        showLogin();
      }
    } catch {
      // Server might be starting up, show save view anyway if we have stored info
      if (stored.userName) {
        showSave(stored.userName, stored.userEmail);
      } else {
        showLogin();
      }
    }
  } else {
    showLogin();
  }

  // --- Login ---
  loginBtn.addEventListener('click', async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      showError('Please enter email and password');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    hideError();

    try {
      const res = await fetch(`${getServerUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Store token
      await chrome.storage.local.set({
        authToken: data.token,
        userName: data.user.name,
        userEmail: data.user.email
      });

      showSave(data.user.name, data.user.email);
    } catch (err) {
      showError(err.message);
    }

    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  });

  // --- Logout ---
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['authToken', 'userName', 'userEmail']);
    showLogin();
  });

  // --- Save ---
  saveBtn.addEventListener('click', async () => {
    if (!currentUrl) {
      showStatus('No URL to save', 'error');
      return;
    }

    const tokenData = await chrome.storage.local.get('authToken');
    if (!tokenData.authToken) {
      showStatus('Please sign in first', 'error');
      showLogin();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const response = await fetch(`${getServerUrl()}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.authToken}`
        },
        body: JSON.stringify({ url: currentUrl })
      });

      if (response.status === 401) {
        await chrome.storage.local.remove(['authToken', 'userName', 'userEmail']);
        showStatus('Session expired. Please sign in again.', 'error');
        showLogin();
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }

      const data = await response.json();
      showStatus(`✓ Saved: ${data.title}`, 'success');
      saveBtn.textContent = 'Saved!';
    } catch (err) {
      showStatus(err.message || 'Failed to save. Check server.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Cortex';
    }
  });

  // --- Helpers ---
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => window.close(), 1500);
    }
  }

  function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
  }

  function hideError() {
    loginError.classList.add('hidden');
  }
});
