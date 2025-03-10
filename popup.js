document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generateBtn');
  const toneSelector = document.getElementById('toneSelector');
  const loadingElement = document.getElementById('loading');
  const commentsContainer = document.getElementById('commentsContainer');
  const settingsBtn = document.getElementById('settingsBtn');
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedOptions = document.getElementById('advancedOptions');
  const languageSelector = document.getElementById('languageSelector');
  const addEmojis = document.getElementById('addEmojis');
  const addHashtags = document.getElementById('addHashtags');
  const characterLimit = document.getElementById('characterLimit');

  // Load saved preferences
  chrome.storage.local.get([
    'language',
    'addEmojis',
    'addHashtags',
    'characterLimit',
    'lastTone'
  ], (result) => {
    if (result.language) languageSelector.value = result.language;
    if (typeof result.addEmojis !== 'undefined') addEmojis.checked = result.addEmojis;
    if (typeof result.addHashtags !== 'undefined') addHashtags.checked = result.addHashtags;
    if (result.characterLimit) characterLimit.value = result.characterLimit;
    if (result.lastTone) toneSelector.value = result.lastTone;
  });

  // Toggle advanced options
  advancedToggle.addEventListener('click', () => {
    const isHidden = advancedOptions.style.display === 'none';
    advancedOptions.style.display = isHidden ? 'block' : 'none';
    advancedToggle.textContent = `Advanced Options ${isHidden ? '▼' : '▲'}`;
  });

  // Save preferences when changed
  function savePreference(key, value) {
    chrome.storage.local.set({ [key]: value });
  }

  languageSelector.addEventListener('change', () => savePreference('language', languageSelector.value));
  addEmojis.addEventListener('change', () => savePreference('addEmojis', addEmojis.checked));
  addHashtags.addEventListener('change', () => savePreference('addHashtags', addHashtags.checked));
  characterLimit.addEventListener('change', () => savePreference('characterLimit', characterLimit.value));
  toneSelector.addEventListener('change', () => savePreference('lastTone', toneSelector.value));

  // Open settings
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  generateBtn.addEventListener('click', async () => {
    const tone = toneSelector.value;
    showLoading(true);
    
    try {
      // Get the current tab to communicate with content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Request post content from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPostContent' });
      
      if (response.content) {
        // Send content to background script for AI processing
        const comments = await chrome.runtime.sendMessage({
          action: 'generateComments',
          content: response.content,
          tone: tone,
          options: {
            language: languageSelector.value,
            addEmojis: addEmojis.checked,
            addHashtags: addHashtags.checked,
            characterLimit: parseInt(characterLimit.value)
          }
        });
        
        if (Array.isArray(comments)) {
          displayComments(comments);
        } else if (comments.error) {
          showError(comments.error);
        }
      } else {
        showError('Could not extract post content. Please make sure you\'re on a supported social media post.');
      }
    } catch (error) {
      showError('An error occurred while generating comments. Please try again.');
      console.error('Error:', error);
    } finally {
      showLoading(false);
    }
  });

  function displayComments(comments) {
    commentsContainer.innerHTML = '';
    
    comments.forEach((comment, index) => {
      const commentCard = document.createElement('div');
      commentCard.className = 'comment-card';
      
      const commentText = document.createElement('div');
      commentText.className = 'comment-text';
      commentText.textContent = comment;
      
      const actions = document.createElement('div');
      actions.className = 'comment-actions';
      
      const insertBtn = document.createElement('button');
      insertBtn.className = 'action-btn';
      insertBtn.textContent = 'Insert';
      insertBtn.onclick = async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'insertComment',
            comment: comment
          });
          
          if (response.success) {
            window.close(); // Close popup after successful insertion
          } else {
            throw new Error('Failed to insert comment');
          }
        } catch (error) {
          showError('Failed to insert comment. Please try again.');
        }
      };
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(comment)
          .then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy';
            }, 1500);
          })
          .catch(() => {
            showError('Failed to copy comment. Please try again.');
          });
      };
      
      actions.appendChild(insertBtn);
      actions.appendChild(copyBtn);
      
      commentCard.appendChild(commentText);
      commentCard.appendChild(actions);
      commentsContainer.appendChild(commentCard);
    });
  }

  function showLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
    generateBtn.disabled = show;
  }

  function showError(message) {
    commentsContainer.innerHTML = `
      <div style="color: #dc3545; padding: 10px; text-align: center;">
        ${message}
      </div>
    `;
  }
}); 