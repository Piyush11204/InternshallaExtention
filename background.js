// Initialize state variables in extension storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
      inviteCount: 0,
      currentPage: 1,
      isRunning: false,
      isPaused: false
    });
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
      case 'updateStats':
        // Update storage with new statistics
        chrome.storage.local.set({
          inviteCount: request.inviteCount,
          currentPage: request.currentPage
        });
        break;
  
      case 'automationStatus':
        // Update automation status
        chrome.storage.local.set({
          isRunning: request.isRunning,
          isPaused: request.isPaused
        });
        break;
  
      case 'captchaDetected':
        // Notify all tabs about CAPTCHA
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'captchaDetected'
            });
          });
        });
        break;
    }
    
    // Always return true to indicate async response
    return true;
  });
  
  // Handle tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Make sure tab.url exists and status is complete before proceeding
    if (changeInfo.status === 'complete' && tab.url && typeof tab.url === 'string') {
      // Now we can safely check the URL
      if (tab.url.includes('internshala.com')) {
        // Check if automation should continue on this page
        chrome.storage.local.get(['isRunning', 'isPaused'], (data) => {
          if (data.isRunning && !data.isPaused) {
            chrome.tabs.sendMessage(tabId, {
              type: 'pageLoaded',
              shouldContinue: true
            });
          }
        });
      }
    }
  });