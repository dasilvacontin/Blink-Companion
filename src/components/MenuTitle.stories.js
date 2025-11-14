import { createMenuTitle } from './MenuTitle.js';

export default {
  title: 'Components/MenuTitle',
  component: createMenuTitle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'The title text to display',
    },
  },
};

export const MainMenu = {
  args: {
    text: 'Main Menu',
  },
  render: (args) => createMenuTitle(args.text),
};

export const Settings = {
  args: {
    text: 'Settings',
  },
  render: (args) => createMenuTitle(args.text),
};

export const Spell = {
  args: {
    text: 'Spell',
  },
  render: (args) => createMenuTitle(args.text),
};
