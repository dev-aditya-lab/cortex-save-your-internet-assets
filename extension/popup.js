const DEFAULT_SERVER = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async () => {
  const urlPreview = document.getElementById('url-preview');
  const saveBtn = document.getElementById('save-btn');
  const statusEl = document.getElementById('status');
  const serverInput = document.getElementById('server-url');

  // Load saved server URL
  const stored = await chrome.storage?.local?.get('serverUrl').catch(() => ({}));
  serverInput.value = stored?.serverUrl || DEFAULT_SERVER;

  // Save server URL on change
  serverInput.addEventListener('change', () => {
    chrome.storage?.local?.set({ serverUrl: serverInput.value });
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

  saveBtn.addEventListener('click', async () => {
    if (!currentUrl) {
      showStatus('No URL to save', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const serverUrl = serverInput.value.replace(/\/$/, '') || DEFAULT_SERVER;

    try {
      const response = await fetch(`${serverUrl}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl })
      });

      if (!response.ok) throw new Error('Save failed');

      const data = await response.json();
      showStatus(`Saved: ${data.title}`, 'success');
      saveBtn.textContent = 'Saved!';
    } catch (err) {
      showStatus('Failed to save. Check server URL.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Cortex';
    }
  });

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => window.close(), 1500);
    }
  }
});
