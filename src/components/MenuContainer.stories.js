import { createMenuContainer } from './MenuContainer.js';

export default {
  title: 'Components/MenuContainer',
  component: createMenuContainer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The menu title',
    },
    highlightedIndex: {
      control: { type: 'number', min: 0, max: 10 },
      description: 'Index of the highlighted option',
    },
  },
};

const mainMenuOptions = [
  { title: 'Spell', subtitle: 'Write text by selecting letters or appending saved text' },
  { title: 'Saved text', subtitle: 'Manage saved pieces of text' },
  { title: 'Settings', subtitle: 'Customize the app to your preferences' },
  { title: 'Lock', subtitle: 'Lock the app to rest' },
];

export const MainMenu = {
  args: {
    title: 'Main Menu',
    options: mainMenuOptions,
    highlightedIndex: 0,
  },
  render: (args) => {
    const container = createMenuContainer(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const MainMenuHighlightedSecond = {
  args: {
    title: 'Main Menu',
    options: mainMenuOptions,
    highlightedIndex: 1,
  },
  render: (args) => {
    const container = createMenuContainer(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const SettingsMenu = {
  args: {
    title: 'Settings',
    options: [
      { title: 'Scroll Speed', subtitle: 'Amount of time the cursor spends on each option', value: '0.5s' },
      { title: 'Blink threshold', subtitle: 'Amount of time a blink must last to be recognised as a blink.', value: '0.3s' },
      { title: '<< Back <<', subtitle: 'Return to previous menu' },
    ],
    highlightedIndex: 0,
    isSettings: true,
  },
  render: (args) => {
    const container = createMenuContainer(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};

export const SettingsMenuHighlightedSecond = {
  args: {
    title: 'Settings',
    options: [
      { title: 'Scroll Speed', subtitle: 'Amount of time the cursor spends on each option', value: '0.5s' },
      { title: 'Blink threshold', subtitle: 'Amount of time a blink must last to be recognised as a blink.', value: '0.3s' },
      { title: '<< Back <<', subtitle: 'Return to previous menu' },
    ],
    highlightedIndex: 1,
    isSettings: true,
  },
  render: (args) => {
    const container = createMenuContainer(args);
    const wrapper = document.createElement('div');
    wrapper.style.width = '600px';
    wrapper.appendChild(container);
    return wrapper;
  },
};
