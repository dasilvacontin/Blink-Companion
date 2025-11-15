/**
 * ValueDisplay Component
 * A centered value display for settings detail pages (no border, no progress)
 */
export function createValueDisplay({ value }) {
  const optionEl = document.createElement('div');
  optionEl.className = 'menu-option';
  optionEl.style.border = 'none';
  optionEl.style.padding = '10px';
  optionEl.style.textAlign = 'center';
  
  const content = document.createElement('div');
  content.className = 'menu-option-content';
  content.style.textAlign = 'center';
  
  const titleEl = document.createElement('div');
  titleEl.className = 'menu-option-title';
  titleEl.textContent = value;
  titleEl.style.textAlign = 'center';
  
  content.appendChild(titleEl);
  optionEl.appendChild(content);
  
  return optionEl;
}

