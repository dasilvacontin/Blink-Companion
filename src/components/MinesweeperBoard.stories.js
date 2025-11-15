import { createMinesweeperBoard } from './MinesweeperBoard.js';

export default {
  title: 'Components/Minesweeper/MinesweeperBoard',
  component: createMinesweeperBoard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Helper to create a sample board
function createSampleBoard(rows, cols, mineCount) {
    const board = Array(rows).fill(null).map(() => Array(cols).fill(0));
    const revealed = Array(rows).fill(null).map(() => Array(cols).fill(false));
    const flagged = Array(rows).fill(null).map(() => Array(cols).fill(false));
    
    // Place some mines
    const mines = [];
    for (let i = 0; i < mineCount; i++) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        if (board[row][col] !== -1) {
            board[row][col] = -1;
            mines.push({ row, col });
        }
    }
    
    // Calculate numbers
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col] !== -1) {
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = row + dr;
                        const nc = col + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                            if (board[nr][nc] === -1) count++;
                        }
                    }
                }
                board[row][col] = count;
            }
        }
    }
    
    // Reveal some squares
    revealed[0][0] = true;
    revealed[0][1] = true;
    revealed[1][0] = true;
    
    return { board, revealed, flagged };
}

export const SmallBoard = {
  args: {
    rows: 7,
    cols: 7,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(7, 7, 8);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '500px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const MediumBoard = {
  args: {
    rows: 9,
    cols: 9,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(9, 9, 12);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '800px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const LargeBoard = {
  args: {
    rows: 9,
    cols: 16,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(9, 16, 65);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '1200px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const WithSelectedArea = {
  args: {
    rows: 7,
    cols: 7,
    selectedStartRow: 1,
    selectedEndRow: 5,
    selectedStartCol: 2,
    selectedEndCol: 6,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(7, 7, 8);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '500px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const WithSelectedAndHighlighted = {
  args: {
    rows: 7,
    cols: 7,
    selectedStartRow: 1,
    selectedEndRow: 5,
    selectedStartCol: 2,
    selectedEndCol: 6,
    highlightedStartRow: 3,
    highlightedEndRow: 3,
    highlightedStartCol: 2,
    highlightedEndCol: 6,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(7, 7, 8);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '500px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const WithHighlightedRow = {
  args: {
    rows: 7,
    cols: 7,
    selectedStartRow: 1,
    selectedEndRow: 5,
    selectedStartCol: 0,
    selectedEndCol: 6,
    highlightedStartRow: 3,
    highlightedEndRow: 3,
    highlightedStartCol: 0,
    highlightedEndCol: 6,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(7, 7, 8);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '500px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const WithHighlightedSquare = {
  args: {
    rows: 7,
    cols: 7,
    selectedStartRow: 3,
    selectedEndRow: 3,
    selectedStartCol: 2,
    selectedEndCol: 5,
    highlightedStartRow: 3,
    highlightedEndRow: 3,
    highlightedStartCol: 4,
    highlightedEndCol: 4,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(7, 7, 8);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '500px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const WithSelectedSquareOnly = {
  args: {
    rows: 7,
    cols: 7,
    selectedStartRow: 3,
    selectedEndRow: 3,
    selectedStartCol: 4,
    selectedEndCol: 4,
  },
  render: (args) => {
    const { board, revealed, flagged } = createSampleBoard(7, 7, 8);
    const container = createMinesweeperBoard({
      ...args,
      board,
      revealed,
      flagged
    });
    const wrapper = document.createElement('div');
    wrapper.style.maxWidth = '500px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

