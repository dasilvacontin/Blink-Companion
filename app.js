// Import components
import { createMenuContainer } from './src/components/MenuContainer.js';
import { createSettingsDetail } from './src/components/SettingsDetail.js';
import { createMenuTitle } from './src/components/MenuTitle.js';
import { createLockScreen } from './src/components/LockScreen.js';
import { MinesweeperEngine } from './src/game/MinesweeperEngine.js';
import { createMinesweeperBoard } from './src/components/MinesweeperBoard.js';
import { createMenuOption } from './src/components/MenuOption.js';

// Eye landmark indices for MediaPipe Face Mesh
const LEFT_EYE_POINTS = {
    horizontal: [33, 133],
    vertical1: [159, 145],
    vertical2: [158, 153]
};
const RIGHT_EYE_POINTS = {
    horizontal: [362, 263],
    vertical1: [386, 374],
    vertical2: [385, 380]
};

// Configuration
const EAR_THRESHOLD = 0.25;
const DEFAULT_SCROLL_SPEED = 0.6; // seconds
const DEFAULT_BLINK_THRESHOLD = 0.7; // seconds

class MenuApp {
    constructor() {
        this.currentMenu = 'main';
        this.menuStack = [];
        this.options = [];
        this.currentIndex = 0;
        this.scrollSpeed = DEFAULT_SCROLL_SPEED;
        this.blinkThreshold = DEFAULT_BLINK_THRESHOLD;
        
        // Minesweeper setup state
        this.selectedDifficulty = null;
        this.selectedBoardSize = null;
        this.minesweeperGame = null;
        this.minesweeperMode = false; // Whether we're in game mode
        this.gameMode = 'row-selection'; // 'row-selection', 'column-selection', 'game-over'
        this.selectedRow = null;
        this.selectedCol = null;
        this.actionColumn = null; // Column being acted on during column selection
        this.rowSelectionTimeout = null;
        this.actionMenuHoldTime = 0.5; // 0.5 seconds for action menu
        this.exitGameHoldTime = 2.0; // 2 seconds for exit game
        // 5x5 play area (null means full board)
        this.playAreaStartRow = null;
        this.playAreaEndRow = null;
        this.playAreaStartCol = null;
        this.playAreaEndCol = null;
        this.lastActionRow = null; // Row of last action (mine or flag)
        this.lastActionCol = null; // Col of last action (mine or flag)
        this.boardActions = null; // Board actions (Zoom Out, Exit Game)
        
        // Selection state
        this.isSelecting = false;
        this.selectionProgress = 0;
        this.selectionStartTime = 0;
        this.selectionAnimationFrame = null;
        
        // Blink detection state
        this.isWinking = false;
        this.winkingEye = null;
        this.earLeft = 0;
        this.earRight = 0;
        this.leftEyeClosed = false;
        this.rightEyeClosed = false;
        this.eyesWereOpen = true; // Track if eyes were open before starting selection
        this.eyeClosedStartTime = null; // When eyes first detected as closed (for debounce)
        this.BLINK_DEBOUNCE_TIME = 100; // Milliseconds eyes must be closed before registering as blink start
        
        // SOS Pattern state (for lock screen)
        this.sosPattern = [0.2, 0.2, 0.2, 1.0, 1.0, 1.0, 0.2, 0.2, 0.2]; // short, short, short, long, long, long, short, short, short
        this.sosStep = 0; // Current step in pattern (0-8)
        this.sosBlinkStartTime = null; // When current blink started
        this.sosBlinkDuration = 0; // Duration of current blink
        this.isLocked = false; // Whether app is locked
        this.lockScreenAnimationFrame = null; // Animation frame for lock screen progress
        this.sosFullFillTime = null; // When the square reached 100% fill
        this.sosInactivityTimeout = null; // Timeout for resetting pattern after 5 seconds without success
        this.sosRequireEyesOpen = false; // Require eyes to be open before starting new blink after reset
        
        // MediaPipe
        this.faceMesh = null;
        this.camera = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        
        // Load settings
        this.loadSettings();
        
        // Initialize
        this.initializeMenus();
        this.renderMenu();
        this.startAutoScroll();
        this.waitForMediaPipe();
    }
    
    loadSettings() {
        const savedScrollSpeed = localStorage.getItem('scrollSpeed');
        const savedBlinkThreshold = localStorage.getItem('blinkThreshold');
        
        if (savedScrollSpeed) {
            this.scrollSpeed = parseFloat(savedScrollSpeed);
        }
        if (savedBlinkThreshold) {
            this.blinkThreshold = parseFloat(savedBlinkThreshold);
        }
    }
    
    saveSettings() {
        localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
        localStorage.setItem('blinkThreshold', this.blinkThreshold.toString());
    }
    
    initializeMenus() {
        this.menus = {
            main: [
                { id: 'write', title: 'Write', subtitle: 'Write text with predictive assistance' },
                { id: 'saved-text', title: 'Saved text', subtitle: 'View and manage saved text' },
                { id: 'games', title: 'Games', subtitle: 'Have fun!' },
                { id: 'settings', title: 'Settings', subtitle: 'Customize the app to your preferences' },
                { id: 'lock', title: 'Rest', subtitle: 'Lock the app to rest' }
            ],
            write: [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'saved-text': [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'games': [
                { id: 'minesweeper', title: 'Minesweeper', subtitle: 'Classic minesweeper game' },
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'minesweeper': [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'minesweeper-difficulty': [
                { id: 'easy', title: 'Easy', subtitle: 'Fewer mines, larger safe areas' },
                { id: 'medium', title: 'Medium', subtitle: 'Standard mine density' },
                { id: 'hard', title: 'Hard', subtitle: 'More mines, tighter spacing' },
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'minesweeper-board-size': [
                { id: 'small', title: 'Small', subtitle: '7x7 board' },
                { id: 'medium', title: 'Medium', subtitle: '9x9 board' },
                { id: 'large', title: 'Large', subtitle: '9x16 board' },
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            settings: [
                { id: 'scroll-speed', title: 'Scroll Speed', subtitle: 'Amount of time the cursor spends on each option', value: '' },
                { id: 'blink-threshold', title: 'Blink threshold', subtitle: 'Amount of time a blink must last to be recognised as a blink.', value: '' },
                { id: 'back', title: '<< Back <<', subtitle: 'Return to previous menu' }
            ],
            'scroll-speed': [
                { id: 'decrease', title: '- Decrease -', subtitle: '' },
                { id: 'value', title: '', subtitle: '' }, // Will be populated dynamically
                { id: 'increase', title: '+ Increase +', subtitle: '' },
                { id: 'back', title: '<< Back <<', subtitle: 'Return to previous menu' }
            ],
            'blink-threshold': [
                { id: 'decrease', title: '- Decrease -', subtitle: '' },
                { id: 'value', title: '', subtitle: '' }, // Will be populated dynamically
                { id: 'increase', title: '+ Increase +', subtitle: '' },
                { id: 'back', title: '<< Back <<', subtitle: 'Return to previous menu' }
            ],
            lock: [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ]
        };
    }
    
    renderMenu() {
        // If in Minesweeper game mode, render game instead
        if (this.minesweeperMode && this.currentMenu === 'minesweeper-game') {
            this.renderMinesweeperGame();
            return;
        }
        
        const menuContainer = document.getElementById('menu-container');
        const menuTitleEl = document.getElementById('menu-title');
        const menuOptions = document.getElementById('menu-options');
        
        // Get options for current menu
        this.options = this.menus[this.currentMenu] || [];
        this.currentIndex = 0;
        
        // Determine title text
        let titleText = '';
        if (this.currentMenu === 'scroll-speed') {
            titleText = 'Settings / Scroll Speed';
        } else if (this.currentMenu === 'blink-threshold') {
            titleText = 'Settings / Blink threshold';
        } else if (this.currentMenu === 'minesweeper-difficulty') {
            titleText = 'Select Difficulty';
        } else if (this.currentMenu === 'minesweeper-board-size') {
            titleText = 'Select Board Size';
        } else {
            const titleMap = {
                'main': 'Main Menu',
                'write': 'Write',
                'saved-text': 'Saved text',
                'games': 'Games',
                'minesweeper': 'Minesweeper',
                'settings': 'Settings',
                'lock': 'Rest'
            };
            titleText = titleMap[this.currentMenu] || 'Menu';
        }
        
        // Special handling for lock screen - use LockScreen component
        if (this.currentMenu === 'lock' || this.isLocked) {
            // Check if lock screen already exists
            const existingLockScreen = document.querySelector('.lock-screen');
            if (!existingLockScreen) {
                // Clear menu container and show lock screen
                const app = document.getElementById('app');
                const menuContainerEl = document.getElementById('menu-container');
                if (menuContainerEl) {
                    menuContainerEl.innerHTML = '';
                    const lockScreen = createLockScreen({ patternProgress: [] });
                    lockScreen.id = 'menu-container';
                    menuContainerEl.replaceWith(lockScreen);
                }
            }
            
            // Reset SOS pattern state if just entering lock screen
            if (this.sosStep === 0 && this.sosBlinkStartTime === null && this.sosFullFillTime === null) {
                this.resetSOSPattern(false); // Don't require eyes open when first entering
            }
            
            // Stop auto-scroll when on lock screen
            if (this.scrollInterval) {
                clearInterval(this.scrollInterval);
                this.scrollInterval = null;
            }
            
            // Start animation loop for lock screen progress
            this.startLockScreenAnimation();
            
            return;
        }
        
        // Special handling for settings detail pages - use SettingsDetail component
        if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold') {
            const currentValue = this.currentMenu === 'scroll-speed' ? this.scrollSpeed : this.blinkThreshold;
            
            // Update title using MenuTitle component
            if (menuTitleEl) {
                const newTitle = createMenuTitle(titleText);
                menuTitleEl.replaceWith(newTitle);
                newTitle.id = 'menu-title';
            }
            
            // Clear and render using SettingsDetail component
            menuOptions.innerHTML = '';
            const settingsDetail = createSettingsDetail({
                title: titleText,
                currentValue: currentValue,
                onDecrease: () => {},
                onIncrease: () => {}
            });
            
            // Append all options from SettingsDetail
            Array.from(settingsDetail.children).forEach((optionEl, index) => {
                optionEl.dataset.index = index;
                menuOptions.appendChild(optionEl);
            });
            
            // Map the options for selection logic
            this.options = [
                { id: 'decrease', title: '- Decrease -', subtitle: '' },
                { id: 'value', title: `${currentValue.toFixed(1)} s`, subtitle: '' },
                { id: 'increase', title: '+ Increase +', subtitle: '' },
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ];
        } else {
            // Use MenuContainer component for regular menus
            // Update settings menu values dynamically before rendering
            if (this.currentMenu === 'settings') {
                this.updateSettingsMenu();
            }
            
            // Prepare options for MenuContainer
            const containerOptions = this.options.map(option => ({
                title: option.title,
                subtitle: option.subtitle,
                value: option.value,
                id: option.id
            }));
            
            // Create menu using MenuContainer component
            const menuContainerComponent = createMenuContainer({
                title: titleText,
                options: containerOptions,
                highlightedIndex: 0,
                isSettings: this.currentMenu === 'settings'
            });
            
            // Replace the existing menu structure
            const newTitle = menuContainerComponent.querySelector('.menu-title');
            const newOptions = menuContainerComponent.querySelector('.menu-options');
            
            if (menuTitleEl && newTitle) {
                menuTitleEl.replaceWith(newTitle);
                newTitle.id = 'menu-title';
            }
            
            if (menuOptions && newOptions) {
                menuOptions.replaceWith(newOptions);
                newOptions.id = 'menu-options';
                newOptions.className = 'menu-options';
            }
            
            // Add dataset.index to each option for selection logic
            const optionEls = newOptions.querySelectorAll('.menu-option');
            optionEls.forEach((el, index) => {
                el.dataset.index = index;
            });
            
            // Update settings menu values after rendering if needed
            if (this.currentMenu === 'settings') {
                // Update value displays in the rendered options
                optionEls.forEach((el, index) => {
                    const option = this.options[index];
                    if (option && option.value) {
                        const valueEl = el.querySelector('.menu-option-value');
                        if (valueEl) {
                            valueEl.textContent = option.value;
                        }
                    }
                });
            }
        }
        
        this.updateHighlight();
    }
    
    
    updateHighlight() {
        const optionEls = document.querySelectorAll('.menu-option');
        optionEls.forEach((el, index) => {
            // Skip highlighting value display
            const titleEl = el.querySelector('.menu-option-title');
            const isValueDisplay = titleEl && titleEl.textContent.includes(' s') && !titleEl.textContent.includes('-') && !titleEl.textContent.includes('+');
            
            if (index === this.currentIndex && !isValueDisplay) {
                el.classList.add('highlighted');
            } else {
                el.classList.remove('highlighted');
            }
        });
    }
    
    startAutoScroll() {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
        }
        
        this.scrollInterval = setInterval(() => {
            if (!this.isSelecting) {
                // Skip value display option in settings detail pages
                let nextIndex = (this.currentIndex + 1) % this.options.length;
                if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold') {
                    // Skip value option (index 1)
                    if (nextIndex === 1) {
                        nextIndex = (nextIndex + 1) % this.options.length;
                    }
                }
                this.currentIndex = nextIndex;
                this.updateHighlight();
            }
        }, this.scrollSpeed * 1000);
    }
    
    selectOption() {
        if (this.options.length === 0) return;
        
        // Handle Minesweeper game selections
        if (this.minesweeperMode) {
            this.handleGameSelection();
            return;
        }
        
        const option = this.options[this.currentIndex];
        
        if (option.id === 'back') {
            this.navigateBack();
        } else if (option.id === 'decrease') {
            this.decreaseSetting();
        } else if (option.id === 'increase') {
            this.increaseSetting();
        } else if (option.id === 'value') {
            // Value display is not selectable, skip to next
            return;
        } else if (option.id === 'lock') {
            // Lock the app
            this.isLocked = true;
            this.currentMenu = 'lock';
            this.renderMenu();
        } else if (option.id === 'minesweeper') {
            // Start Minesweeper setup flow
            this.navigateTo('minesweeper-difficulty');
        } else if (option.id === 'easy' || option.id === 'medium' || option.id === 'hard') {
            // Store selected difficulty and proceed to board size selection
            this.selectedDifficulty = option.id;
            this.navigateTo('minesweeper-board-size');
        } else if (option.id === 'small' || option.id === 'medium' || option.id === 'large') {
            // Store selected board size and start game
            this.selectedBoardSize = option.id;
            this.startMinesweeperGame();
        } else {
            this.navigateTo(option.id);
        }
    }
    
    handleGameSelection() {
        const boardState = this.minesweeperGame.getBoardState();
        
        if (this.gameMode === 'row-selection') {
            // Check if we're selecting a row or a board action
            const availableRows = this.getAvailableRows(boardState);
            const boardActionsCount = this.boardActions ? this.boardActions.length : 0;
            
            if (this.currentIndex < availableRows.length) {
                // Select the currently highlighted row
                this.selectedRow = availableRows[this.currentIndex];
                this.selectedCol = null;
                this.gameMode = 'column-selection';
                this.currentIndex = 0;
                this.renderMinesweeperGame();
                // Start timeout for row selection reset
                this.startRowSelectionTimeout();
            } else {
                // Select a board action (Zoom Out or Exit Game)
                const actionIndex = this.currentIndex - availableRows.length;
                if (this.boardActions && actionIndex < this.boardActions.length) {
                    const action = this.boardActions[actionIndex];
                    if (action.id === 'zoom-out') {
                        // Zoom out - remove 5x5 play area
                        this.playAreaStartRow = null;
                        this.playAreaEndRow = null;
                        this.playAreaStartCol = null;
                        this.playAreaEndCol = null;
                        this.currentIndex = 0;
                        this.renderMinesweeperGame();
                    } else if (action.id === 'exit-game') {
                        // Exit game
                        this.exitMinesweeperGame();
                    }
                }
            }
        } else if (this.gameMode === 'column-selection') {
            // Column selection is now handled directly by blinking on highlighted columns
            // No need to "select" a column first - actions happen on highlighted columns
        } else if (this.gameMode === 'game-over') {
            // Handle game over menu selection
            if (this.options.length === 0) return;
            const option = this.options[this.currentIndex];
            if (option.id === 'play-again') {
                // Restart the game with same settings
                this.startMinesweeperGame();
            } else if (option.id === 'exit-game') {
                this.exitMinesweeperGame();
            }
        }
    }
    
    handleMineAction() {
        // Check if square is flagged - if so, unflag it first (since we toggled flag on blink start)
        const squareState = this.minesweeperGame.getSquareState(this.selectedRow, this.selectedCol);
        if (squareState.flagged) {
            // Unflag it first so we can mine it
            this.minesweeperGame.toggleFlag(this.selectedRow, this.selectedCol);
        }
        
        const result = this.minesweeperGame.mineSquare(this.selectedRow, this.selectedCol);
        
        if (result.gameOver) {
            if (result.won) {
                // Handle win - show win menu
                this.gameMode = 'game-over';
                this.currentIndex = 0;
                this.renderMinesweeperGame();
            } else {
                // Handle loss - reveal the mine and show game over menu
                // The mine should already be revealed by the engine
                this.gameMode = 'game-over';
                this.currentIndex = 0;
                this.renderMinesweeperGame();
            }
        } else {
            // Update play area to 5x5 centered on this square
            this.updatePlayAreaAfterAction(this.selectedRow, this.selectedCol);
            
            // Re-render board and return to row selection
            this.resetRowSelection();
        }
    }
    
    handleFlagAction() {
        this.minesweeperGame.toggleFlag(this.selectedRow, this.selectedCol);
        
        // Update play area to 7x7 centered on this square
        this.updatePlayAreaAfterAction(this.selectedRow, this.selectedCol);
        
        // Re-render board and return to row selection
        this.resetRowSelection();
    }
    
    exitMinesweeperGame() {
        this.minesweeperMode = false;
        this.minesweeperGame = null;
        this.gameMode = 'row-selection';
        this.selectedRow = null;
        this.selectedCol = null;
        this.selectedDifficulty = null;
        this.selectedBoardSize = null;
        this.playAreaStartRow = null;
        this.playAreaEndRow = null;
        this.playAreaStartCol = null;
        this.playAreaEndCol = null;
        this.lastActionRow = null;
        this.lastActionCol = null;
        if (this.rowSelectionTimeout) {
            clearTimeout(this.rowSelectionTimeout);
            this.rowSelectionTimeout = null;
        }
        this.navigateTo('games');
    }
    
    decreaseSetting() {
        if (this.currentMenu === 'scroll-speed') {
            this.scrollSpeed = Math.max(0.1, this.scrollSpeed - 0.1);
            this.saveSettings();
            this.startAutoScroll(); // Restart with new speed
            this.updateValueDisplay();
        } else if (this.currentMenu === 'blink-threshold') {
            this.blinkThreshold = Math.max(0.1, this.blinkThreshold - 0.1);
            this.saveSettings();
            this.updateValueDisplay();
        }
        // Update settings menu values if we're going back to settings
        this.updateSettingsMenu();
    }
    
    increaseSetting() {
        if (this.currentMenu === 'scroll-speed') {
            this.scrollSpeed += 0.1;
            this.saveSettings();
            this.startAutoScroll(); // Restart with new speed
            this.updateValueDisplay();
        } else if (this.currentMenu === 'blink-threshold') {
            this.blinkThreshold += 0.1;
            this.saveSettings();
            this.updateValueDisplay();
        }
        // Update settings menu values if we're going back to settings
        this.updateSettingsMenu();
    }
    
    updateValueDisplay() {
        // Update value display for settings detail pages without re-rendering entire menu
        if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold') {
            const currentValue = this.currentMenu === 'scroll-speed' ? this.scrollSpeed : this.blinkThreshold;
            const menuOptions = document.getElementById('menu-options');
            if (menuOptions) {
                const valueEl = Array.from(menuOptions.children).find(el => {
                    return el.dataset.id === 'value';
                });
                if (valueEl) {
                    const titleEl = valueEl.querySelector('.menu-option-title');
                    if (titleEl) {
                        titleEl.textContent = `${currentValue.toFixed(1)} s`;
                    }
                    // Update options array for selection logic
                    const valueOption = this.options.find(opt => opt.id === 'value');
                    if (valueOption) {
                        valueOption.title = `${currentValue.toFixed(1)} s`;
                    }
                }
            }
        }
    }
    
    navigateTo(menuId) {
        this.menuStack.push(this.currentMenu);
        this.currentMenu = menuId;
        this.renderMenu();
        this.resetBlinkState();
    }
    
    updateSettingsMenu() {
        if (this.menus.settings) {
            this.menus.settings[0].value = `${this.scrollSpeed.toFixed(1)}s`;
            this.menus.settings[1].value = `${this.blinkThreshold.toFixed(1)}s`;
        }
    }
    
    navigateBack() {
        if (this.minesweeperMode) {
            // Exit game mode
            this.minesweeperMode = false;
            this.minesweeperGame = null;
            this.selectedDifficulty = null;
            this.selectedBoardSize = null;
            this.navigateTo('games');
            return;
        }
        
        if (this.menuStack.length > 0) {
            this.currentMenu = this.menuStack.pop();
            this.renderMenu();
        }
        this.resetBlinkState();
    }
    
    startMinesweeperGame() {
        // Initialize game engine
        this.minesweeperGame = new MinesweeperEngine(
            this.selectedDifficulty,
            this.selectedBoardSize
        );
        
        // Enter game mode
        this.minesweeperMode = true;
        this.gameMode = 'row-selection';
        this.selectedRow = null;
        this.selectedCol = null;
        this.currentMenu = 'minesweeper-game';
        this.currentIndex = 0;
        
        // Initialize play area to full board (no 5x5 constraint yet)
        this.playAreaStartRow = null;
        this.playAreaEndRow = null;
        this.playAreaStartCol = null;
        this.playAreaEndCol = null;
        this.lastActionRow = null;
        this.lastActionCol = null;
        
        // Clear menu stack for game
        this.menuStack = [];
        
        // Render game board
        this.renderMinesweeperGame();
    }
    
    // Calculate 5x5 play area centered on a square, keeping within board bounds
    calculatePlayArea(centerRow, centerCol, boardRows, boardCols) {
        const size = 5;
        const halfSize = Math.floor(size / 2); // 2
        
        let startRow = centerRow - halfSize;
        let endRow = centerRow + halfSize;
        let startCol = centerCol - halfSize;
        let endCol = centerCol + halfSize;
        
        // Clamp to board bounds
        if (startRow < 0) {
            endRow += Math.abs(startRow);
            startRow = 0;
        }
        if (endRow >= boardRows) {
            startRow -= (endRow - boardRows + 1);
            endRow = boardRows - 1;
        }
        if (startCol < 0) {
            endCol += Math.abs(startCol);
            startCol = 0;
        }
        if (endCol >= boardCols) {
            startCol -= (endCol - boardCols + 1);
            endCol = boardCols - 1;
        }
        
        // Ensure we don't go out of bounds after adjustments
        startRow = Math.max(0, startRow);
        endRow = Math.min(boardRows - 1, endRow);
        startCol = Math.max(0, startCol);
        endCol = Math.min(boardCols - 1, endCol);
        
        return { startRow, endRow, startCol, endCol };
    }
    
    // Update play area after an action
    updatePlayAreaAfterAction(row, col) {
        const boardState = this.minesweeperGame.getBoardState();
        const playArea = this.calculatePlayArea(row, col, boardState.rows, boardState.cols);
        this.playAreaStartRow = playArea.startRow;
        this.playAreaEndRow = playArea.endRow;
        this.playAreaStartCol = playArea.startCol;
        this.playAreaEndCol = playArea.endCol;
        this.lastActionRow = row;
        this.lastActionCol = col;
    }
    
    renderMinesweeperGame() {
        const menuContainer = document.getElementById('menu-container');
        if (!this.minesweeperGame) return;
        
        // Clear existing content
        if (menuContainer) {
            menuContainer.innerHTML = '';
        }
        
        const boardState = this.minesweeperGame.getBoardState();
        
        // Create container structure
        const container = document.createElement('div');
        container.id = 'menu-container';
        
        // Calculate selected and highlighted areas based on game mode
        let selectedStartRow = null, selectedEndRow = null;
        let selectedStartCol = null, selectedEndCol = null;
        let highlightedStartRow = null, highlightedEndRow = null;
        let highlightedStartCol = null, highlightedEndCol = null;
        
        // Determine the selection area (play area or full board)
        const selectionAreaStartRow = this.playAreaStartRow !== null ? this.playAreaStartRow : 0;
        const selectionAreaEndRow = this.playAreaEndRow !== null ? this.playAreaEndRow : boardState.rows - 1;
        const selectionAreaStartCol = this.playAreaStartCol !== null ? this.playAreaStartCol : 0;
        const selectionAreaEndCol = this.playAreaEndCol !== null ? this.playAreaEndCol : boardState.cols - 1;
        
        if (this.gameMode === 'row-selection') {
            // Selected area: the play area (or full board if no play area)
            selectedStartRow = selectionAreaStartRow;
            selectedEndRow = selectionAreaEndRow;
            selectedStartCol = selectionAreaStartCol;
            selectedEndCol = selectionAreaEndCol;
            
            // Get available rows and board actions
            const availableRows = this.getAvailableRows(boardState);
            const boardActionsCount = this.boardActions ? this.boardActions.length : 0;
            const totalOptions = availableRows.length + boardActionsCount;
            
            // Ensure currentIndex is within bounds
            if (this.currentIndex >= totalOptions) {
                this.currentIndex = 0;
            }
            
            // Check if we're highlighting a row or a board action
            if (this.currentIndex < availableRows.length) {
                // Highlighting a row - clear board action highlights
                const actionEls = document.querySelectorAll('#board-actions .menu-option');
                actionEls.forEach((el) => {
                    el.classList.remove('highlighted');
                });
                
                const highlightedRowIndex = availableRows[this.currentIndex];
                highlightedStartRow = highlightedRowIndex;
                highlightedEndRow = highlightedRowIndex;
                highlightedStartCol = selectionAreaStartCol;
                highlightedEndCol = selectionAreaEndCol;
            } else {
                // Highlighting a board action (Zoom Out or Exit Game)
                // Clear row highlight
                highlightedStartRow = null;
                highlightedEndRow = null;
                highlightedStartCol = null;
                highlightedEndCol = null;
                
                // Update highlight on board actions
                const actionIndex = this.currentIndex - availableRows.length;
                const actionEls = document.querySelectorAll('#board-actions .menu-option');
                actionEls.forEach((el, idx) => {
                    if (idx === actionIndex) {
                        el.classList.add('highlighted');
                    } else {
                        el.classList.remove('highlighted');
                    }
                });
            }
        } else if (this.gameMode === 'column-selection') {
            // Selected area: the part of selected row within the play area
            if (this.selectedRow !== null) {
                const selectionAreaStartCol = this.playAreaStartCol !== null ? this.playAreaStartCol : 0;
                const selectionAreaEndCol = this.playAreaEndCol !== null ? this.playAreaEndCol : boardState.cols - 1;
                
                selectedStartRow = this.selectedRow;
                selectedEndRow = this.selectedRow;
                selectedStartCol = selectionAreaStartCol;
                selectedEndCol = selectionAreaEndCol;
                
                // Highlighted area: currently highlighted column within selection area
                const availableCols = this.getAvailableColumns(boardState, this.selectedRow);
                if (this.currentIndex < availableCols.length) {
                    const highlightedColIndex = availableCols[this.currentIndex];
                    highlightedStartRow = this.selectedRow;
                    highlightedEndRow = this.selectedRow;
                    highlightedStartCol = highlightedColIndex;
                    highlightedEndCol = highlightedColIndex;
                }
            }
        } else if (this.gameMode === 'game-over') {
            // No selected or highlighted areas in game-over mode
            // Just show the board with revealed mines
        }
        
        // Create game board (always visible)
        const board = createMinesweeperBoard({
            rows: boardState.rows,
            cols: boardState.cols,
            board: boardState.board,
            revealed: boardState.revealed,
            flagged: boardState.flagged,
            selectedStartRow,
            selectedEndRow,
            selectedStartCol,
            selectedEndCol,
            highlightedStartRow,
            highlightedEndRow,
            highlightedStartCol,
            highlightedEndCol
        });
        container.appendChild(board);
        
        // Add game over menu or board actions below the board
        if (this.gameMode === 'game-over') {
            this.renderGameOverMenu(container, boardState);
        } else {
            // Add Zoom Out and Exit Game options below the board
            this.renderBoardActions(container, boardState);
        }
        
        // Replace existing menu container
        if (menuContainer) {
            menuContainer.replaceWith(container);
        } else {
            const app = document.getElementById('app');
            if (app) {
                app.appendChild(container);
            }
        }
        
        // Start auto-scroll for board-based selection
        this.startGameAutoScroll();
    }
    
    
    renderBoardActions(container, boardState) {
        // Create actions container below board
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'minesweeper-board-actions';
        actionsContainer.id = 'board-actions';
        
        // Zoom Out is only available when 5x5 play area is active
        const canZoomOut = this.playAreaStartRow !== null;
        
        // Create action options
        const actionOptions = [];
        if (canZoomOut) {
            actionOptions.push({
                id: 'zoom-out',
                title: 'Zoom Out',
                isZoomOut: true
            });
        }
        actionOptions.push({
            id: 'exit-game',
            title: 'Exit Game',
            isExitGame: true
        });
        
        // Store board actions for selection logic
        this.boardActions = actionOptions;
        
        // Create menu options
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'menu-options';
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '8px';
        
        actionOptions.forEach((option, index) => {
            const optionEl = createMenuOption({
                title: option.title,
                subtitle: '',
                highlighted: false, // Will be updated by auto-scroll
                progress: 0
            });
            optionEl.dataset.index = index;
            optionEl.dataset.actionId = option.id;
            optionsContainer.appendChild(optionEl);
        });
        
        actionsContainer.appendChild(optionsContainer);
        container.appendChild(actionsContainer);
    }
    
    renderGameOverMenu(container, boardState) {
        // Create game over menu container
        const menuContainer = document.createElement('div');
        menuContainer.className = 'minesweeper-game-over-menu';
        menuContainer.id = 'menu-options';
        
        // Create menu options
        const gameOverOptions = [
            {
                id: 'play-again',
                title: 'Play Again',
                isAction: true
            },
            {
                id: 'exit-game',
                title: 'Exit Game',
                isExitGame: true
            }
        ];
        
        // Store options for selection logic
        this.options = gameOverOptions;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'menu-options';
        optionsContainer.style.display = 'flex';
        optionsContainer.style.flexDirection = 'column';
        optionsContainer.style.gap = '8px';
        
        gameOverOptions.forEach((option, index) => {
            const optionEl = createMenuOption({
                title: option.title,
                subtitle: '',
                highlighted: index === this.currentIndex,
                progress: 0
            });
            optionEl.dataset.index = index;
            optionEl.dataset.actionId = option.id;
            optionsContainer.appendChild(optionEl);
        });
        
        menuContainer.appendChild(optionsContainer);
        container.appendChild(menuContainer);
    }
    
    getAvailableRows(boardState) {
        const availableRows = [];
        const startRow = this.playAreaStartRow !== null ? this.playAreaStartRow : 0;
        const endRow = this.playAreaEndRow !== null ? this.playAreaEndRow : boardState.rows - 1;
        const startCol = this.playAreaStartCol !== null ? this.playAreaStartCol : 0;
        const endCol = this.playAreaEndCol !== null ? this.playAreaEndCol : boardState.cols - 1;
        
        for (let row = startRow; row <= endRow; row++) {
            // Check if row has at least one unrevealed square within the play area
            let hasUnrevealed = false;
            for (let col = startCol; col <= endCol; col++) {
                if (!boardState.revealed[row][col]) {
                    hasUnrevealed = true;
                    break;
                }
            }
            if (hasUnrevealed) {
                availableRows.push(row);
            }
        }
        return availableRows;
    }
    
    getAvailableColumns(boardState, row) {
        if (row === null) return [];
        const availableCols = [];
        // If play area is null, use full board; otherwise use play area bounds
        const startCol = this.playAreaStartCol !== null ? this.playAreaStartCol : 0;
        const endCol = this.playAreaEndCol !== null ? this.playAreaEndCol : boardState.cols - 1;
        
        // Make sure we're iterating through all columns in the range
        for (let col = startCol; col <= endCol; col++) {
            if (!boardState.revealed[row][col]) {
                availableCols.push(col);
            }
        }
        return availableCols;
    }
    
    startGameAutoScroll() {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
        }
        
        this.scrollInterval = setInterval(() => {
            if (!this.isSelecting && this.minesweeperMode) {
                if (this.gameMode === 'row-selection' || this.gameMode === 'column-selection') {
                    // For board-based selection, just update the index and re-render
                    const boardState = this.minesweeperGame.getBoardState();
                if (this.gameMode === 'row-selection') {
                    const availableRows = this.getAvailableRows(boardState);
                    const boardActionsCount = this.boardActions ? this.boardActions.length : 0;
                    const totalOptions = availableRows.length + boardActionsCount;
                    if (totalOptions > 0) {
                        // Move to next option, but don't loop - go to board actions after last row
                        this.currentIndex++;
                        if (this.currentIndex >= totalOptions) {
                            // After last board action, loop back to first row
                            this.currentIndex = 0;
                        }
                        this.renderMinesweeperGame();
                    }
                } else if (this.gameMode === 'column-selection') {
                    // If we're currently acting on a column (blinking), don't auto-scroll
                    if (this.isSelecting && this.actionColumn !== null) {
                        return; // Don't auto-scroll when acting on a column
                    }
                    const availableCols = this.getAvailableColumns(boardState, this.selectedRow);
                    if (availableCols.length > 0) {
                        // Move to next column, but don't loop - after last column, it will timeout
                        this.currentIndex++;
                        if (this.currentIndex >= availableCols.length) {
                            // After last column, loop back to first
                            this.currentIndex = 0;
                        }
                        this.renderMinesweeperGame();
                    }
                }
                } else if (this.gameMode === 'game-over') {
                    // For action menu and game over menu, use regular menu highlighting
                    const optionEls = document.querySelectorAll('#menu-options .menu-option');
                    if (optionEls.length > 0) {
                        this.currentIndex = (this.currentIndex + 1) % optionEls.length;
                        this.updateGameHighlight();
                    }
                }
            }
        }, this.scrollSpeed * 1000);
    }
    
    updateGameHighlight() {
        const optionEls = document.querySelectorAll('#menu-options .menu-option');
        optionEls.forEach((el, index) => {
            if (index === this.currentIndex) {
                el.classList.add('highlighted');
            } else {
                el.classList.remove('highlighted');
            }
        });
    }
    
    startRowSelectionTimeout() {
        // Clear existing timeout
        if (this.rowSelectionTimeout) {
            clearTimeout(this.rowSelectionTimeout);
        }
        
        // Set timeout for 5 seconds
        this.rowSelectionTimeout = setTimeout(() => {
            this.resetRowSelection();
        }, 5000);
    }
    
    resetRowSelection() {
        this.selectedRow = null;
        this.selectedCol = null;
        this.actionColumn = null;
        this.gameMode = 'row-selection';
        this.currentIndex = 0;
        if (this.rowSelectionTimeout) {
            clearTimeout(this.rowSelectionTimeout);
            this.rowSelectionTimeout = null;
        }
        this.renderMinesweeperGame();
    }
    
    resetBlinkState() {
        this.cancelSelection();
        this.isWinking = false;
        this.winkingEye = null;
        this.leftEyeClosed = false;
        this.rightEyeClosed = false;
        this.eyesWereOpen = false; // Require eyes to be open before next selection can start
        this.eyeClosedStartTime = null; // Reset debounce timer
    }
    
    startSelection() {
        if (this.isSelecting) return;
        if (!this.eyesWereOpen) return; // Don't start if eyes weren't open first
        
        // For board-based selection (row/column/square), we don't need progress indicators
        // The selection happens directly on the board
        if (this.minesweeperMode && (this.gameMode === 'row-selection' || this.gameMode === 'column-selection')) {
            // Check if we're in column-selection mode and have a highlighted column
            if (this.gameMode === 'column-selection' && this.selectedRow !== null) {
                const boardState = this.minesweeperGame.getBoardState();
                const availableCols = this.getAvailableColumns(boardState, this.selectedRow);
                
                // Check if we're blinking on a highlighted column (not a selected column)
                if (this.currentIndex < availableCols.length) {
                    const highlightedCol = availableCols[this.currentIndex];
                    const squareState = this.minesweeperGame.getSquareState(this.selectedRow, highlightedCol);
                    
                    // Only toggle flag if square is not already revealed
                    if (!squareState.revealed) {
                        // Toggle flag immediately when blink starts on highlighted column
                        this.minesweeperGame.toggleFlag(this.selectedRow, highlightedCol);
                        // Re-render immediately to show the flag change
                        this.renderMinesweeperGame();
                    }
                    
                    // Use blink threshold for hold time to mine
                    const holdTime = this.blinkThreshold;
                    
                    // Store the column we're acting on
                    this.actionColumn = highlightedCol;
                    
                    this.isSelecting = true;
                    this.selectionProgress = 0;
                    this.selectionStartTime = Date.now();
                    
                    const animate = () => {
                        if (!this.isSelecting) {
                            this.cancelSelection();
                            return;
                        }
                        
                        const elapsed = (Date.now() - this.selectionStartTime) / 1000;
                        this.selectionProgress = Math.min(elapsed / holdTime, 1);
                        
                        // Update progress fill on highlighted area
                        this.updateHighlightedAreaProgress(this.selectionProgress);
                        
                        if (this.selectionProgress >= 1) {
                            // Complete blink on highlighted column - perform mine action
                            this.cancelSelection();
                            this.handleMineActionOnColumn(this.selectedRow, this.actionColumn);
                            this.actionColumn = null;
                            this.resetBlinkState();
                        } else {
                            this.selectionAnimationFrame = requestAnimationFrame(animate);
                        }
                    };
                    
                    this.selectionAnimationFrame = requestAnimationFrame(animate);
                    return;
                }
            }
            
            // Regular row/column/board action selection
            // Check if we're selecting a board action that needs special hold time
            let holdTime = this.blinkThreshold;
            if (this.gameMode === 'row-selection') {
                const boardState = this.minesweeperGame.getBoardState();
                const availableRows = this.getAvailableRows(boardState);
                if (this.currentIndex >= availableRows.length && this.boardActions) {
                    // Selecting a board action
                    const actionIndex = this.currentIndex - availableRows.length;
                    if (actionIndex < this.boardActions.length) {
                        const action = this.boardActions[actionIndex];
                        if (action.isExitGame) {
                            holdTime = this.exitGameHoldTime; // 2 seconds for Exit Game
                        }
                    }
                }
            }
            
            // Board-based selection - no progress indicator needed
            this.isSelecting = true;
            this.selectionProgress = 0;
            this.selectionStartTime = Date.now();
            
            const animate = () => {
                if (!this.isSelecting) {
                    this.cancelSelection();
                    return;
                }
                
                const elapsed = (Date.now() - this.selectionStartTime) / 1000;
                this.selectionProgress = Math.min(elapsed / holdTime, 1);
                
                // Update progress fill on highlighted area
                this.updateHighlightedAreaProgress(this.selectionProgress);
                
                if (this.selectionProgress >= 1) {
                    // Selection complete
                    // Check if we're selecting a square (both row and col are selected)
                    if (this.selectedRow !== null && this.selectedCol !== null) {
                        // Complete blink on a square - perform mine action
                        this.cancelSelection();
                        this.handleMineAction();
                        this.resetBlinkState();
                    } else {
                        // Regular selection (row or board action)
                        this.cancelSelection();
                        this.handleGameSelection();
                        this.resetBlinkState();
                    }
                } else {
                    this.selectionAnimationFrame = requestAnimationFrame(animate);
                }
            };
            
            this.selectionAnimationFrame = requestAnimationFrame(animate);
            return;
        }
        
        // For menu-based selection (action menu or regular menus), use progress indicators
        let optionEls;
        if (this.minesweeperMode) {
            optionEls = document.querySelectorAll('#menu-options .menu-option');
        } else {
            optionEls = document.querySelectorAll('.menu-option');
        }
        
        if (this.currentIndex >= optionEls.length) return;
        
        const optionEl = optionEls[this.currentIndex];
        const progressFill = optionEl.querySelector('.progress-fill');
        
        // Don't start selection if there's no progress fill (e.g., value display)
        if (!progressFill) return;
        
        // Determine hold time based on context
        let holdTime = this.blinkThreshold;
        if (this.minesweeperMode) {
            if (this.gameMode === 'game-over' && this.options[this.currentIndex]) {
                const option = this.options[this.currentIndex];
                if (option.isAction) {
                    holdTime = this.actionMenuHoldTime;
                } else if (option.isExitGame) {
                    holdTime = this.exitGameHoldTime;
                }
            }
        }
        
        this.isSelecting = true;
        this.selectionProgress = 0;
        this.selectionStartTime = Date.now();
        
        const animate = () => {
            if (!this.isSelecting) {
                this.cancelSelection();
                return;
            }
            
            const elapsed = (Date.now() - this.selectionStartTime) / 1000;
            this.selectionProgress = Math.min(elapsed / holdTime, 1);
            
            if (progressFill) {
                progressFill.style.width = (this.selectionProgress * 100) + '%';
            }
            
            // Also update highlighted area progress if in board-based selection
            if (this.minesweeperMode && (this.gameMode === 'row-selection' || this.gameMode === 'column-selection')) {
                this.updateHighlightedAreaProgress(this.selectionProgress);
            }
            
            if (this.selectionProgress >= 1) {
                // Selection complete
                this.cancelSelection();
                this.eyesWereOpen = false; // Reset before navigation - require eyes to open again
                this.selectOption();
            } else {
                this.selectionAnimationFrame = requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    cancelSelection() {
        // Check if we were acting on a highlighted column during column selection
        const wasActingOnColumn = this.minesweeperMode && 
            this.gameMode === 'column-selection' && 
            this.selectedRow !== null && 
            this.actionColumn !== null &&
            this.isSelecting;
        
        const actionCol = this.actionColumn; // Store before resetting
        
        this.isSelecting = false;
        this.selectionProgress = 0;
        this.actionColumn = null;
        
        if (this.selectionAnimationFrame) {
            cancelAnimationFrame(this.selectionAnimationFrame);
            this.selectionAnimationFrame = null;
        }
        
        const optionEls = document.querySelectorAll('.menu-option');
        optionEls.forEach(el => {
            const progressFill = el.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '0%';
            }
        });
        
        // Clear highlighted area progress
        this.updateHighlightedAreaProgress(0);
        
        // If we were acting on a highlighted column and released early (didn't complete mine action),
        // we already toggled the flag, so just update play area and continue column selection
        if (wasActingOnColumn && actionCol !== null) {
            // Update play area after flag toggle
            this.updatePlayAreaAfterAction(this.selectedRow, actionCol);
            // Re-render to show the flag change
            this.renderMinesweeperGame();
        }
    }
    
    handleMineActionOnColumn(row, col) {
        // Check if square is flagged - if so, unflag it first (since we toggled flag on blink start)
        const squareState = this.minesweeperGame.getSquareState(row, col);
        if (squareState.flagged) {
            // Unflag it first so we can mine it
            this.minesweeperGame.toggleFlag(row, col);
        }
        
        const result = this.minesweeperGame.mineSquare(row, col);
        
        if (result.gameOver) {
            if (result.won) {
                // Handle win - show win menu
                this.gameMode = 'game-over';
                this.currentIndex = 0;
                this.renderMinesweeperGame();
            } else {
                // Handle loss - reveal the mine and show game over menu
                // The mine should already be revealed by the engine
                this.gameMode = 'game-over';
                this.currentIndex = 0;
                this.renderMinesweeperGame();
            }
        } else {
            // Update play area to 5x5 centered on this square
            this.updatePlayAreaAfterAction(row, col);
            
            // Re-render board and return to row selection
            this.resetRowSelection();
        }
    }
    
    updateHighlightedAreaProgress(progress) {
        // Update progress fill on the highlighted area (row or square)
        const highlightedArea = document.querySelector('.minesweeper-highlighted-area');
        if (highlightedArea) {
            const progressFill = highlightedArea.querySelector('.minesweeper-highlighted-progress');
            if (progressFill) {
                progressFill.style.width = `${progress * 100}%`;
            }
        }
    }
    
    // Blink Detection Methods
    waitForMediaPipe() {
        if (typeof FaceMesh !== 'undefined' && typeof Camera !== 'undefined') {
            this.initializeFaceMesh();
            this.startCamera();
        } else {
            setTimeout(() => this.waitForMediaPipe(), 100);
        }
    }
    
    initializeFaceMesh() {
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });
        
        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.faceMesh.onResults((results) => this.onFaceMeshResults(results));
    }
    
    startCamera() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Keep camera overlay hidden - camera runs in background
        // const cameraOverlay = document.getElementById('camera-overlay');
        // cameraOverlay.classList.remove('hidden');
        
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.faceMesh) {
                    await this.faceMesh.send({ image: this.video });
                }
            },
            width: 1280,
            height: 720
        });
        
        this.camera.start();
        
        // Set canvas dimensions when video loads
        this.video.addEventListener('loadedmetadata', () => {
            if (this.canvas && this.video) {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            }
        });
    }
    
    calculateEAR(landmarks, eyePoints) {
        const vertical1 = this.euclideanDistance(
            landmarks[eyePoints.vertical1[0]],
            landmarks[eyePoints.vertical1[1]]
        );
        
        const vertical2 = this.euclideanDistance(
            landmarks[eyePoints.vertical2[0]],
            landmarks[eyePoints.vertical2[1]]
        );
        
        const horizontal = this.euclideanDistance(
            landmarks[eyePoints.horizontal[0]],
            landmarks[eyePoints.horizontal[1]]
        );
        
        return (vertical1 + vertical2) / (2.0 * horizontal);
    }
    
    euclideanDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    detectSingleEyeBlink() {
        const now = Date.now();
        const leftClosed = this.earLeft < EAR_THRESHOLD;
        const rightClosed = this.earRight < EAR_THRESHOLD;
        const leftOpen = this.earLeft >= EAR_THRESHOLD;
        const rightOpen = this.earRight >= EAR_THRESHOLD;
        const bothOpen = leftOpen && rightOpen;
        const anyEyeClosed = leftClosed || rightClosed;
        
        // Debounce: require eyes to be closed for a minimum duration before registering as blink
        if (anyEyeClosed) {
            if (this.eyeClosedStartTime === null) {
                // Just detected eyes closed - start timer
                this.eyeClosedStartTime = now;
            } else {
                // Eyes still closed - check if debounce time has passed
                const closedDuration = now - this.eyeClosedStartTime;
                if (closedDuration >= this.BLINK_DEBOUNCE_TIME) {
                    // Debounce time passed - eyes are confirmed closed
                    const confirmedClosed = true;
                    this.handleBlinkState(confirmedClosed, bothOpen, leftClosed, rightClosed, leftOpen, rightOpen);
                }
                // If debounce time hasn't passed, don't register as closed yet
            }
        } else {
            // Eyes are open - reset debounce timer
            if (this.eyeClosedStartTime !== null) {
                this.eyeClosedStartTime = null;
            }
            // Handle open state
            this.handleBlinkState(false, bothOpen, leftClosed, rightClosed, leftOpen, rightOpen);
        }
    }
    
    handleBlinkState(anyEyeClosed, bothOpen, leftClosed, rightClosed, leftOpen, rightOpen) {
        // Handle SOS pattern detection for lock screen
        if (this.currentMenu === 'lock' || this.isLocked) {
            this.handleSOSPattern(anyEyeClosed, bothOpen);
            return;
        }
        
        // Update eyesWereOpen flag - track when both eyes are open
        if (bothOpen) {
            this.eyesWereOpen = true;
        }
        
        // Track eye states for reference
        this.leftEyeClosed = leftClosed;
        this.rightEyeClosed = rightClosed;
        
        // Update blinking state: true if any eye is closed (single or both)
        const wasBlinking = this.isWinking;
        this.isWinking = anyEyeClosed;
        
        // Determine which eye(s) are closed for tracking
        if (leftClosed && rightOpen) {
            this.winkingEye = 'left';
        } else if (rightClosed && leftOpen) {
            this.winkingEye = 'right';
        } else if (leftClosed && rightClosed) {
            this.winkingEye = 'both';
        } else {
            this.winkingEye = null;
        }
        
        // Handle selection based on blink state
        // Blink starts: any eye closes (and eyes were open before)
        // Blink continues: as long as any eye is closed
        // Blink ends: when both eyes are open
        if (this.isWinking) {
            // Start selection if we just started blinking and eyes were open
            if (!wasBlinking && this.eyesWereOpen && !this.isSelecting) {
                this.startSelection();
            }
            // Continue selection if already selecting
        } else {
            // Both eyes are open - end the blink and cancel selection
            if (this.isSelecting) {
                this.cancelSelection();
            }
        }
    }
    
    handleSOSPattern(anyEyeClosed, bothOpen) {
        const now = Date.now();
        const expectedDuration = this.sosPattern[this.sosStep];
        const OVERFILL_THRESHOLD = 0.5; // 0.5 seconds after full fill is a mistake
        
        // If we require eyes to be open (after a reset), check if they are open now
        if (this.sosRequireEyesOpen) {
            if (bothOpen) {
                // Eyes are now open - allow new blinks
                this.sosRequireEyesOpen = false;
            } else {
                // Eyes still closed - don't process anything until they open
                return;
            }
        }
        
        if (anyEyeClosed) {
            if (this.sosBlinkStartTime === null) {
                // Just started blinking
                this.sosBlinkStartTime = now;
                this.sosFullFillTime = null;
                this.updateLockScreenProgress(this.sosStep, 0);
            } else {
                // Check if we've held too long after full fill
                if (this.sosFullFillTime !== null) {
                    const overfillDuration = (now - this.sosFullFillTime) / 1000;
                    if (overfillDuration > OVERFILL_THRESHOLD) {
                        // Held too long after full fill - reset the whole lock screen
                        this.resetSOSPattern(true); // Pass true to indicate this was due to over-hold
                        return;
                    }
                }
            }
            // Progress will be updated by animation loop
        } else if (bothOpen && this.sosBlinkStartTime !== null) {
            // Blink ended
            const blinkDuration = (now - this.sosBlinkStartTime) / 1000;
            this.sosBlinkStartTime = null;
            
            // Check if square was fully filled (reached expected duration)
            if (blinkDuration >= expectedDuration) {
                // Square was fully filled - success! Clear failure timeout
                this.clearFailureTimeout();
                this.updateLockScreenProgress(this.sosStep, 1);
                this.sosStep++;
                this.sosFullFillTime = null;
                
                // Check if pattern is complete
                if (this.sosStep >= this.sosPattern.length) {
                    // Pattern complete - unlock
                    this.clearFailureTimeout();
                    this.unlock();
                } else {
                    // Reset progress for next step and highlight it
                    this.updateLockScreenProgress(this.sosStep, 0);
                }
            } else {
                // Released before square was fully filled - reset the whole lock screen
                this.resetSOSPattern(false); // Not due to over-hold, so don't require eyes open
            }
        }
    }
    
    startFailureTimeout() {
        // Start or restart the timeout for 5 seconds without successfully completing a square
        this.clearFailureTimeout();
        this.sosInactivityTimeout = setTimeout(() => {
            this.resetSOSPattern(false); // Timeout reset doesn't require eyes open
        }, 5000); // 5 seconds without success
    }
    
    clearFailureTimeout() {
        // Clear the timeout when a square is successfully completed
        if (this.sosInactivityTimeout) {
            clearTimeout(this.sosInactivityTimeout);
            this.sosInactivityTimeout = null;
        }
    }
    
    startLockScreenAnimation() {
        if (this.lockScreenAnimationFrame) {
            cancelAnimationFrame(this.lockScreenAnimationFrame);
        }
        
        const animate = () => {
            if (this.currentMenu !== 'lock' && !this.isLocked) {
                // No longer on lock screen, stop animation
                if (this.lockScreenAnimationFrame) {
                    cancelAnimationFrame(this.lockScreenAnimationFrame);
                    this.lockScreenAnimationFrame = null;
                }
                return;
            }
            
            if (this.sosBlinkStartTime !== null && this.sosStep < this.sosPattern.length) {
                // Update progress for current blink
                const now = Date.now();
                const elapsed = (now - this.sosBlinkStartTime) / 1000;
                const expectedDuration = this.sosPattern[this.sosStep];
                const progress = Math.min(elapsed / expectedDuration, 1);
                this.updateLockScreenProgress(this.sosStep, progress);
                
                // Track when square reaches 100% fill
                if (progress >= 1 && this.sosFullFillTime === null) {
                    this.sosFullFillTime = now;
                }
            }
            
            this.lockScreenAnimationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    updateLockScreenProgress(step, progress) {
        const lockScreen = document.querySelector('.lock-screen');
        if (!lockScreen) return;
        
        const squares = lockScreen.querySelectorAll('.lock-square');
        if (squares[step]) {
            const progressFill = squares[step].querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${progress * 100}%`;
            }
        }
        
        // Highlight the current/next square to complete
        squares.forEach((sq, idx) => {
            if (idx === this.sosStep) {
                sq.classList.add('highlighted');
            } else {
                sq.classList.remove('highlighted');
            }
        });
    }
    
    resetSOSPattern(requireEyesOpen = false) {
        this.clearFailureTimeout();
        this.sosStep = 0;
        this.sosBlinkStartTime = null;
        this.sosBlinkDuration = 0;
        this.sosFullFillTime = null;
        
        // If reset was due to over-holding, require eyes to be open before new blink
        this.sosRequireEyesOpen = requireEyesOpen;
        
        // Clear all progress fills
        const lockScreen = document.querySelector('.lock-screen');
        if (lockScreen) {
            const squares = lockScreen.querySelectorAll('.lock-square');
            squares.forEach(sq => {
                const progressFill = sq.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = '0%';
                }
                sq.classList.remove('highlighted');
            });
        }
        
        // Highlight first square
        this.updateLockScreenProgress(0, 0);
    }
    
    unlock() {
        this.isLocked = false;
        this.sosStep = 0;
        this.sosBlinkStartTime = null;
        this.sosBlinkDuration = 0;
        this.sosFullFillTime = null;
        this.sosRequireEyesOpen = false; // Reset the flag
        this.clearFailureTimeout();
        
        // Stop lock screen animation
        if (this.lockScreenAnimationFrame) {
            cancelAnimationFrame(this.lockScreenAnimationFrame);
            this.lockScreenAnimationFrame = null;
        }
        
        // Restore menu container structure if it was replaced
        const app = document.getElementById('app');
        const lockScreen = document.querySelector('.lock-screen');
        if (lockScreen) {
            // Replace lock screen with proper menu container structure
            const menuContainer = document.createElement('div');
            menuContainer.id = 'menu-container';
            const menuTitle = document.createElement('h1');
            menuTitle.id = 'menu-title';
            menuTitle.className = 'menu-title';
            const menuOptions = document.createElement('div');
            menuOptions.id = 'menu-options';
            menuOptions.className = 'menu-options';
            menuContainer.appendChild(menuTitle);
            menuContainer.appendChild(menuOptions);
            lockScreen.replaceWith(menuContainer);
        }
        
        // Navigate back to main menu
        this.currentMenu = 'main';
        this.menuStack = [];
        this.renderMenu();
        this.startAutoScroll();
    }
    
    onFaceMeshResults(results) {
        if (this.ctx && this.canvas && this.canvas.width > 0) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            this.earLeft = this.calculateEAR(landmarks, LEFT_EYE_POINTS);
            this.earRight = this.calculateEAR(landmarks, RIGHT_EYE_POINTS);
            
            this.detectSingleEyeBlink();
        } else {
            this.isWinking = false;
            this.winkingEye = null;
            this.cancelSelection();
            this.eyesWereOpen = false; // Reset when face not detected
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MenuApp();
});
