// Initialize default settings
let settings = {
  userId: '',
  connected: false
};

// Load saved settings
chrome.storage.sync.get(['userId', 'connected'], function(items) {
  settings = items;
  if (settings.connected) {
    initializeButtons();
  }
});

// Initialize buttons for all matching elements
function initializeButtons() {
  // Use MutationObserver to handle dynamic content
  createButtonsForExistingElements();
  observeDOMChanges();
}

// Create buttons for existing elements
function createButtonsForExistingElements() {
  // Find the New Pairs section
  const newPairsHeader = Array.from(document.querySelectorAll('span.text-textPrimary.text-\\[16px\\].font-medium'))
    .find(el => el.textContent === 'New Pairs');
  
  if (!newPairsHeader) return;

  // Get the parent container of New Pairs section
  const newPairsSection = newPairsHeader.closest('.flex.flex-1.flex-col');
  if (!newPairsSection) return;

  // Find all token elements within the New Pairs section
  const tokenElements = newPairsSection.querySelectorAll('.flex.flex-row.w-full.gap-\\[12px\\].pl-\\[12px\\].pr-\\[12px\\]');
  
  tokenElements.forEach(element => {
    addButtonsToElement(element);
  });
}

// Add buttons to a single element
function addButtonsToElement(element) {
  // Skip if already has buttons
  if (element.querySelector('.axiom-helper-button-container')) {
    return;
  }
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'axiom-helper-button-container';
  
  // Create BUY button
  const buyButton = document.createElement('button');
  buyButton.className = 'axiom-helper-button axiom-helper-buy';
  buyButton.textContent = 'BUY';
  
  // Create SELL button
  const sellButton = document.createElement('button');
  sellButton.className = 'axiom-helper-button axiom-helper-sell';
  sellButton.textContent = 'SELL';
  
  // Add event listeners
  buyButton.addEventListener('click', (e) => handleButtonClick(e, 'buy', element));
  sellButton.addEventListener('click', (e) => handleButtonClick(e, 'sell', element));
  
  // Append buttons to container
  buttonContainer.appendChild(buyButton);
  buttonContainer.appendChild(sellButton);
  
  // Add position relative to parent if needed
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  
  // Append container to element
  element.appendChild(buttonContainer);
}

// Handle button clicks
function handleButtonClick(event, action, element) {
  event.preventDefault();
  event.stopPropagation();
  
  const button = event.currentTarget;
  button.classList.add('axiom-helper-button-pulse');
  
  // Extract token address from the element
  const tokenInfo = extractTokenInfo(element);
  console.log(`${action.toUpperCase()} action for token:`, tokenInfo);
  
  // Remove animation class after animation completes
  setTimeout(() => {
    button.classList.remove('axiom-helper-button-pulse');
  }, 400);
}

// Extract token information including address
function extractTokenInfo(element) {
  if (!element) return { name: 'Unknown', symbol: 'Unknown', address: null };
  
  // Find the button with token address
  const addressButton = element.querySelector('button.text-textTertiary span');
  const address = addressButton ? addressButton.textContent.trim() : null;
  
  // Extract token name and symbol
  const nameElement = element.querySelector('.text-\\[16px\\].font-medium.tracking-\\[-0\\.02em\\].truncate');
  const fullNameElement = element.querySelector('.text-inherit.text-\\[16px\\]');
  
  const symbol = nameElement ? nameElement.textContent.trim() : 'Unknown';
  const name = fullNameElement ? fullNameElement.textContent.trim() : 'Unknown';
  
  return {
    symbol,
    name,
    address,
    element
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