/**
 * DifficultySelector Component
 * Menu for selecting Minesweeper difficulty level
 */
import { createMenuContainer } from './MenuContainer.js';

export function createDifficultySelector({ highlightedIndex = 0 } = {}) {
  const difficultyOptions = [
    { title: 'Easy', subtitle: 'Fewer mines, larger safe areas' },
    { title: 'Medium', subtitle: 'Standard mine density' },
    { title: 'Hard', subtitle: 'More mines, tighter spacing' },
  ];

  return createMenuContainer({
    title: 'Select Difficulty',
    options: difficultyOptions,
    highlightedIndex,
  });
}

