import { createDifficultySelector } from './DifficultySelector.js';

export default {
  title: 'Components/Minesweeper/DifficultySelector',
  component: createDifficultySelector,
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

export const EasyHighlighted = {
  args: {
    highlightedIndex: 0,
  },
  render: (args) => {
    const container = createDifficultySelector(args);
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
    const container = createDifficultySelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const HardHighlighted = {
  args: {
    highlightedIndex: 2,
  },
  render: (args) => {
    const container = createDifficultySelector(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

