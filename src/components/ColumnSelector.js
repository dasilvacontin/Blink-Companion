/**
 * ColumnSelector Component
 * Menu for selecting a column in Minesweeper
 */
import { createMenuContainer } from './MenuContainer.js';

export function createColumnSelector({ 
    cols = 10, 
    availableCols = [], 
    highlightedIndex = 0 
} = {}) {
    // Create column options
    const colOptions = availableCols.map((colIndex) => ({
        title: `Column ${colIndex + 1}`,
        subtitle: `Select column ${colIndex + 1}`,
        id: `col-${colIndex}`
    }));
    
    return createMenuContainer({
        title: 'Select Column',
        options: colOptions,
        highlightedIndex,
    });
}

