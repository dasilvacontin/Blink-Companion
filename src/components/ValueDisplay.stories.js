import { createValueDisplay } from './ValueDisplay.js';

export default {
  title: 'Components/ValueDisplay',
  component: createValueDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The value to display (e.g., "0.5 s")',
    },
  },
};

export const Default = {
  args: {
    value: '0.5 s',
  },
  render: (args) => {
    const display = createValueDisplay(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(display);
    return container;
  },
};

export const LongValue = {
  args: {
    value: '1.2 s',
  },
  render: (args) => {
    const display = createValueDisplay(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(display);
    return container;
  },
};

