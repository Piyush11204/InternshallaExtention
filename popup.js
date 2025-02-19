let isRunning = false;
let isPaused = false;

document.addEventListener('DOMContentLoaded', function () {
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusSpan = document.getElementById('status');
  const logsDiv = document.getElementById('logs');
  const inviteCountSpan = document.getElementById('inviteCount');
  const skipCountSpan = document.getElementById('skipCount');
  const currentPageSpan = document.getElementById('currentPage');
  const errorCounterDiv = document.getElementById('errorCounter');

  // Load initial state from storage
  chrome.storage.local.get(['inviteCount', 'skipCount', 'currentPage', 'isRunning', 'isPaused'], function (data) {
    inviteCountSpan.textContent = data.inviteCount || 0;
    skipCountSpan.textContent = data.skipCount || 0;
    currentPageSpan.textContent = data.currentPage || '-';
    isRunning = data.isRunning || false;
    isPaused = data.isPaused || false;
    updateButtonStates();
  });

  // Start button click handler
  startBtn.addEventListener('click', function () {
    isRunning = true;
    isPaused = false;
    updateButtonStates();
    addLog('Starting automation...', 'info');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'start' });
    });
  });

  // Pause button click handler
  pauseBtn.addEventListener('click', function () {
    isPaused = !isPaused;
    updateButtonStates();
    addLog(isPaused ? 'Paused automation' : 'Resumed automation', isPaused ? 'warning' : 'info');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: isPaused ? 'pause' : 'resume' });
    });
  });

  // Stop button click handler
  stopBtn.addEventListener('click', function () {
    isRunning = false;
    isPaused = false;
    updateButtonStates();
    addLog('Stopped automation', 'info');

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'stop' });
    });
  });

  // Update button states based on automation status
  function updateButtonStates() {
    startBtn.disabled = isRunning;
    pauseBtn.disabled = !isRunning;
    stopBtn.disabled = !isRunning;
    statusSpan.textContent = isPaused ? 'Paused' : isRunning ? 'Running' : 'Idle';
    document.getElementById('statusDot').className = `status-dot ${isPaused ? 'paused' : isRunning ? 'running' : ''}`;
  }

  // Add a log entry to the logs container
  function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    logsDiv.appendChild(logEntry);
    logsDiv.scrollTop = logsDiv.scrollHeight; // Auto-scroll to the bottom
  }

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === 'statusUpdate') {
      // Update stats and logs
      inviteCountSpan.textContent = request.data.inviteCount;
      skipCountSpan.textContent = request.data.skipCount;
      currentPageSpan.textContent = request.data.currentPage;
      errorCounterDiv.textContent = request.data.errors > 0 ? `Errors: ${request.data.errors}` : '';
      addLog(request.data.message, request.data.type);
    } else if (request.type === 'captchaDetected') {
      // Handle CAPTCHA detection
      addLog('⚠️ CAPTCHA detected! Please solve it manually and click resume.', 'error');
      isPaused = true;
      updateButtonStates();
    }
  });
});