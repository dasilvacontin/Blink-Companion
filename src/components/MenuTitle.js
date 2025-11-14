/**
 * MenuTitle Component
 * The title displayed at the top of a menu
 */
export function createMenuTitle(text) {
  const title = document.createElement('h1');
  title.className = 'menu-title';
  title.textContent = text;
  return title;
}

