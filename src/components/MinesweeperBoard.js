/**
 * MinesweeperBoard Component
 * Main game board display with selected and highlighted areas
 */
import { createGameSquare } from './GameSquare.js';

export function createMinesweeperBoard({ 
    rows = 10, 
    cols = 10, 
    board = null, 
    revealed = null, 
    flagged = null,
    selectedStartRow = null,
    selectedEndRow = null,
    selectedStartCol = null,
    selectedEndCol = null,
    highlightedStartRow = null,
    highlightedEndRow = null,
    highlightedStartCol = null,
    highlightedEndCol = null
} = {}) {
    const container = document.createElement('div');
    container.className = 'minesweeper-board';
    container.style.position = 'relative';
    
    // Create board grid
    const grid = document.createElement('div');
    grid.className = 'minesweeper-grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    // Generate squares
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const value = board ? board[row][col] : 0;
            const isRevealed = revealed ? revealed[row][col] : false;
            const isFlagged = flagged ? flagged[row][col] : false;
            const isMine = value === -1;
            
            // Don't individually highlight squares - only use the highlight rectangle
            const square = createGameSquare({
                value: isMine ? 0 : value,
                revealed: isRevealed,
                flagged: isFlagged,
                isMine: isMine && isRevealed,
                highlighted: false
            });
            
            square.dataset.row = row;
            square.dataset.col = col;
            
            grid.appendChild(square);
        }
    }
    
    // Make grid position relative so rectangles can be positioned relative to it
    grid.style.position = 'relative';
    container.appendChild(grid);
    
    // Add selected area (black border) if specified
    if (selectedStartRow !== null && selectedEndRow !== null &&
        selectedStartCol !== null && selectedEndCol !== null) {
        const selectedArea = document.createElement('div');
        selectedArea.className = 'minesweeper-selected-area';
        
        const squareSize = 40; // Each square is 40px
        const borderWidth = 4;
        
        // Calculate exact positions to align with whole squares
        // Position relative to grid (squares start at 0,0 within grid content area)
        const numCols = selectedEndCol - selectedStartCol + 1;
        const numRows = selectedEndRow - selectedStartRow + 1;
        
        selectedArea.style.position = 'absolute';
        // Position the border 4px outside the squares' edges
        selectedArea.style.left = `${selectedStartCol * squareSize - borderWidth}px`;
        selectedArea.style.top = `${selectedStartRow * squareSize - borderWidth}px`;
        // Width/height includes all squares plus border on both sides
        selectedArea.style.width = `${numCols * squareSize + (borderWidth * 2)}px`;
        selectedArea.style.height = `${numRows * squareSize + (borderWidth * 2)}px`;
        selectedArea.style.border = `${borderWidth}px solid #000000`;
        selectedArea.style.boxSizing = 'border-box';
        selectedArea.style.pointerEvents = 'none';
        selectedArea.style.zIndex = '1';
        
        grid.appendChild(selectedArea);
    }
    
    // Add highlighted area (blue border) if specified
    if (highlightedStartRow !== null && highlightedEndRow !== null &&
        highlightedStartCol !== null && highlightedEndCol !== null) {
        const highlightedArea = document.createElement('div');
        highlightedArea.className = 'minesweeper-highlighted-area';
        
        const squareSize = 40; // Each square is 40px
        const borderWidth = 4;
        
        // Calculate exact positions to align with whole squares
        // Position relative to grid (squares start at 0,0 within grid content area)
        const numCols = highlightedEndCol - highlightedStartCol + 1;
        const numRows = highlightedEndRow - highlightedStartRow + 1;
        
        highlightedArea.style.position = 'absolute';
        // Position the border 4px outside the squares' edges
        highlightedArea.style.left = `${highlightedStartCol * squareSize - borderWidth}px`;
        highlightedArea.style.top = `${highlightedStartRow * squareSize - borderWidth}px`;
        // Width/height includes all squares plus border on both sides
        highlightedArea.style.width = `${numCols * squareSize + (borderWidth * 2)}px`;
        highlightedArea.style.height = `${numRows * squareSize + (borderWidth * 2)}px`;
        highlightedArea.style.border = `${borderWidth}px solid #381DFF`;
        highlightedArea.style.boxSizing = 'border-box';
        highlightedArea.style.pointerEvents = 'none';
        highlightedArea.style.zIndex = '2';
        
        // Add progress fill rectangle
        const progressFill = document.createElement('div');
        progressFill.className = 'minesweeper-highlighted-progress';
        progressFill.style.position = 'absolute';
        progressFill.style.left = '0px';
        progressFill.style.top = '0px';
        progressFill.style.width = '0%';
        progressFill.style.height = `${numRows * squareSize}px`;
        progressFill.style.background = '#E2DEFF';
        progressFill.style.pointerEvents = 'none';
        progressFill.style.zIndex = '1';
        progressFill.style.transition = 'none'; // No transition for instant updates
        progressFill.style.boxSizing = 'border-box';
        
        highlightedArea.appendChild(progressFill);
        grid.appendChild(highlightedArea);
    }
    
    return container;
}

