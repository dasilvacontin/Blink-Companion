import { createBoardSizeSelector } from './BoardSizeSelector.js';

export default {
  title: 'Components/Minesweeper/BoardSizeSelector',
  component: createBoardSizeSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    highlightedIndex: {
      control: { type: 'number', min: 0, max: 2 },
      description: 'Index of the highlighted option',
    },
  },
};

export const SmallHighlighted = {
  args: {
    highlightedIndex: 0,
  },
  render: (args) => {
    const container = createBoardSizeSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const MediumHighlighted = {
  args: {
    highlightedIndex: 1,
  },
  render: (args) => {
    const container = createBoardSizeSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const LargeHighlighted = {
  args: {
    highlightedIndex: 2,
  },
  render: (args) => {
    const container = createBoardSizeSelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

