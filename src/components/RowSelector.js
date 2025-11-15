/**
 * RowSelector Component
 * Menu for selecting a row in Minesweeper
 */
import { createMenuContainer } from './MenuContainer.js';

export function createRowSelector({ 
    rows = 10, 
    availableRows = [], 
    highlightedIndex = 0 
} = {}) {
    // Create row options
    const rowOptions = availableRows.map((rowIndex) => ({
        title: `Row ${rowIndex + 1}`,
        subtitle: `Select row ${rowIndex + 1}`,
        id: `row-${rowIndex}`
    }));
    
    return createMenuContainer({
        title: 'Select Row',
        options: rowOptions,
        highlightedIndex,
    });
}

