/**
 * SettingsDetail Component
 * The detail page for adjusting a setting value with increase/decrease buttons
 */
import { createMenuOption } from './MenuOption.js';
import { createValueDisplay } from './ValueDisplay.js';

export function createSettingsDetail({ title, currentValue, onDecrease, onIncrease }) {
  const container = document.createElement('div');
  
  // Decrease button
  const decreaseOption = createMenuOption({
    title: '- Decrease -',
    subtitle: '',
    highlighted: false,
    progress: 0,
  });
  decreaseOption.dataset.id = 'decrease';
  container.appendChild(decreaseOption);
  
  // Value display using ValueDisplay component
  const valueEl = createValueDisplay({
    value: `${currentValue.toFixed(1)} s`
  });
  valueEl.dataset.id = 'value';
  container.appendChild(valueEl);
  
  // Increase button
  const increaseOption = createMenuOption({
    title: '+ Increase +',
    subtitle: '',
    highlighted: false,
    progress: 0,
  });
  increaseOption.dataset.id = 'increase';
  container.appendChild(increaseOption);
  
  // Back button
  const backOption = createMenuOption({
    title: 'Back',
    subtitle: 'Return to previous menu',
    highlighted: false,
    progress: 0,
  });
  backOption.dataset.id = 'back';
  container.appendChild(backOption);
  
  return container;
}

