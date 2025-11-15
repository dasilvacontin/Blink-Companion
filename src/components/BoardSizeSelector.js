/**
 * BoardSizeSelector Component
 * Menu for selecting Minesweeper board size
 */
import { createMenuContainer } from './MenuContainer.js';

export function createBoardSizeSelector({ highlightedIndex = 0 } = {}) {
  const boardSizeOptions = [
    { title: 'Small', subtitle: '10x10 board' },
    { title: 'Medium', subtitle: '20x20 board' },
    { title: 'Large', subtitle: '30x30 board' },
  ];

  return createMenuContainer({
    title: 'Select Board Size',
    options: boardSizeOptions,
    highlightedIndex,
  });
}

