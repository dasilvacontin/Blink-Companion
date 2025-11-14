import { createProgressIndicator } from './ProgressIndicator.js';

export default {
  title: 'Components/ProgressIndicator',
  component: createProgressIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    progress: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Progress value from 0 to 1',
    },
  },
};

export const Empty = {
  args: {
    progress: 0,
  },
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'menu-option';
    container.style.width = '600px';
    container.style.height = '100px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.border = '4px solid #E2DEFF';
    container.style.borderRadius = '8px';
    container.style.padding = '20px';
    
    const indicator = createProgressIndicator(args.progress);
    container.appendChild(indicator);
    
    const content = document.createElement('div');
    content.textContent = 'Progress: 0%';
    content.style.position = 'relative';
    content.style.zIndex = '1';
    container.appendChild(content);
    
    return container;
  },
};

export const HalfProgress = {
  args: {
    progress: 0.5,
  },
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'menu-option';
    container.style.width = '600px';
    container.style.height = '100px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.border = '4px solid #E2DEFF';
    container.style.borderRadius = '8px';
    container.style.padding = '20px';
    
    const indicator = createProgressIndicator(args.progress);
    container.appendChild(indicator);
    
    const content = document.createElement('div');
    content.textContent = 'Progress: 50%';
    content.style.position = 'relative';
    content.style.zIndex = '1';
    container.appendChild(content);
    
    return container;
  },
};

export const FullProgress = {
  args: {
    progress: 1.0,
  },
  render: (args) => {
    const container = document.createElement('div');
    container.className = 'menu-option';
    container.style.width = '600px';
    container.style.height = '100px';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.border = '4px solid #E2DEFF';
    container.style.borderRadius = '8px';
    container.style.padding = '20px';
    
    const indicator = createProgressIndicator(args.progress);
    container.appendChild(indicator);
    
    const content = document.createElement('div');
    content.textContent = 'Progress: 100%';
    content.style.position = 'relative';
    content.style.zIndex = '1';
    container.appendChild(content);
    
    return container;
  },
};
