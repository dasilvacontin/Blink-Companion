import { createRowSelector } from './RowSelector.js';

export default {
  title: 'Components/Minesweeper/RowSelector',
  component: createRowSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const SmallBoard = {
  args: {
    rows: 10,
    availableRows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    highlightedIndex: 0,
  },
  render: (args) => {
    const container = createRowSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const MediumBoard = {
  args: {
    rows: 20,
    availableRows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    highlightedIndex: 5,
  },
  render: (args) => {
    const container = createRowSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const FilteredRows = {
  args: {
    rows: 10,
    availableRows: [0, 2, 4, 6, 8], // Only even rows available
    highlightedIndex: 1,
  },
  render: (args) => {
    const container = createRowSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

