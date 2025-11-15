/**
 * MinesweeperRow Component
 * Displays a row of game squares with optional highlighting
 */
import { createGameSquare } from './GameSquare.js';

export function createMinesweeperRow({
    row = 0,
    cols = 10,
    startCol = 0,
    endCol = null,
    board = null,
    revealed = null,
    flagged = null,
    selectedStartCol = null,
    selectedEndCol = null,
    highlightedSquareCol = null
} = {}) {
    const container = document.createElement('div');
    container.className = 'minesweeper-row';
    container.dataset.row = row;
    
    // Default endCol to last column if not specified
    if (endCol === null) {
        endCol = cols - 1;
    }
    
    // Create row of squares
    for (let col = startCol; col <= endCol; col++) {
        const value = board ? board[row][col] : 0;
        const isRevealed = revealed ? revealed[row][col] : false;
        const isFlagged = flagged ? flagged[row][col] : false;
        const isMine = value === -1;
        const highlighted = highlightedSquareCol === col;
        
        const square = createGameSquare({
            value: isMine ? 0 : value,
            revealed: isRevealed,
            flagged: isFlagged,
            isMine: isMine && isRevealed,
            highlighted
        });
        
        square.dataset.row = row;
        square.dataset.col = col;
        
        container.appendChild(square);
    }
    
    // Add selected area (black border) if specified
    if (selectedStartCol !== null && selectedEndCol !== null) {
        const selectedArea = document.createElement('div');
        selectedArea.className = 'minesweeper-row-selected';
        
        // Calculate position and width based on square size (40px)
        // selectedStartCol and selectedEndCol are absolute column indices
        // We need to find their positions relative to startCol
        const firstColIndex = selectedStartCol - startCol;
        const lastColIndex = selectedEndCol - startCol;
        
        if (firstColIndex >= 0 && lastColIndex < container.children.length) {
            const squareSize = 40; // Each square is 40px
            const borderWidth = 4;
            
            selectedArea.style.position = 'absolute';
            selectedArea.style.left = `${firstColIndex * squareSize - borderWidth}px`;
            selectedArea.style.top = `${-borderWidth}px`;
            selectedArea.style.width = `${(lastColIndex - firstColIndex + 1) * squareSize + (borderWidth * 2)}px`;
            selectedArea.style.height = `${squareSize + (borderWidth * 2)}px`;
            selectedArea.style.border = `${borderWidth}px solid #000000`;
            selectedArea.style.boxSizing = 'border-box';
            selectedArea.style.pointerEvents = 'none';
            selectedArea.style.zIndex = '1';
        }
        
        container.appendChild(selectedArea);
    }
    
    return container;
}

