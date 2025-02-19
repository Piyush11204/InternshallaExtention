// Background service worker for the Internshala Invitation Automator

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'statusUpdate') {
    // Forward status updates to the popup
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'statusUpdate',
          data: request.data
        });
      }
    });
  } else if (request.type === 'captchaDetected') {
    // Handle CAPTCHA detection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'captchaDetected',
          message: request.message
        });
      }
    });
  }
});

// Listen for tab updates (e.g., page reloads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    // Notify the content script that the page has reloaded
    chrome.tabs.sendMessage(tabId, {
      type: 'pageReloaded'
    });
  }
});

// Handle extension installation or updates
chrome.runtime.onInstalled.addListener(() => {
  console.log('Internshala Invitation Automator installed/updated.');
});