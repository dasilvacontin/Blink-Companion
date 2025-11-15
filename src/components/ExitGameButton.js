/**
 * ExitGameButton Component
 * Button to exit the Minesweeper game
 */
import { createMenuOption } from './MenuOption.js';

export function createExitGameButton({ highlighted = false, progress = 0 } = {}) {
    return createMenuOption({
        title: 'Exit Game',
        subtitle: 'Return to Games menu',
        highlighted,
        progress
    });
}

