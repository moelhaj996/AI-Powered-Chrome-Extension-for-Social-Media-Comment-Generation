document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');

  // Load saved API key
  chrome.storage.local.get(['openai_api_key'], (result) => {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
    }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    chrome.storage.local.set({ openai_api_key: apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}); 