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

    if (!apiKey.startsWith('sk-')) {
      showStatus('Invalid API key format. API key should start with "sk-"', 'error');
      return;
    }

    chrome.storage.local.set({ openai_api_key: apiKey }, () => {
      showStatus('API key saved successfully!', 'success');
      // Notify background script to update the API key
      chrome.runtime.sendMessage({ action: 'updateApiKey', apiKey });
    });
  });

  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Handle Enter key
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });
}); 