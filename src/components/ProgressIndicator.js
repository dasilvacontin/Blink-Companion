/**
 * ProgressIndicator Component
 * Visual indicator showing selection progress (fills from left to right)
 */
export function createProgressIndicator(progress = 0) {
  const indicator = document.createElement('div');
  indicator.className = 'progress-fill';
  indicator.style.width = `${progress * 100}%`;
  return indicator;
}

