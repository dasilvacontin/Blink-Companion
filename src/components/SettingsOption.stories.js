import { createSettingsOption } from './SettingsOption.js';

export default {
  title: 'Components/SettingsOption',
  component: createSettingsOption,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The setting name',
    },
    subtitle: {
      control: 'text',
      description: 'The setting description',
    },
    value: {
      control: 'text',
      description: 'The current setting value (e.g., "0.5s")',
    },
  },
};

export const ScrollSpeed = {
  args: {
    title: 'Scroll Speed',
    subtitle: 'Amount of time the cursor spends on each option',
    value: '0.5s',
  },
  render: (args) => {
    const option = createSettingsOption(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};

export const BlinkThreshold = {
  args: {
    title: 'Blink threshold',
    subtitle: 'Amount of time a blink must last to be recognised as a blink.',
    value: '0.3s',
  },
  render: (args) => {
    const option = createSettingsOption(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};

export const Highlighted = {
  args: {
    title: 'Scroll Speed',
    subtitle: 'Amount of time the cursor spends on each option',
    value: '1.2s',
  },
  render: (args) => {
    const option = createSettingsOption(args);
    option.classList.add('highlighted');
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};

