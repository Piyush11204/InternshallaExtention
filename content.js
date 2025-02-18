// State management
let state = {
    isRunning: false,
    isPaused: false,
    inviteCount: 0,
    currentPage: 1
  };
  
  // Configuration
  const config = {
    selectors: {
      inviteButton: '.Invite', // The blue "Invite" button
      skipButton: '.Skip', // The gray "Skip" button
      shortlistButton: '.Shortlist', // The "Shortlist" button
      notInterestedButton: '.Not\\ interested', // The "Not interested" button
      pagination: '.pagination', // Will need to be updated based on actual pagination structure
      nextButton: '.next-page', // Will need to be updated based on actual next page button
      captcha: '.captcha-container' // Will need to be updated if you encounter the actual captcha
    },
    delays: {
      betweenInvites: () => Math.random() * 2000 + 1000, // 1-3 seconds
      beforeNextPage: 3000
    }
  };
  
  // Helper functions
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function updateStats(message = '') {
    chrome.runtime.sendMessage({
      type: 'updateStats',
      inviteCount: state.inviteCount,
      currentPage: state.currentPage,
      message: message
    });
  }
  
  function checkForCaptcha() {
    const captchaElement = document.querySelector(config.selectors.captcha);
    if (captchaElement && captchaElement.isVisible) {
      state.isPaused = true;
      chrome.runtime.sendMessage({ type: 'captchaDetected' });
      return true;
    }
    return false;
  }
  
  // Core automation functions
  async function inviteCandidate(button) {
    try {
      if (!button.disabled && !button.classList.contains('invited')) {
        button.click();
        state.inviteCount++;
        updateStats(`Invited candidate successfully`);
        await sleep(config.delays.betweenInvites());
        return true;
      }
    } catch (error) {
      console.error('Error inviting candidate:', error);
    }
    return false;
  }
  
  async function processCurrentPage() {
    const inviteButtons = document.querySelectorAll(config.selectors.inviteButton);
    
    for (const button of inviteButtons) {
      if (!state.isRunning || state.isPaused) return;
      if (checkForCaptcha()) return;
      
      await inviteCandidate(button);
    }
  }
  
  async function goToNextPage() {
    const nextButton = document.querySelector(config.selectors.nextButton);
    if (nextButton && !nextButton.disabled) {
      state.currentPage++;
      updateStats(`Moving to page ${state.currentPage}`);
      nextButton.click();
      await sleep(config.delays.beforeNextPage);
      return true;
    }
    return false;
  }
  
  async function startAutomation() {
    state.isRunning = true;
    state.isPaused = false;
    
    while (state.isRunning && !state.isPaused) {
      await processCurrentPage();
      
      if (state.isRunning && !state.isPaused) {
        const hasNextPage = await goToNextPage();
        if (!hasNextPage) {
          state.isRunning = false;
          updateStats('Completed all pages!');
          break;
        }
      }
    }
  }
  
  // Message listeners
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'start':
        if (!state.isRunning) {
          startAutomation();
        }
        break;
        
      case 'pause':
        state.isPaused = true;
        updateStats('Automation paused');
        break;
        
      case 'resume':
        if (state.isRunning) {
          state.isPaused = false;
          startAutomation();
        }
        break;
        
      case 'stop':
        state.isRunning = false;
        state.isPaused = false;
        updateStats('Automation stopped');
        break;
    }
    
    // Update background script with current status
    chrome.runtime.sendMessage({
      type: 'automationStatus',
      isRunning: state.isRunning,
      isPaused: state.isPaused
    });
  });
  
  // Initialize when page loads
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'pageLoaded' && request.shouldContinue) {
      startAutomation();
    }
  });