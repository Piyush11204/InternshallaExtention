// State management with more detailed status tracking
let state = {
  isRunning: false,
  isPaused: false,
  inviteCount: 0,
  skipCount: 0,
  currentPage: 1,
  errors: [],
  lastActionTimestamp: null
};

// Improved configuration
const config = {
  selectors: {
    inviteBtn: 'button.btn-primary:not([disabled])', // Primary invite button
    skipBtn: 'button:contains("Skip")', // Skip button
    candidateContainer: '.candidate-list-item', // Container for each candidate
    applicationStatus: '.status-indicator', // Application status indicator
    nextPageBtn: '.pagination .next', // Next page button
    paginationContainer: '.pagination', // Pagination container
    loadingIndicator: '.loading-indicator', // Loading indicator
    errorMessage: '.error-message' // Error message
  },
  delays: {
    minActionDelay: 1000, // Minimum delay between actions
    maxActionDelay: 3000, // Maximum delay between actions
    errorRetryDelay: 5000, // Delay before retrying after error
    pageLoadDelay: 3000 // Delay after page load
  },
  maxRetries: 3 // Maximum number of retry attempts per action
};

// Improved helper functions
const helpers = {
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  getRandomDelay: () =>
    Math.floor(
      Math.random() * (config.delays.maxActionDelay - config.delays.minActionDelay) +
        config.delays.minActionDelay
    ),

  logError: (error, context) => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      context: context,
      stack: error.stack
    };
    state.errors.push(errorInfo);
    console.error('Automation Error:', errorInfo);
    return errorInfo;
  },

  updateStatus: (message, type = 'info') => {
    chrome.runtime.sendMessage({
      type: 'statusUpdate',
      data: {
        message,
        type,
        inviteCount: state.inviteCount,
        skipCount: state.skipCount,
        currentPage: state.currentPage,
        errors: state.errors.length
      }
    });
  },

  isElementVisible: (element) => {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  },

  waitForElement: async (selector, timeout = 5000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element && helpers.isElementVisible(element)) {
        return element;
      }
      await helpers.sleep(100);
    }
    throw new Error(`Element ${selector} not found or not visible after ${timeout}ms`);
  }
};

// Core automation functions
class ApplicationAutomation {
  constructor() {
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'start':
            await this.start();
            break;
          case 'pause':
            await this.pause();
            break;
          case 'resume':
            await this.resume();
            break;
          case 'stop':
            await this.stop();
            break;
          default:
            console.warn('Unknown action:', request.action);
        }
      } catch (error) {
        helpers.logError(error, `Message handler: ${request.action}`);
      }
    });
  }

  async start() {
    if (state.isRunning) return;

    state.isRunning = true;
    state.isPaused = false;
    helpers.updateStatus('Starting automation...', 'info');

    try {
      await this.processCurrentPage();
    } catch (error) {
      helpers.logError(error, 'start');
      await this.handleError(error);
    }
  }

  async pause() {
    state.isPaused = true;
    helpers.updateStatus('Automation paused', 'warning');
  }

  async resume() {
    if (!state.isRunning) return;
    state.isPaused = false;
    helpers.updateStatus('Resuming automation...', 'info');
    await this.processCurrentPage();
  }

  async stop() {
    state.isRunning = false;
    state.isPaused = false;
    helpers.updateStatus('Automation stopped', 'info');
  }

  async processCandidate(candidateElement) {
    try {
      // Wait for a random delay to simulate human behavior
      await helpers.sleep(helpers.getRandomDelay());

      // Find action buttons for this candidate
      const inviteBtn = candidateElement.querySelector(config.selectors.inviteBtn);
      const skipBtn = candidateElement.querySelector(config.selectors.skipBtn);

      if (inviteBtn && helpers.isElementVisible(inviteBtn)) {
        await this.inviteCandidate(inviteBtn);
      } else if (skipBtn && helpers.isElementVisible(skipBtn)) {
        await this.skipCandidate(skipBtn);
      } else {
        throw new Error('No valid action buttons found for candidate');
      }
    } catch (error) {
      helpers.logError(error, 'processCandidate');
      // Continue with next candidate instead of stopping completely
      return false;
    }
    return true;
  }

  async inviteCandidate(inviteBtn) {
    try {
      inviteBtn.click();
      state.inviteCount++;
      state.lastActionTimestamp = Date.now();
      helpers.updateStatus(`Invited candidate (Total: ${state.inviteCount})`, 'success');
      await helpers.sleep(helpers.getRandomDelay());
    } catch (error) {
      throw new Error(`Failed to invite candidate: ${error.message}`);
    }
  }

  async skipCandidate(skipBtn) {
    try {
      skipBtn.click();
      state.skipCount++;
      state.lastActionTimestamp = Date.now();
      helpers.updateStatus(`Skipped candidate (Total: ${state.skipCount})`, 'info');
      await helpers.sleep(helpers.getRandomDelay());
    } catch (error) {
      throw new Error(`Failed to skip candidate: ${error.message}`);
    }
  }

  async processCurrentPage() {
    if (!state.isRunning || state.isPaused) return;

    try {
      // Wait for candidate elements to load
      await helpers.sleep(config.delays.pageLoadDelay);

      const candidates = document.querySelectorAll(config.selectors.candidateContainer);
      if (candidates.length === 0) {
        throw new Error('No candidates found on current page');
      }

      for (const candidate of candidates) {
        if (!state.isRunning || state.isPaused) break;
        await this.processCandidate(candidate);
      }

      // Check if there's a next page
      await this.handlePagination();
    } catch (error) {
      await this.handleError(error);
    }
  }

  async handlePagination() {
    try {
      const nextButton = await helpers.waitForElement(config.selectors.nextPageBtn);
      if (nextButton && !nextButton.disabled) {
        state.currentPage++;
        helpers.updateStatus(`Moving to page ${state.currentPage}...`, 'info');
        nextButton.click();
        await helpers.sleep(config.delays.pageLoadDelay);
        await this.processCurrentPage();
      } else {
        helpers.updateStatus('Reached last page. Automation complete!', 'success');
        await this.stop();
      }
    } catch (error) {
      throw new Error(`Pagination error: ${error.message}`);
    }
  }

  async handleError(error) {
    helpers.updateStatus(`Error: ${error.message}`, 'error');

    if (state.errors.length >= config.maxRetries) {
      helpers.updateStatus('Too many errors occurred. Stopping automation.', 'error');
      await this.stop();
    } else {
      helpers.updateStatus('Retrying after error...', 'warning');
      await helpers.sleep(config.delays.errorRetryDelay);
      await this.processCurrentPage();
    }
  }
}

// Initialize automation
const automation = new ApplicationAutomation();

// Handle page load
document.addEventListener('DOMContentLoaded', () => {
  helpers.updateStatus('Extension ready', 'info');
});