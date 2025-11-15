/**
 * MenuContainer Component
 * Container for menu title and options
 */
import { createMenuTitle } from './MenuTitle.js';
import { createMenuOption } from './MenuOption.js';
import { createSettingsOption } from './SettingsOption.js';

export function createMenuContainer({ title, options = [], highlightedIndex = 0, isSettings = false }) {
  const container = document.createElement('div');
  container.id = 'menu-container';
  
  const titleEl = createMenuTitle(title);
  container.appendChild(titleEl);
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'menu-options';
  
  options.forEach((option, index) => {
    let optionEl;
    if (isSettings && option.value) {
      // Use SettingsOption for settings menu items with values
      optionEl = createSettingsOption({
        title: option.title,
        subtitle: option.subtitle,
        value: option.value,
      });
      if (index === highlightedIndex) {
        optionEl.classList.add('highlighted');
      }
    } else {
      optionEl = createMenuOption({
        title: option.title,
        subtitle: option.subtitle,
        highlighted: index === highlightedIndex,
        progress: 0,
      });
    }
    optionsContainer.appendChild(optionEl);
  });
  
  container.appendChild(optionsContainer);
  
  return container;
}

