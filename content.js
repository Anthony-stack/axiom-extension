// Initialize default settings and WebSocket
let settings = {
  userId: '',
  connected: false
};

let socket = null;
let tokenDataMap = new Map();

// Load saved settings
chrome.storage.sync.get(['userId', 'connected'], function(items) {
  settings = items;
  if (settings.connected) {
    initializeWebSocket();
    initializeButtons();
  }
});

// Initialize WebSocket connection
function initializeWebSocket() {
  if (socket) {
    socket.close();
  }

  socket = new WebSocket('wss://cluster5.axiom.trade/?');
  
  socket.addEventListener('open', () => {
    console.log('WebSocket connection established');
    socket.send(JSON.stringify({ "action": "join", "room": "new_pairs" }));
  });

  socket.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.token) {
        // Store token data with address as key
        tokenDataMap.set(data.token.address.toLowerCase(), data.token);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  socket.addEventListener('close', () => {
    console.log('WebSocket connection closed');
    // Attempt to reconnect after 5 seconds
    setTimeout(initializeWebSocket, 5000);
  });

  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

// Initialize buttons for all matching elements
function initializeButtons() {
  createButtonsForExistingElements();
  observeDOMChanges();
}

// Create buttons for existing elements
function createButtonsForExistingElements() {
  const newPairsHeader = Array.from(document.querySelectorAll('span.text-textPrimary.text-\\[16px\\].font-medium'))
    .find(el => el.textContent === 'New Pairs');
  
  if (!newPairsHeader) return;

  const newPairsSection = newPairsHeader.closest('.flex.flex-1.flex-col');
  if (!newPairsSection) return;

  const tokenElements = newPairsSection.querySelectorAll('.flex.flex-row.w-full.gap-\\[12px\\].pl-\\[12px\\].pr-\\[12px\\]');
  
  tokenElements.forEach(element => {
    addButtonsToElement(element);
  });
}

// Add buttons to a single element
function addButtonsToElement(element) {
  if (element.querySelector('.axiom-helper-button-container')) {
    return;
  }
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'axiom-helper-button-container';
  
  const buyButton = document.createElement('button');
  buyButton.className = 'axiom-helper-button axiom-helper-buy';
  buyButton.textContent = 'BUY';
  
  const sellButton = document.createElement('button');
  sellButton.className = 'axiom-helper-button axiom-helper-sell';
  sellButton.textContent = 'SELL';
  
  buyButton.addEventListener('click', (e) => handleButtonClick(e, 'buy', element));
  sellButton.addEventListener('click', (e) => handleButtonClick(e, 'sell', element));
  
  buttonContainer.appendChild(buyButton);
  buttonContainer.appendChild(sellButton);
  
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  
  element.appendChild(buttonContainer);
}

// Handle button clicks
function handleButtonClick(event, action, element) {
  event.preventDefault();
  event.stopPropagation();
  
  const button = event.currentTarget;
  button.classList.add('axiom-helper-button-pulse');
  
  const tokenInfo = extractTokenInfo(element);
  
  // Get complete token data from WebSocket data
  const completeTokenInfo = tokenInfo.address ? 
    tokenDataMap.get(tokenInfo.address.toLowerCase()) : null;
  
  const finalTokenInfo = {
    ...tokenInfo,
    ...completeTokenInfo
  };
  
  console.log(`${action.toUpperCase()} action for token:`, finalTokenInfo);
  
  // Send message to background script
  chrome.runtime.sendMessage({
    action: action + 'Token',
    tokenInfo: finalTokenInfo
  }, response => {
    console.log('Background response:', response);
  });
  
  setTimeout(() => {
    button.classList.remove('axiom-helper-button-pulse');
  }, 400);
}

// Extract token information including address
function extractTokenInfo(element) {
  if (!element) return { name: 'Unknown', symbol: 'Unknown', address: null };
  
  const addressButton = element.querySelector('button.text-textTertiary span');
  const address = addressButton ? addressButton.textContent.trim() : null;
  
  const nameElement = element.querySelector('.text-\\[16px\\].font-medium.tracking-\\[-0\\.02em\\].truncate');
  const fullNameElement = element.querySelector('.text-inherit.text-\\[16px\\]');
  
  const symbol = nameElement ? nameElement.textContent.trim() : 'Unknown';
  const name = fullNameElement ? fullNameElement.textContent.trim() : 'Unknown';
  
  return {
    symbol,
    name,
    address,
    timestamp: new Date().toISOString()
  };
}

// Set up MutationObserver to handle dynamically added content
function observeDOMChanges() {
  const targetNode = document.body;
  
  const observer = new MutationObserver(function(mutations) {
    let shouldCheckForNewElements = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldCheckForNewElements = true;
      }
    });
    
    if (shouldCheckForNewElements) {
      createButtonsForExistingElements();
    }
  });
  
  observer.observe(targetNode, { 
    childList: true, 
    subtree: true 
  });
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeButtons);
} else {
  initializeButtons();
}