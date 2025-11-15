import { createGameSquare } from './GameSquare.js';

export default {
  title: 'Components/Minesweeper/GameSquare',
  component: createGameSquare,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'number', min: 0, max: 8 },
      description: 'Number of adjacent mines (0-8)',
    },
    revealed: {
      control: 'boolean',
      description: 'Whether the square is revealed',
    },
    flagged: {
      control: 'boolean',
      description: 'Whether the square is flagged',
    },
    isMine: {
      control: 'boolean',
      description: 'Whether the square contains a mine',
    },
    highlighted: {
      control: 'boolean',
      description: 'Whether the square is highlighted',
    },
  },
};

export const Unrevealed = {
  args: {
    value: 0,
    revealed: false,
    flagged: false,
    isMine: false,
    highlighted: false,
  },
  render: (args) => {
    const square = createGameSquare(args);
    square.style.width = '40px';
    square.style.height = '40px';
    return square;
  },
};

export const RevealedEmpty = {
  args: {
    value: 0,
    revealed: true,
    flagged: false,
    isMine: false,
    highlighted: false,
  },
  render: (args) => {
    const square = createGameSquare(args);
    square.style.width = '40px';
    square.style.height = '40px';
    return square;
  },
};

export const RevealedNumber = {
  args: {
    value: 3,
    revealed: true,
    flagged: false,
    isMine: false,
    highlighted: false,
  },
  render: (args) => {
    const square = createGameSquare(args);
    square.style.width = '40px';
    square.style.height = '40px';
    return square;
  },
};

export const RevealedMine = {
  args: {
    value: 0,
    revealed: true,
    flagged: false,
    isMine: true,
    highlighted: false,
  },
  render: (args) => {
    const square = createGameSquare(args);
    square.style.width = '40px';
    square.style.height = '40px';
    return square;
  },
};

export const Flagged = {
  args: {
    value: 0,
    revealed: false,
    flagged: true,
    isMine: false,
    highlighted: false,
  },
  render: (args) => {
    const square = createGameSquare(args);
    square.style.width = '40px';
    square.style.height = '40px';
    return square;
  },
};

export const Highlighted = {
  args: {
    value: 0,
    revealed: false,
    flagged: false,
    isMine: false,
    highlighted: true,
  },
  render: (args) => {
    const square = createGameSquare(args);
    square.style.width = '40px';
    square.style.height = '40px';
    return square;
  },
};

