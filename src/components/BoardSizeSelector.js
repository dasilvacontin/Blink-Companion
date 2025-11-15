/**
 * BoardSizeSelector Component
 * Menu for selecting Minesweeper board size
 */
import { createMenuContainer } from './MenuContainer.js';

export function createBoardSizeSelector({ highlightedIndex = 0 } = {}) {
  const boardSizeOptions = [
    { title: 'Small', subtitle: '7x7 board' },
    { title: 'Medium', subtitle: '9x9 board' },
    { title: 'Large', subtitle: '9x16 board' },
  ];

  return createMenuContainer({
    title: 'Select Board Size',
    options: boardSizeOptions,
    highlightedIndex,
  });
}

