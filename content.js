// Platform-specific selectors for post content
const PLATFORM_SELECTORS = {
  twitter: {
    post: '[data-testid="tweetText"]',
    commentBox: '[data-testid="tweetTextarea_0"]',
    alternatePost: '.tweet-text, [data-testid="tweet"] article'
  },
  instagram: {
    post: 'h1._aacl._aaco._aacu._aacx._aad7._aade, ._a9zs, article ._aagv',
    commentBox: '._aaoc textarea, form textarea',
    alternatePost: '._a9zs'
  },
  facebook: {
    post: '[data-ad-preview="message"], .userContent, ._5pbx, ._5rgt',
    commentBox: 'form.commentable_item textarea, .UFIAddCommentInput ._1p1v',
    alternatePost: '._5pbx p, ._5rgt._5nk5'
  },
  linkedin: {
    post: '.feed-shared-update-v2__description-wrapper span.break-words, .feed-shared-text-view, .feed-shared-article__description-container',
    commentBox: '.comments-comment-box__form-container .ql-editor, .comments-comment-texteditor__content',
    alternatePost: '.feed-shared-text'
  },
  reddit: {
    post: '.Post h1, .Post h2, .Post p, [data-test-id="post-content"]',
    commentBox: '.commentarea textarea, .LinkCommentTextArea__textarea',
    alternatePost: '.entry .usertext-body'
  },
  youtube: {
    post: '#content-text, .ytd-video-secondary-info-renderer',
    commentBox: '#simplebox-placeholder, #contenteditable-textarea',
    alternatePost: '.watch-description-text'
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

// Extract post content with fallback options
function extractPostContent() {
  const platform = detectPlatform();
  if (!platform) return null;

  const selectors = PLATFORM_SELECTORS[platform];
  let postElement = document.querySelector(selectors.post);
  
  // Try alternate selector if primary fails
  if (!postElement && selectors.alternatePost) {
    postElement = document.querySelector(selectors.alternatePost);
  }
  
  // Try to find content in parent elements if direct selectors fail
  if (!postElement) {
    const possibleElements = document.querySelectorAll('article p, article div, .post-content');
    for (const element of possibleElements) {
      const text = element.textContent.trim();
      if (text.length > 20) { // Assume it's the main content if it has substantial text
        postElement = element;
        break;
      }
    }
  }
  
  if (!postElement) return null;
  
  // Clean up the extracted text
  let content = postElement.textContent.trim();
  
  // Remove common social media artifacts
  content = content
    .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '') // Remove URLs
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
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
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      commentBox = document.querySelector(selector);
      if (commentBox) break;
    }
  }
  
  if (!commentBox) return false;

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
        const content = extractPostContent();
        if (!content) {
          sendResponse({ 
            content: null, 
            error: 'Could not find post content. Please make sure you\'re on a supported social media post.' 
          });
        } else {
          sendResponse({ content, error: null });
        }
        break;
        
      case 'insertComment':
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