/**
 * MenuContainer Component
 * Container for menu title and options
 */
import { createMenuTitle } from './MenuTitle.js';
import { createMenuOption } from './MenuOption.js';

export function createMenuContainer({ title, options = [], highlightedIndex = 0 }) {
  const container = document.createElement('div');
  container.id = 'menu-container';
  
  const titleEl = createMenuTitle(title);
  container.appendChild(titleEl);
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'menu-options';
  
  options.forEach((option, index) => {
    const optionEl = createMenuOption({
      title: option.title,
      subtitle: option.subtitle,
      highlighted: index === highlightedIndex,
      progress: 0,
    });
    optionsContainer.appendChild(optionEl);
  });
  
  container.appendChild(optionsContainer);
  
  return container;
}

