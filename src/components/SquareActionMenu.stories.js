import { createSquareActionMenu } from './SquareActionMenu.js';

export default {
  title: 'Components/Minesweeper/SquareActionMenu',
  component: createSquareActionMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const AllActions = {
  args: {
    highlightedIndex: 0,
    canMine: true,
    canFlag: true,
  },
  render: (args) => {
    const container = createSquareActionMenu(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const CancelHighlighted = {
  args: {
    highlightedIndex: 0,
    canMine: true,
    canFlag: true,
  },
  render: (args) => {
    const container = createSquareActionMenu(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const MineHighlighted = {
  args: {
    highlightedIndex: 1,
    canMine: true,
    canFlag: true,
  },
  render: (args) => {
    const container = createSquareActionMenu(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const FlagHighlighted = {
  args: {
    highlightedIndex: 2,
    canMine: true,
    canFlag: true,
  },
  render: (args) => {
    const container = createSquareActionMenu(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const CannotMine = {
  args: {
    highlightedIndex: 0,
    canMine: false,
    canFlag: true,
  },
  render: (args) => {
    const container = createSquareActionMenu(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const CannotFlag = {
  args: {
    highlightedIndex: 0,
    canMine: true,
    canFlag: false,
  },
  render: (args) => {
    const container = createSquareActionMenu(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

