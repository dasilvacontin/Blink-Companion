/**
 * MenuOption Component
 * A single menu option with title, subtitle, and progress indicator
 */
export function createMenuOption({ title, subtitle, highlighted = false, progress = 0 }) {
  const option = document.createElement('div');
  option.className = 'menu-option';
  if (highlighted) {
    option.classList.add('highlighted');
  }
  
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.style.width = `${progress * 100}%`;
  
  const content = document.createElement('div');
  content.className = 'menu-option-content';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'menu-option-title';
  titleEl.textContent = title;
  
  const subtitleEl = document.createElement('div');
  subtitleEl.className = 'menu-option-subtitle';
  subtitleEl.textContent = subtitle;
  
  content.appendChild(titleEl);
  content.appendChild(subtitleEl);
  option.appendChild(progressFill);
  option.appendChild(content);
  
  return option;
}

