/**
 * SettingsOption Component
 * A menu option in the settings menu that displays a setting name, description, and current value
 * Value appears under the subtitle
 */
export function createSettingsOption({ title, subtitle, value, highlighted = false, progress = 0 }) {
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
  
  const valueEl = document.createElement('div');
  valueEl.className = 'menu-option-value menu-option-value-right';
  valueEl.textContent = value;
  
  // Order: title, subtitle, value (value under subtitle)
  content.appendChild(titleEl);
  content.appendChild(subtitleEl);
  option.appendChild(progressFill);
  option.appendChild(content);
  option.appendChild(valueEl);
  
  return option;
}

