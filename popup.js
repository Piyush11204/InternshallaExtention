let isRunning = false;
let isPaused = false;

document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusSpan = document.getElementById('status');
  const logsDiv = document.getElementById('logs');

  // Load initial state
  chrome.storage.local.get(['inviteCount', 'currentPage', 'isRunning', 'isPaused'], function(data) {
    document.getElementById('inviteCount').textContent = data.inviteCount || 0;
    document.getElementById('currentPage').textContent = data.currentPage || '-';
    isRunning = data.isRunning || false;
    isPaused = data.isPaused || false;
    updateButtonStates();
  });

  startBtn.addEventListener('click', function() {
    isRunning = true;
    isPaused = false;
    updateButtonStates();
    addLog('Starting automation...');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'start'});
    });
  });

  pauseBtn.addEventListener('click', function() {
    isPaused = !isPaused;
    updateButtonStates();
    addLog(isPaused ? 'Paused automation' : 'Resumed automation');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: isPaused ? 'pause' : 'resume'});
    });
  });

  stopBtn.addEventListener('click', function() {
    isRunning = false;
    isPaused = false;
    updateButtonStates();
    addLog('Stopped automation');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stop'});
    });
  });

  function updateButtonStates() {
    startBtn.disabled = isRunning;
    pauseBtn.disabled = !isRunning;
    stopBtn.disabled = !isRunning;
    statusSpan.textContent = isPaused ? 'Paused' : (isRunning ? 'Running' : 'Idle');
  }

  function addLog(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    logsDiv.insertBefore(logEntry, logsDiv.firstChild);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'updateStats') {
    document.getElementById('inviteCount').textContent = request.inviteCount;
    document.getElementById('currentPage').textContent = request.currentPage;
    addLog(request.message);
  } else if (request.type === 'captchaDetected') {
    addLog('⚠️ CAPTCHA detected! Please solve it manually and click resume.');
    isPaused = true;
    updateButtonStates();
  }
});