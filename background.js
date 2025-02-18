// State management
let automationState = {
    isRunning: false,
    isPaused: false,
    errors: [],
    activeTabId: null
  };
  
  // Initialize extension
  chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
      inviteCount: 0,
      skipCount: 0,
      currentPage: 1,
      errors: [],
      isRunning: false,
      isPaused: false
    });
  });
  
  // Error handling
  function handleError(error, context) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      context: context,
      stack: error.stack
    };
    
    automationState.errors.push(errorInfo);
    console.error('Background Error:', errorInfo);
    
    // Notify popup of error
    chrome.runtime.sendMessage({
      type: 'error',
      data: errorInfo
    });
  }
  
  // Message handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.type) {
        case 'statusUpdate':
          handleStatusUpdate(request.data);
          break;
        case 'error':
          handleError(request.data, 'content_script');
          break;
        case 'automationControl':
          handleAutomationControl(request.data);
          break;
        default:
          console.warn('Unknown message type:', request.type);
      }
    } catch (error) {
      handleError(error, `message_handler:${request.type}`);
    }
    return true; // Keep message channel open for async response
  });
  
  // Status update handler
  function handleStatusUpdate(data) {
    chrome.storage.local.set({
      inviteCount: data.inviteCount,
      skipCount: data.skipCount,
      currentPage: data.currentPage,
      lastUpdate: new Date().toISOString(),
      lastStatus: data.message,
      lastStatusType: data.type
    });
    
    // Update badge with invite count
    if (data.inviteCount > 0) {
      chrome.action.setBadgeText({ text: data.inviteCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    }
  }
  
  // Automation control handler
  function handleAutomationControl(data) {
    automationState.isRunning = data.isRunning;
    automationState.isPaused = data.isPaused;
    
    chrome.storage.local.set({
      isRunning: data.isRunning,
      isPaused: data.isPaused
    });
  }
  
  // Tab update handler
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('internshala.com')) {
      try {
        chrome.storage.local.get(['isRunning', 'isPaused'], (data) => {
          if (data.isRunning && !data.isPaused) {
            chrome.tabs.sendMessage(tabId, {
              type: 'pageLoaded',
              shouldContinue: true
            }).catch(error => {
              handleError(error, 'tab_update_message');
            });
          }
        });
      } catch (error) {
        handleError(error, 'tab_update');
      }
    }
  });
  
  // Tab removal handler
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === automationState.activeTabId) {
      automationState.activeTabId = null;
      automationState.isRunning = false;
      automationState.isPaused = false;
      
      chrome.storage.local.set({
        isRunning: false,
        isPaused: false
      });
    }
  });