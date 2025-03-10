// Platform-specific selectors for post content
const PLATFORM_SELECTORS = {
  twitter: {
    post: [
      '[data-testid="tweetText"]',
      '.tweet-text',
      '[data-testid="tweet"] article',
      '.css-1dbjc4n [lang]',
      '[data-testid="tweet"] [lang]'
    ],
    commentBox: '[data-testid="tweetTextarea_0"], [contenteditable="true"]'
  },
  instagram: {
    post: [
      'h1._aacl._aaco._aacu._aacx._aad7._aade',
      '._a9zs',
      'article ._aagv',
      '._aa6e',
      '._a9zr ._a9zs'
    ],
    commentBox: '._aaoc textarea, form textarea, ._akhn'
  },
  facebook: {
    post: [
      '[data-ad-preview="message"]',
      '.userContent',
      '._5pbx',
      '._5rgt',
      '.kvgmc6g5',
      '[data-ad-comet-preview="message"]',
      '.ecm0bbzt'
    ],
    commentBox: 'form.commentable_item textarea, .notranslate._5yk2, [contenteditable="true"]'
  },
  linkedin: {
    post: [
      '.feed-shared-update-v2__description-wrapper span.break-words',
      '.feed-shared-text-view',
      '.feed-shared-article__description-container',
      '.feed-shared-text',
      '.feed-shared-update-v2__commentary'
    ],
    commentBox: '.comments-comment-box__form-container .ql-editor, .comments-comment-texteditor__content'
  },
  reddit: {
    post: [
      '.Post h1',
      '.Post h2',
      '.Post p',
      '[data-test-id="post-content"]',
      '.entry .usertext-body',
      '.title.may-blank',
      '.expando'
    ],
    commentBox: '.commentarea textarea, .LinkCommentTextArea__textarea, .public-DraftEditor-content'
  },
  youtube: {
    post: [
      '#content-text',
      '.ytd-video-secondary-info-renderer',
      '#description',
      '.ytd-expander.ytd-video-secondary-info-renderer',
      '#description-inline-expander'
    ],
    commentBox: '#simplebox-placeholder, #contenteditable-textarea, #contenteditable-root'
  }
};

// Detect current platform
function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('twitter.com')) return 'twitter';
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('facebook.com')) return 'facebook';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('reddit.com')) return 'reddit';
  if (hostname.includes('youtube.com')) return 'youtube';
  return null;
}

// Extract post content with improved fallback options
function extractPostContent() {
  const platform = detectPlatform();
  if (!platform) {
    console.log('Platform not detected:', window.location.hostname);
    return null;
  }

  console.log('Detected platform:', platform);
  const selectors = PLATFORM_SELECTORS[platform];
  let postElement = null;
  let usedSelector = '';

  // Try all possible selectors for the platform
  for (const selector of selectors.post) {
    postElement = document.querySelector(selector);
    if (postElement) {
      usedSelector = selector;
      console.log('Found content using selector:', selector);
      break;
    }
  }

  // Try to find content in parent elements if direct selectors fail
  if (!postElement) {
    console.log('Trying fallback content detection...');
    const possibleElements = document.querySelectorAll('article p, article div, .post-content, [role="article"] p, [role="article"] div');
    for (const element of possibleElements) {
      const text = element.textContent.trim();
      if (text.length > 20) {
        postElement = element;
        usedSelector = 'fallback';
        console.log('Found content using fallback method');
        break;
      }
    }
  }

  if (!postElement) {
    console.log('No content found with any selector');
    return null;
  }

  // Clean up the extracted text
  let content = postElement.textContent.trim();
  console.log('Raw content:', content);

  // Remove common social media artifacts
  content = content
    .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // Remove URLs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  console.log('Cleaned content:', content);
  return content;
}

// Insert comment into the comment box with retry mechanism
async function insertComment(comment) {
  const platform = detectPlatform();
  if (!platform) return false;

  const selector = PLATFORM_SELECTORS[platform].commentBox;
  let commentBox = document.querySelector(selector);
  
  // Retry a few times if the comment box is not immediately available
  if (!commentBox) {
    console.log('Comment box not found, retrying...');
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      commentBox = document.querySelector(selector);
      if (commentBox) {
        console.log('Found comment box on retry', i + 1);
        break;
      }
    }
  }
  
  if (!commentBox) {
    console.log('Comment box not found after retries');
    return false;
  }

  try {
    // Handle different platforms' comment box behaviors
    switch (platform) {
      case 'twitter':
      case 'instagram':
      case 'reddit':
        commentBox.value = comment;
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));
        commentBox.dispatchEvent(new Event('change', { bubbles: true }));
        break;
        
      case 'facebook':
        commentBox.textContent = comment;
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));
        commentBox.dispatchEvent(new Event('change', { bubbles: true }));
        break;
        
      case 'linkedin':
      case 'youtube':
        commentBox.innerHTML = comment;
        commentBox.dispatchEvent(new Event('input', { bubbles: true }));
        commentBox.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Some platforms need focus events
        commentBox.focus();
        commentBox.dispatchEvent(new Event('focus', { bubbles: true }));
        break;
    }

    console.log('Successfully inserted comment');
    return true;
  } catch (error) {
    console.error('Error inserting comment:', error);
    return false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'ping':
        // Respond to ping to confirm content script is loaded
        sendResponse({ success: true });
        break;

      case 'getPostContent':
        console.log('Attempting to extract post content...');
        const content = extractPostContent();
        if (!content) {
          console.log('No content found');
          sendResponse({ 
            content: null, 
            error: 'Could not find post content. Please make sure you\'re on a supported social media post.' 
          });
        } else {
          console.log('Successfully extracted content');
          sendResponse({ content, error: null });
        }
        break;
        
      case 'insertComment':
        console.log('Attempting to insert comment...');
        insertComment(request.comment).then(success => {
          sendResponse({ 
            success, 
            error: success ? null : 'Could not find comment box. Please make sure you\'re on a supported social media post.' 
          });
        });
        break;
    }
  } catch (error) {
    console.error('Error in content script:', error);
    sendResponse({ error: error.message });
  }
  
  return true; // Required for async response
}); 