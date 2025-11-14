import { createMenuOption } from './MenuOption.js';

export default {
  title: 'Components/MenuOption',
  component: createMenuOption,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The main title of the menu option',
    },
    subtitle: {
      control: 'text',
      description: 'The subtitle/description of the menu option',
    },
    highlighted: {
      control: 'boolean',
      description: 'Whether this option is currently highlighted',
    },
    progress: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Progress indicator (0-1) showing selection progress',
    },
  },
};

export const Default = {
  args: {
    title: 'Spell',
    subtitle: 'Write text by selecting letters or appending saved text',
    highlighted: false,
    progress: 0,
  },
  render: (args) => {
    const option = createMenuOption(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};

export const Highlighted = {
  args: {
    title: 'Settings',
    subtitle: 'Customize the app to your preferences',
    highlighted: true,
    progress: 0,
  },
  render: (args) => {
    const option = createMenuOption(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};

export const WithProgress = {
  args: {
    title: 'Saved text',
    subtitle: 'Manage saved pieces of text',
    highlighted: true,
    progress: 0.65,
  },
  render: (args) => {
    const option = createMenuOption(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};

export const FullProgress = {
  args: {
    title: 'Lock',
    subtitle: 'Lock the app to rest',
    highlighted: true,
    progress: 1.0,
  },
  render: (args) => {
    const option = createMenuOption(args);
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(option);
    return container;
  },
};
