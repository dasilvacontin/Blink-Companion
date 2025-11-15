import { createExitGameButton } from './ExitGameButton.js';

export default {
  title: 'Components/Minesweeper/ExitGameButton',
  component: createExitGameButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    highlighted: false,
    progress: 0,
  },
  render: (args) => {
    const button = createExitGameButton(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(button);
    return wrapper;
  },
};

export const Highlighted = {
  args: {
    highlighted: true,
    progress: 0,
  },
  render: (args) => {
    const button = createExitGameButton(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(button);
    return wrapper;
  },
};

export const InProgress = {
  args: {
    highlighted: true,
    progress: 0.6,
  },
  render: (args) => {
    const button = createExitGameButton(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(button);
    return wrapper;
  },
};

