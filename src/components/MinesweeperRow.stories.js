import { createMinesweeperRow } from './MinesweeperRow.js';

export default {
  title: 'Components/Minesweeper/MinesweeperRow',
  component: createMinesweeperRow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

// Helper to create sample board data
function createSampleRowData(cols, revealedIndices = [], flaggedIndices = []) {
    const board = Array(cols).fill(0);
    const revealed = Array(cols).fill(false);
    const flagged = Array(cols).fill(false);
    
    // Set some numbers
    board[0] = 1;
    board[1] = 2;
    board[2] = 0;
    
    // Reveal some squares
    revealedIndices.forEach(idx => {
        revealed[idx] = true;
    });
    
    // Flag some squares
    flaggedIndices.forEach(idx => {
        flagged[idx] = true;
    });
    
    return { board: [board], revealed: [revealed], flagged: [flagged] };
}

export const FullRow = {
  args: {
    row: 0,
    cols: 10,
    startCol: 0,
    endCol: 9,
    ...createSampleRowData(10, [0, 1])
  },
  render: (args) => {
    const row = createMinesweeperRow(args);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.appendChild(row);
    return wrapper;
  },
};

export const PartialRow = {
  args: {
    row: 0,
    cols: 10,
    startCol: 2,
    endCol: 8,
    ...createSampleRowData(10, [2, 3])
  },
  render: (args) => {
    const row = createMinesweeperRow(args);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.appendChild(row);
    return wrapper;
  },
};

export const RowWithSelectedArea = {
  args: {
    row: 0,
    cols: 10,
    startCol: 0,
    endCol: 9,
    selectedStartCol: 1,
    selectedEndCol: 7,
    ...createSampleRowData(10, [0, 1])
  },
  render: (args) => {
    const row = createMinesweeperRow(args);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.position = 'relative';
    wrapper.appendChild(row);
    return wrapper;
  },
};

export const RowWithSelectedAndHighlighted = {
  args: {
    row: 0,
    cols: 10,
    startCol: 0,
    endCol: 9,
    selectedStartCol: 1,
    selectedEndCol: 7,
    highlightedSquareCol: 4,
    ...createSampleRowData(10, [0, 1])
  },
  render: (args) => {
    const row = createMinesweeperRow(args);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.position = 'relative';
    wrapper.appendChild(row);
    return wrapper;
  },
};

export const PartialRowWithSelectedArea = {
  args: {
    row: 0,
    cols: 10,
    startCol: 2,
    endCol: 8,
    selectedStartCol: 3,
    selectedEndCol: 6,
    ...createSampleRowData(10, [2, 3])
  },
  render: (args) => {
    const row = createMinesweeperRow(args);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.position = 'relative';
    wrapper.appendChild(row);
    return wrapper;
  },
};

export const RowWithHighlightedOnly = {
  args: {
    row: 0,
    cols: 10,
    startCol: 0,
    endCol: 9,
    highlightedSquareCol: 4,
    ...createSampleRowData(10, [0, 1])
  },
  render: (args) => {
    const row = createMinesweeperRow(args);
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.position = 'relative';
    wrapper.appendChild(row);
    return wrapper;
  },
};

