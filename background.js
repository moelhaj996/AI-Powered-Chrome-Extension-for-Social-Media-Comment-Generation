// Store API key in chrome.storage
let OPENAI_API_KEY = '';

// Load API key from storage
function loadApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openai_api_key'], (result) => {
      if (result.openai_api_key) {
        OPENAI_API_KEY = result.openai_api_key;
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Initialize by loading API key
loadApiKey();

// Listen for API key updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateApiKey') {
    OPENAI_API_KEY = request.apiKey;
    return true;
  }
});

// Language-specific instructions
const LANGUAGE_INSTRUCTIONS = {
  en: 'Write in English',
  es: 'Escribe en español',
  fr: 'Écris en français',
  de: 'Schreibe auf Deutsch',
  it: 'Scrivi in italiano',
  pt: 'Escreva em português',
  nl: 'Schrijf in het Nederlands',
  ru: 'Пиши по-русски',
  ja: '日本語で書いてください',
  ko: '한국어로 작성하세요',
  zh: '用中文写'
};

// Generate tone-specific prompt
function generatePrompt(content, tone, options) {
  const toneInstructions = {
    professional: 'Write a professional and insightful comment that demonstrates expertise and adds value to the discussion.',
    casual: 'Write a friendly and relatable comment using conversational language.',
    funny: 'Write a humorous and witty comment that will make people smile.',
    supportive: 'Write an encouraging and empathetic comment that shows support.',
    engaging: 'Write an engaging comment that sparks discussion and encourages interaction.',
    enthusiastic: 'Write an energetic and passionate comment that shows excitement.',
    formal: 'Write a formal and polite comment maintaining professional etiquette.',
    friendly: 'Write a warm and approachable comment that builds rapport.',
    informative: 'Write an educational comment that shares valuable information.',
    persuasive: 'Write a convincing comment that influences others positively.'
  };

  const languageInstruction = LANGUAGE_INSTRUCTIONS[options.language] || LANGUAGE_INSTRUCTIONS.en;
  const emojiInstruction = options.addEmojis ? 'Include relevant emojis to enhance the message.' : 'Do not use emojis.';
  const hashtagInstruction = options.addHashtags ? 'Add relevant hashtags at the end.' : 'Do not use hashtags.';
  const lengthInstruction = `Keep the response under ${options.characterLimit} characters.`;

  return `
Context: Responding to this social media post:
"${content}"

Task: ${toneInstructions[tone]}

Requirements:
- ${languageInstruction}
- Keep it concise and authentic
- ${emojiInstruction}
- ${hashtagInstruction}
- ${lengthInstruction}
- Maintain a ${tone} tone
- Ensure the response is engaging and encourages interaction

Generate 3 different comment options.`;
}

// Call OpenAI API
async function generateAIComments(content, tone, options) {
  // Check if API key is set
  if (!OPENAI_API_KEY) {
    // Try loading the API key again
    const keyLoaded = await loadApiKey();
    if (!keyLoaded) {
      throw new Error('OpenAI API key not set. Please set it in the extension options.');
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a social media expert who writes engaging, contextually appropriate comments in ${options.language}.`
          },
          {
            role: 'user',
            content: generatePrompt(content, tone, options)
          }
        ],
        temperature: 0.7,
        max_tokens: Math.min(500, Math.ceil(options.characterLimit * 1.5)),
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();
    const comments = data.choices[0].message.content
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('Comment') && !line.startsWith('-'))
      .map(comment => {
        let processedComment = comment.trim();
        if (processedComment.length > options.characterLimit) {
          processedComment = processedComment.substring(0, options.characterLimit - 3) + '...';
        }
        return processedComment;
      });

    return comments;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateComments') {
    generateAIComments(request.content, request.tone, request.options)
      .then(comments => sendResponse(comments))
      .catch(error => {
        console.error('Error generating comments:', error);
        sendResponse({ error: error.message });
      });
    return true; // Required for async response
  }
}); 