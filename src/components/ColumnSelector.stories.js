import { createColumnSelector } from './ColumnSelector.js';

export default {
  title: 'Components/Minesweeper/ColumnSelector',
  component: createColumnSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const SmallBoard = {
  args: {
    cols: 10,
    availableCols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    highlightedIndex: 0,
  },
  render: (args) => {
    const container = createColumnSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const MediumBoard = {
  args: {
    cols: 20,
    availableCols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    highlightedIndex: 10,
  },
  render: (args) => {
    const container = createColumnSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const FilteredColumns = {
  args: {
    cols: 10,
    availableCols: [1, 3, 5, 7, 9], // Only odd columns available
    highlightedIndex: 2,
  },
  render: (args) => {
    const container = createColumnSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

