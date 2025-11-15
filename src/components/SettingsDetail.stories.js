import { createSettingsDetail } from './SettingsDetail.js';

export default {
  title: 'Components/SettingsDetail',
  component: createSettingsDetail,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'The setting name',
    },
    currentValue: {
      control: { type: 'number', min: 0.1, max: 5, step: 0.1 },
      description: 'The current setting value in seconds',
    },
  },
};

export const ScrollSpeedDetail = {
  args: {
    title: 'Scroll Speed',
    currentValue: 0.5,
  },
  render: (args) => {
    const detail = createSettingsDetail({
      ...args,
      onDecrease: () => {},
      onIncrease: () => {},
    });
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(detail);
    return container;
  },
};

export const BlinkThresholdDetail = {
  args: {
    title: 'Blink threshold',
    currentValue: 0.3,
  },
  render: (args) => {
    const detail = createSettingsDetail({
      ...args,
      onDecrease: () => {},
      onIncrease: () => {},
    });
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(detail);
    return container;
  },
};

export const HighValue = {
  args: {
    title: 'Scroll Speed',
    currentValue: 2.5,
  },
  render: (args) => {
    const detail = createSettingsDetail({
      ...args,
      onDecrease: () => {},
      onIncrease: () => {},
    });
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(detail);
    return container;
  },
};

export const MinimumValue = {
  args: {
    title: 'Blink threshold',
    currentValue: 0.1,
  },
  render: (args) => {
    const detail = createSettingsDetail({
      ...args,
      onDecrease: () => {},
      onIncrease: () => {},
    });
    const container = document.createElement('div');
    container.style.width = '600px';
    container.appendChild(detail);
    return container;
  },
};

