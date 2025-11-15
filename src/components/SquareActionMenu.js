/**
 * SquareActionMenu Component
 * Menu for actions on a selected square (Cancel, Mine, Flag)
 */
import { createMenuContainer } from './MenuContainer.js';

export function createSquareActionMenu({ 
    highlightedIndex = 0,
    canMine = true,
    canFlag = true
} = {}) {
    const options = [];
    
    // Cancel is always first
    options.push({
        title: 'Cancel',
        subtitle: '',
        id: 'exit'
    });
    
    if (canMine) {
        options.push({
            title: 'Mine',
            subtitle: '',
            id: 'mine'
        });
    }
    
    if (canFlag) {
        options.push({
            title: 'Flag',
            subtitle: '',
            id: 'flag'
        });
    }
    
    return createMenuContainer({
        title: 'Square Actions',
        options,
        highlightedIndex,
    });
}

