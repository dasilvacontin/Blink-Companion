/**
 * LockScreen Component
 * A 3x3 grid for SOS pattern entry with optional debug information
 */
export function createLockScreen({ patternProgress = [], showDebug = false }) {
  const container = document.createElement('div');
  container.className = 'lock-screen';
  
  const title = document.createElement('h1');
  title.className = 'menu-title';
  title.textContent = 'Blink pattern to unlock';
  container.appendChild(title);
  
  const grid = document.createElement('div');
  grid.className = 'lock-grid';
  
  // SOS pattern: 3 dots, 3 dashes, 3 dots
  const pattern = ['dot', 'dot', 'dot', 'dash', 'dash', 'dash', 'dot', 'dot', 'dot'];
  
  pattern.forEach((type, index) => {
    const square = document.createElement('div');
    square.className = 'lock-square';
    square.dataset.index = index;
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = '0%';
    
    const content = document.createElement('div');
    content.className = 'lock-square-content';
    
    const symbol = document.createElement('div');
    symbol.className = 'lock-symbol';
    symbol.textContent = type === 'dot' ? '•' : '—';
    
    content.appendChild(symbol);
    square.appendChild(progressFill);
    square.appendChild(content);
    grid.appendChild(square);
  });
  
  container.appendChild(grid);
  
  // Calibrate button
  const calibrateButton = document.createElement('button');
  calibrateButton.className = 'calibrate-button';
  calibrateButton.id = 'calibrate-blink-button';
  calibrateButton.textContent = 'Calibrate blink detection';
  container.appendChild(calibrateButton);
  
  // Debug panel - only show if showDebug is true
  if (showDebug) {
    const debugPanel = document.createElement('div');
    debugPanel.className = 'debug-panel';
    debugPanel.id = 'debug-panel';
    
    const debugTitle = document.createElement('h2');
    debugTitle.className = 'debug-title';
    debugTitle.textContent = 'Debug Info';
    debugPanel.appendChild(debugTitle);
    
    const debugContent = document.createElement('div');
    debugContent.className = 'debug-content';
    debugContent.id = 'debug-content';
    debugPanel.appendChild(debugContent);
    
    container.appendChild(debugPanel);
  }
  
  return container;
}

