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
        this.gameMode = 'row-selection'; // 'row-selection', 'column-selection', 'square-selection', 'game-over'
        this.selectedRow = null;
        this.selectedCol = null;
        this.actionColumn = null; // Column being acted on during column selection
        this.actionSquare = null; // Square being acted on during square selection (3x3)
        this.flagToggled = false; // Track if flag was toggled during current blink
        this.actionMenuHoldTime = 0.5; // 0.5 seconds for action menu
        this.exitGameHoldTime = 2.0; // 2 seconds for exit game
        this.focusAreaSize = 3; // Default focus area size (3x3, 5x5, 7x7, 9x9)
        // Play area (null means full board)
        this.playAreaStartRow = null;
        this.playAreaEndRow = null;
        this.playAreaStartCol = null;
        this.playAreaEndCol = null;
        this.lastActionRow = null; // Row of last action (mine or flag)
        this.lastActionCol = null; // Col of last action (mine or flag)
        this.boardActions = null; // Board actions (Zoom Out, Exit Game)
        this.columnSelectionStartIndex = null; // Track where column selection started to detect full cycle
        this.gameInProgress = false; // Whether there's a game that can be resumed
        
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
        const savedFocusAreaSize = localStorage.getItem('focusAreaSize');
        
        if (savedScrollSpeed) {
            this.scrollSpeed = parseFloat(savedScrollSpeed);
        }
        if (savedBlinkThreshold) {
            this.blinkThreshold = parseFloat(savedBlinkThreshold);
        }
        if (savedFocusAreaSize) {
            this.focusAreaSize = parseInt(savedFocusAreaSize, 10);
        }
    }
    
    saveSettings() {
        localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
        localStorage.setItem('blinkThreshold', this.blinkThreshold.toString());
        localStorage.setItem('focusAreaSize', this.focusAreaSize.toString());
    }
    
    initializeMenus() {
        this.menus = {
            main: [
                { id: 'lock', title: 'Rest', subtitle: 'Lock the app to rest' },
                { id: 'write', title: 'Write', subtitle: 'with predictive assistance' },
                { id: 'saved-text', title: 'Saved text', subtitle: 'View and manage saved text' },
                { id: 'games', title: 'Games', subtitle: 'Have fun!' },
                { id: 'settings', title: 'Settings', subtitle: 'Customize the app to your preferences' }
            ],
            write: [
                { id: 'back', title: 'Back', subtitle: '' }
            ],
            'saved-text': [
                { id: 'back', title: 'Back', subtitle: '' }
            ],
            'games': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'minesweeper', title: 'Minesweeper', subtitle: 'Classic minesweeper game' }
            ],
            'minesweeper': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'new-game', title: 'New Game', subtitle: '' },
                { id: 'resume-game', title: 'Resume Game', subtitle: '' },
                { id: 'minesweeper-settings', title: 'Settings', subtitle: 'Focus area size' }
            ],
            'minesweeper-settings': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'focus-area-size', title: 'Focus Area Size', subtitle: '', value: '' }
            ],
            'minesweeper-focus-area-size': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'decrease', title: '- Decrease -', subtitle: '' },
                { id: 'value', title: '', subtitle: '' }, // Will be populated dynamically
                { id: 'increase', title: '+ Increase +', subtitle: '' }
            ],
            'minesweeper-difficulty': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'easy', title: 'Easy', subtitle: 'Fewer mines, larger safe areas' },
                { id: 'medium', title: 'Medium', subtitle: 'Standard mine density' },
                { id: 'hard', title: 'Hard', subtitle: 'More mines, tighter spacing' }
            ],
            'minesweeper-board-size': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'small', title: 'Small', subtitle: '7x7 board' },
                { id: 'medium', title: 'Medium', subtitle: '9x9 board' },
                { id: 'large', title: 'Large', subtitle: '9x16 board (9 width, 16 tall)' }
            ],
            settings: [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'scroll-speed', title: 'Scroll Speed', subtitle: 'Amount of time the cursor spends on each option', value: '' },
                { id: 'blink-threshold', title: 'Blink threshold', subtitle: 'Amount of time a blink must last to be recognised as a blink.', value: '' }
            ],
            'scroll-speed': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'decrease', title: '- Decrease -', subtitle: '' },
                { id: 'value', title: '', subtitle: '' }, // Will be populated dynamically
                { id: 'increase', title: '+ Increase +', subtitle: '' }
            ],
            'blink-threshold': [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'decrease', title: '- Decrease -', subtitle: '' },
                { id: 'value', title: '', subtitle: '' }, // Will be populated dynamically
                { id: 'increase', title: '+ Increase +', subtitle: '' }
            ],
            lock: [
                { id: 'back', title: 'Back', subtitle: '' }
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
        } else if (this.currentMenu === 'minesweeper-focus-area-size') {
            titleText = 'Minesweeper Settings / Focus Area Size';
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
                'minesweeper-settings': 'Minesweeper Settings',
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
        if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold' || this.currentMenu === 'minesweeper-focus-area-size') {
            let currentValue;
            if (this.currentMenu === 'scroll-speed') {
                currentValue = this.scrollSpeed;
            } else if (this.currentMenu === 'blink-threshold') {
                currentValue = this.blinkThreshold;
            } else if (this.currentMenu === 'minesweeper-focus-area-size') {
                currentValue = this.focusAreaSize;
            }
            
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
            
            // For focus area size, update the value display format
            if (this.currentMenu === 'minesweeper-focus-area-size') {
                const valueEl = settingsDetail.querySelector('[data-id="value"]');
                if (valueEl) {
                    const titleEl = valueEl.querySelector('.menu-option-title');
                    if (titleEl) {
                        titleEl.textContent = `${currentValue}x${currentValue}`;
                    }
                }
            }
            
            // Append all options from SettingsDetail and map them
            // SettingsDetail creates: Decrease (0), Value (1), Increase (2), Back (3)
            const optionsMap = [];
            Array.from(settingsDetail.children).forEach((optionEl, index) => {
                const optionId = optionEl.dataset.id;
                
                // Mark value display as non-selectable
                if (optionId === 'value') {
                    optionEl.style.pointerEvents = 'none';
                    optionEl.dataset.selectable = 'false';
                    menuOptions.appendChild(optionEl);
                    // Still add to options array but mark it
                    if (this.currentMenu === 'minesweeper-focus-area-size') {
                        optionsMap.push({ id: 'value', title: `${currentValue}x${currentValue}`, subtitle: '', selectable: false });
                    } else {
                        optionsMap.push({ id: 'value', title: `${currentValue.toFixed(1)} s`, subtitle: '', selectable: false });
                    }
                    return;
                }
                
                optionEl.dataset.index = index;
                menuOptions.appendChild(optionEl);
                
                // Check for disabled states
                let disabled = false;
                if (optionId === 'decrease') {
                    if (this.currentMenu === 'minesweeper-focus-area-size') {
                        disabled = currentValue <= 3;
                    } else if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold') {
                        disabled = currentValue <= 0.1;
                    }
                    if (disabled) {
                        optionEl.style.opacity = '0.5';
                        optionEl.style.pointerEvents = 'none';
                        optionEl.dataset.disabled = 'true';
                    }
                    optionsMap.push({ id: 'decrease', title: '- Decrease -', subtitle: '', disabled });
                } else if (optionId === 'increase') {
                    if (this.currentMenu === 'minesweeper-focus-area-size') {
                        disabled = currentValue >= 9;
                    }
                    if (disabled) {
                        optionEl.style.opacity = '0.5';
                        optionEl.style.pointerEvents = 'none';
                        optionEl.dataset.disabled = 'true';
                    }
                    optionsMap.push({ id: 'increase', title: '+ Increase +', subtitle: '', disabled });
                } else if (optionId === 'back') {
                    if (this.currentMenu === 'minesweeper-focus-area-size') {
                        optionsMap.push({ id: 'back', title: 'Back', subtitle: '' });
                    } else {
                        optionsMap.push({ id: 'back', title: 'Back', subtitle: 'Return to previous menu' });
                    }
                }
            });
            
            // Set options array matching DOM order: Decrease, Value, Increase, Back
            this.options = optionsMap;
        } else {
            // Use MenuContainer component for regular menus
            // Update settings menu values dynamically before rendering
            if (this.currentMenu === 'settings') {
                this.updateSettingsMenu();
            } else if (this.currentMenu === 'minesweeper-settings') {
                this.updateMinesweeperSettingsMenu();
            } else if (this.currentMenu === 'minesweeper') {
                // Filter out "Resume Game" if no game in progress or if saved game is finished
                this.options = this.options.filter(opt => {
                    if (opt.id === 'resume-game') {
                        // Check if there's a valid saved game that's not finished
                        const savedGameState = this.loadGameState();
                        const hasValidSavedGame = savedGameState && !savedGameState.gameOver;
                        return (this.gameInProgress && this.minesweeperGame !== null) || hasValidSavedGame;
                    }
                    return true;
                });
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
            // Skip highlighting value display and disabled options
            if (el.dataset.selectable === 'false' || el.dataset.disabled === 'true') {
                el.classList.remove('highlighted');
                return;
            }
            
            // Use index-based highlighting (original logic)
            if (index === this.currentIndex) {
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
                // Get selectable options (skip value and disabled)
                const getSelectableIndices = () => {
                    const selectable = [];
                    this.options.forEach((opt, idx) => {
                        if (opt.selectable === false || opt.disabled) return;
                        selectable.push(idx);
                    });
                    return selectable;
                };
                
                const selectableIndices = getSelectableIndices();
                
                if (selectableIndices.length > 0) {
                    // Find current index in selectable list
                    let currentSelectableIdx = selectableIndices.indexOf(this.currentIndex);
                    
                    // If current is not selectable, use first selectable
                    if (currentSelectableIdx < 0) {
                        currentSelectableIdx = 0;
                    }
                    
                    // Move to next selectable
                    currentSelectableIdx = (currentSelectableIdx + 1) % selectableIndices.length;
                    this.currentIndex = selectableIndices[currentSelectableIdx];
                } else {
                    // Fallback
                    this.currentIndex = (this.currentIndex + 1) % this.options.length;
                }
                
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
            if (this.currentMenu === 'minesweeper-focus-area-size') {
                this.decreaseFocusAreaSize();
            } else {
                this.decreaseSetting();
            }
        } else if (option.id === 'increase') {
            if (this.currentMenu === 'minesweeper-focus-area-size') {
                this.increaseFocusAreaSize();
            } else {
                this.increaseSetting();
            }
        } else if (option.id === 'value') {
            // Value display is not selectable, skip to next
            return;
        } else if (option.id === 'lock') {
            // Lock the app
            this.isLocked = true;
            this.currentMenu = 'lock';
            this.renderMenu();
        } else if (option.id === 'minesweeper') {
            // Navigate to Minesweeper menu
            this.navigateTo('minesweeper');
        } else if (option.id === 'new-game') {
            // Start new Minesweeper game setup flow
            // Clear any saved game state when starting a new game
            localStorage.removeItem('minesweeperGameState');
            this.navigateTo('minesweeper-difficulty');
        } else if (option.id === 'resume-game') {
            // Resume existing game
            if (this.gameInProgress && this.minesweeperGame) {
                // Game is already in memory, just resume
                this.minesweeperMode = true;
                this.currentMenu = 'minesweeper-game';
                this.renderMinesweeperGame();
            } else {
                // Try to load saved game state
                const savedGameState = this.loadGameState();
                if (savedGameState && !savedGameState.gameOver) {
                    // Restore game settings and load the game
                    this.selectedDifficulty = savedGameState.difficulty;
                    this.selectedBoardSize = savedGameState.boardSize;
                    this.startMinesweeperGame();
                }
            }
        } else if (option.id === 'minesweeper-settings') {
            // Navigate to Minesweeper settings
            this.navigateTo('minesweeper-settings');
        } else if (option.id === 'focus-area-size') {
            // Navigate to focus area size adjustment
            this.navigateTo('minesweeper-focus-area-size');
        } else if (this.currentMenu === 'minesweeper-difficulty' && (option.id === 'easy' || option.id === 'medium' || option.id === 'hard')) {
            // Store selected difficulty and proceed to board size selection
            this.selectedDifficulty = option.id;
            this.navigateTo('minesweeper-board-size');
        } else if (this.currentMenu === 'minesweeper-board-size' && (option.id === 'small' || option.id === 'medium' || option.id === 'large')) {
            // Store selected board size and start game
            this.selectedBoardSize = option.id;
            this.startMinesweeperGame();
        } else {
            this.navigateTo(option.id);
        }
    }
    
    handleGameSelection() {
        const boardState = this.minesweeperGame.getBoardState();
        
        // For 3x3 areas with active play area, use square-selection mode instead of row/column selection
        if (this.focusAreaSize === 3 && this.playAreaStartRow !== null && this.gameMode === 'row-selection') {
            this.gameMode = 'square-selection';
            this.currentIndex = 0;
            this.renderMinesweeperGame();
            return;
        }
        
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
                // Track where column selection started to detect full cycle
                this.columnSelectionStartIndex = 0;
                this.renderMinesweeperGame();
            } else {
                // Select a board action (Zoom Out or Exit Game)
                const actionIndex = this.currentIndex - availableRows.length;
                if (this.boardActions && actionIndex < this.boardActions.length) {
                    const action = this.boardActions[actionIndex];
                    if (action.id === 'zoom-out') {
                        // Zoom out - remove play area (show full board)
                        this.playAreaStartRow = null;
                        this.playAreaEndRow = null;
                        this.playAreaStartCol = null;
                        this.playAreaEndCol = null;
                        // Switch to row-selection mode when zoomed out (always use row-selection for full board)
                        this.gameMode = 'row-selection';
                        this.currentIndex = 0;
                        this.renderMinesweeperGame();
                    } else if (action.id === 'exit-game') {
                        // Exit game
                        this.exitMinesweeperGame();
                    }
                }
            }
        } else if (this.gameMode === 'square-selection') {
            // Check if we're selecting a square or a board action
            const availableSquares = this.getAvailableSquares(boardState);
            const boardActionsCount = this.boardActions ? this.boardActions.length : 0;
            
            if (this.currentIndex < availableSquares.length) {
                // Square selection is handled directly by blinking on highlighted squares
                // No need to "select" a square first - actions happen on highlighted squares
            } else {
                // Select a board action (Zoom Out or Exit Game)
                const actionIndex = this.currentIndex - availableSquares.length;
                if (this.boardActions && actionIndex < this.boardActions.length) {
                    const action = this.boardActions[actionIndex];
                    if (action.id === 'zoom-out') {
                        // Zoom out - remove play area (show full board)
                        this.playAreaStartRow = null;
                        this.playAreaEndRow = null;
                        this.playAreaStartCol = null;
                        this.playAreaEndCol = null;
                        // Switch to row-selection mode when zoomed out (always use row-selection for full board)
                        this.gameMode = 'row-selection';
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
                // Clear the old game first
                this.minesweeperGame = null;
                this.gameInProgress = false;
                localStorage.removeItem('minesweeperGameState'); // Clear saved state
                this.startMinesweeperGame();
            } else if (option.id === 'exit-game') {
                // Clear game completely when exiting from game over
                this.minesweeperGame = null;
                this.gameInProgress = false;
                localStorage.removeItem('minesweeperGameState'); // Clear saved state
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
            // Game is finished - clear saved state
            localStorage.removeItem('minesweeperGameState');
            this.gameInProgress = false;
            
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
            // Update play area to focus area size centered on this square
            this.updatePlayAreaAfterAction(this.selectedRow, this.selectedCol);
            
            // Autosave game state after board modification
            this.saveGameState();
            
            // Re-render board and return to row selection
            this.resetRowSelection();
        }
    }
    
    handleFlagAction() {
        this.minesweeperGame.toggleFlag(this.selectedRow, this.selectedCol);
        
        // Don't update play area for flag actions - only mines move the center
        
        // Autosave game state after board modification
        this.saveGameState();
        
        // Re-render board and return to row selection
        this.resetRowSelection();
    }
    
    exitMinesweeperGame() {
        // Game state is already autosaved on every board modification
        // No need to save again here - it's already up to date
        
        // Don't clear minesweeperGame or gameInProgress - allow resuming
        this.minesweeperMode = false;
        this.gameMode = 'row-selection';
        this.selectedRow = null;
        this.selectedCol = null;
        this.playAreaStartRow = null;
        this.playAreaEndRow = null;
        this.playAreaStartCol = null;
        this.playAreaEndCol = null;
        this.lastActionRow = null;
        this.lastActionCol = null;
        this.columnSelectionStartIndex = null;
        this.boardActions = null;
        
        // Stop any game auto-scroll
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }
        
        // Clear any selection state
        this.cancelSelection();
        
        // Restore menu container structure if it was replaced by game
        const app = document.getElementById('app');
        const existingContainer = document.getElementById('menu-container');
        if (existingContainer && !existingContainer.querySelector('#menu-title')) {
            // Menu container was replaced by game, restore it
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
            
            existingContainer.replaceWith(menuContainer);
        }
        
        // Navigate to minesweeper menu (not games menu)
        this.currentMenu = 'minesweeper';
        this.currentIndex = 0;
        this.renderMenu();
        this.resetBlinkState();
        
        // Start auto-scroll for the menu
        this.startAutoScroll();
    }
    
    decreaseSetting() {
        if (this.currentMenu === 'scroll-speed') {
            this.scrollSpeed = Math.max(0.1, this.scrollSpeed - 0.1);
            this.saveSettings();
            this.startAutoScroll(); // Restart with new speed
            this.updateValueDisplay();
            this.updateDisabledStates();
        } else if (this.currentMenu === 'blink-threshold') {
            this.blinkThreshold = Math.max(0.1, this.blinkThreshold - 0.1);
            this.saveSettings();
            this.updateValueDisplay();
            this.updateDisabledStates();
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
            this.updateDisabledStates();
        } else if (this.currentMenu === 'blink-threshold') {
            this.blinkThreshold += 0.1;
            this.saveSettings();
            this.updateValueDisplay();
            this.updateDisabledStates();
        }
        // Update settings menu values if we're going back to settings
        this.updateSettingsMenu();
    }
    
    updateValueDisplay() {
        // Update value display for settings detail pages without re-rendering entire menu
        if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold' || this.currentMenu === 'minesweeper-focus-area-size') {
            let currentValue;
            if (this.currentMenu === 'scroll-speed') {
                currentValue = this.scrollSpeed;
            } else if (this.currentMenu === 'blink-threshold') {
                currentValue = this.blinkThreshold;
            } else if (this.currentMenu === 'minesweeper-focus-area-size') {
                currentValue = this.focusAreaSize;
            }
            const menuOptions = document.getElementById('menu-options');
            if (menuOptions) {
                const valueEl = Array.from(menuOptions.children).find(el => {
                    return el.dataset.id === 'value' || (el.querySelector('.menu-option-title') && this.options[Array.from(menuOptions.children).indexOf(el)]?.id === 'value');
                });
                if (valueEl) {
                    const titleEl = valueEl.querySelector('.menu-option-title');
                    if (titleEl) {
                        if (this.currentMenu === 'minesweeper-focus-area-size') {
                            titleEl.textContent = `${currentValue}x${currentValue}`;
                        } else {
                            titleEl.textContent = `${currentValue.toFixed(1)} s`;
                        }
                    }
                    // Update options array for selection logic
                    const valueOption = this.options.find(opt => opt.id === 'value');
                    if (valueOption) {
                        if (this.currentMenu === 'minesweeper-focus-area-size') {
                            valueOption.title = `${currentValue}x${currentValue}`;
                        } else {
                            valueOption.title = `${currentValue.toFixed(1)} s`;
                        }
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
            // Find options by ID instead of index (since Back is now first)
            const scrollSpeedOption = this.menus.settings.find(opt => opt.id === 'scroll-speed');
            const blinkThresholdOption = this.menus.settings.find(opt => opt.id === 'blink-threshold');
            if (scrollSpeedOption) {
                scrollSpeedOption.value = `${this.scrollSpeed.toFixed(1)}s`;
            }
            if (blinkThresholdOption) {
                blinkThresholdOption.value = `${this.blinkThreshold.toFixed(1)}s`;
            }
        }
    }
    
    updateMinesweeperSettingsMenu() {
        if (this.menus['minesweeper-settings']) {
            const focusAreaSizeOption = this.menus['minesweeper-settings'].find(opt => opt.id === 'focus-area-size');
            if (focusAreaSizeOption) {
                focusAreaSizeOption.value = `${this.focusAreaSize}x${this.focusAreaSize}`;
            }
        }
    }
    
    decreaseFocusAreaSize() {
        if (this.focusAreaSize > 3) {
            // Decrease by 2 (3x3, 5x5, 7x7, 9x9)
            this.focusAreaSize -= 2;
            this.updateValueDisplay();
            this.updateDisabledStates();
            this.saveSettings();
        }
    }
    
    increaseFocusAreaSize() {
        if (this.focusAreaSize < 9) {
            // Increase by 2 (3x3, 5x5, 7x7, 9x9)
            this.focusAreaSize += 2;
            this.updateValueDisplay();
            this.updateDisabledStates();
            this.saveSettings();
        }
    }
    
    updateDisabledStates() {
        if (this.currentMenu === 'minesweeper-focus-area-size' || 
            this.currentMenu === 'scroll-speed' || 
            this.currentMenu === 'blink-threshold') {
            const menuOptions = document.getElementById('menu-options');
            if (!menuOptions) return;
            
            let currentValue;
            if (this.currentMenu === 'minesweeper-focus-area-size') {
                currentValue = this.focusAreaSize;
            } else if (this.currentMenu === 'scroll-speed') {
                currentValue = this.scrollSpeed;
            } else if (this.currentMenu === 'blink-threshold') {
                currentValue = this.blinkThreshold;
            }
            
            // Update decrease button
            const decreaseEl = menuOptions.querySelector('[data-id="decrease"]');
            if (decreaseEl) {
                let shouldDisable = false;
                if (this.currentMenu === 'minesweeper-focus-area-size') {
                    shouldDisable = currentValue <= 3;
                } else {
                    shouldDisable = currentValue <= 0.1;
                }
                
                if (shouldDisable) {
                    decreaseEl.style.opacity = '0.5';
                    decreaseEl.style.pointerEvents = 'none';
                    decreaseEl.dataset.disabled = 'true';
                    const decreaseOption = this.options.find(opt => opt.id === 'decrease');
                    if (decreaseOption) decreaseOption.disabled = true;
                } else {
                    decreaseEl.style.opacity = '1';
                    decreaseEl.style.pointerEvents = 'auto';
                    decreaseEl.dataset.disabled = 'false';
                    const decreaseOption = this.options.find(opt => opt.id === 'decrease');
                    if (decreaseOption) decreaseOption.disabled = false;
                }
            }
            
            // Update increase button
            const increaseEl = menuOptions.querySelector('[data-id="increase"]');
            if (increaseEl) {
                let shouldDisable = false;
                if (this.currentMenu === 'minesweeper-focus-area-size') {
                    shouldDisable = currentValue >= 9;
                }
                
                if (shouldDisable) {
                    increaseEl.style.opacity = '0.5';
                    increaseEl.style.pointerEvents = 'none';
                    increaseEl.dataset.disabled = 'true';
                    const increaseOption = this.options.find(opt => opt.id === 'increase');
                    if (increaseOption) increaseOption.disabled = true;
                } else {
                    increaseEl.style.opacity = '1';
                    increaseEl.style.pointerEvents = 'auto';
                    increaseEl.dataset.disabled = 'false';
                    const increaseOption = this.options.find(opt => opt.id === 'increase');
                    if (increaseOption) increaseOption.disabled = false;
                }
            }
            
            // Update highlight after state changes
            this.updateHighlight();
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
        } else {
            // If stack is empty, go to main menu
            this.currentMenu = 'main';
            this.renderMenu();
        }
        this.resetBlinkState();
    }
    
    startMinesweeperGame() {
        // Try to load saved game state first
        const savedGameState = this.loadGameState();
        
        if (savedGameState && this.selectedDifficulty === savedGameState.difficulty && 
            this.selectedBoardSize === savedGameState.boardSize) {
            // Load saved game
            this.minesweeperGame = new MinesweeperEngine(
                savedGameState.difficulty,
                savedGameState.boardSize
            );
            
            // Restore game state
            this.minesweeperGame.board = savedGameState.board;
            this.minesweeperGame.revealed = savedGameState.revealed;
            this.minesweeperGame.flagged = savedGameState.flagged;
            this.minesweeperGame.mines = savedGameState.mines;
            this.minesweeperGame.gameOver = savedGameState.gameOver;
            this.minesweeperGame.won = savedGameState.won;
            this.minesweeperGame.firstMine = savedGameState.firstMine;
            
            // Restore play area if saved
            if (savedGameState.playAreaStartRow !== null) {
                this.playAreaStartRow = savedGameState.playAreaStartRow;
                this.playAreaEndRow = savedGameState.playAreaEndRow;
                this.playAreaStartCol = savedGameState.playAreaStartCol;
                this.playAreaEndCol = savedGameState.playAreaEndCol;
                this.lastActionRow = savedGameState.lastActionRow;
                this.lastActionCol = savedGameState.lastActionCol;
            } else {
                // Initialize play area to focus area size centered on the board
                const boardState = this.minesweeperGame.getBoardState();
                const centerRow = Math.floor(boardState.rows / 2);
                const centerCol = Math.floor(boardState.cols / 2);
                const playArea = this.calculatePlayArea(centerRow, centerCol, boardState.rows, boardState.cols);
                this.playAreaStartRow = playArea.startRow;
                this.playAreaEndRow = playArea.endRow;
                this.playAreaStartCol = playArea.startCol;
                this.playAreaEndCol = playArea.endCol;
                this.lastActionRow = centerRow;
                this.lastActionCol = centerCol;
            }
        } else {
            // Initialize new game engine
            this.minesweeperGame = new MinesweeperEngine(
                this.selectedDifficulty,
                this.selectedBoardSize
            );
            
            // Initialize play area to focus area size centered on the board
            const boardState = this.minesweeperGame.getBoardState();
            const centerRow = Math.floor(boardState.rows / 2);
            const centerCol = Math.floor(boardState.cols / 2);
            const playArea = this.calculatePlayArea(centerRow, centerCol, boardState.rows, boardState.cols);
            this.playAreaStartRow = playArea.startRow;
            this.playAreaEndRow = playArea.endRow;
            this.playAreaStartCol = playArea.startCol;
            this.playAreaEndCol = playArea.endCol;
            this.lastActionRow = centerRow;
            this.lastActionCol = centerCol;
        }
        
        // Enter game mode
        this.minesweeperMode = true;
        // For 3x3 areas with active play area, start in square-selection mode; otherwise row-selection
        this.gameMode = 'row-selection';
        this.selectedRow = null;
        this.selectedCol = null;
        this.currentMenu = 'minesweeper-game';
        this.currentIndex = 0;
        
        // For 3x3 areas with active play area, use square-selection mode
        if (this.focusAreaSize === 3 && this.playAreaStartRow !== null) {
            this.gameMode = 'square-selection';
        }
        
        // Mark game as in progress
        this.gameInProgress = true;
        
        // Clear menu stack for game
        this.menuStack = [];
        
        // Render game board
        this.renderMinesweeperGame();
    }
    
    saveGameState() {
        if (!this.minesweeperGame) return;
        
        const boardState = this.minesweeperGame.getBoardState();
        
        // Don't save if game is finished
        if (boardState.gameOver) return;
        
        const gameState = {
            difficulty: this.selectedDifficulty,
            boardSize: this.selectedBoardSize,
            board: boardState.board,
            revealed: boardState.revealed,
            flagged: boardState.flagged,
            mines: this.minesweeperGame.mines, // Get mines array directly from engine
            gameOver: boardState.gameOver,
            won: boardState.won,
            firstMine: this.minesweeperGame.firstMine,
            playAreaStartRow: this.playAreaStartRow,
            playAreaEndRow: this.playAreaEndRow,
            playAreaStartCol: this.playAreaStartCol,
            playAreaEndCol: this.playAreaEndCol,
            lastActionRow: this.lastActionRow,
            lastActionCol: this.lastActionCol
        };
        
        localStorage.setItem('minesweeperGameState', JSON.stringify(gameState));
    }
    
    loadGameState() {
        const savedState = localStorage.getItem('minesweeperGameState');
        if (!savedState) return null;
        
        try {
            return JSON.parse(savedState);
        } catch (e) {
            console.error('Failed to load game state:', e);
            return null;
        }
    }
    
    // Calculate play area (focus area size) centered on a square, keeping within board bounds
    calculatePlayArea(centerRow, centerCol, boardRows, boardCols) {
        const size = this.focusAreaSize;
        const halfSize = Math.floor(size / 2);
        
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
        
        if (this.gameMode === 'square-selection') {
            // For 3x3 areas: highlight square by square
            selectedStartRow = selectionAreaStartRow;
            selectedEndRow = selectionAreaEndRow;
            selectedStartCol = selectionAreaStartCol;
            selectedEndCol = selectionAreaEndCol;
            
            // Get available squares and board actions
            const availableSquares = this.getAvailableSquares(boardState);
            const boardActionsCount = this.boardActions ? this.boardActions.length : 0;
            const totalOptions = availableSquares.length + boardActionsCount;
            
            // Ensure currentIndex is within bounds
            if (this.currentIndex >= totalOptions) {
                this.currentIndex = 0;
            }
            
            // Check if we're highlighting a square or a board action
            if (this.currentIndex < availableSquares.length) {
                // Highlighting a square
                const highlightedSquare = availableSquares[this.currentIndex];
                highlightedStartRow = highlightedSquare.row;
                highlightedEndRow = highlightedSquare.row;
                highlightedStartCol = highlightedSquare.col;
                highlightedEndCol = highlightedSquare.col;
            } else {
                // Highlighting a board action (Zoom Out or Exit Game)
                // Clear square highlight
                highlightedStartRow = null;
                highlightedEndRow = null;
                highlightedStartCol = null;
                highlightedEndCol = null;
            }
        } else if (this.gameMode === 'row-selection') {
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
                // Highlighting a row
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
            
            // Update highlights will be done after DOM is updated
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
        
        // Update highlights on board actions after DOM is updated
        requestAnimationFrame(() => {
            if (this.gameMode === 'square-selection') {
                const availableSquares = this.getAvailableSquares(boardState);
                if (this.currentIndex >= availableSquares.length) {
                    // Highlighting a board action (Zoom Out or Exit Game)
                    const actionIndex = this.currentIndex - availableSquares.length;
                    // Find board actions in the DOM
                    const actionEls = document.querySelectorAll('#board-actions .menu-option');
                    // Highlight the action at the actionIndex
                    actionEls.forEach((el, idx) => {
                        if (idx === actionIndex) {
                            el.classList.add('highlighted');
                        } else {
                            el.classList.remove('highlighted');
                        }
                    });
                } else {
                    // Highlighting a square - clear board action highlights
                    const actionEls = document.querySelectorAll('#board-actions .menu-option');
                    actionEls.forEach((el) => {
                        el.classList.remove('highlighted');
                    });
                }
            } else if (this.gameMode === 'row-selection') {
                const availableRows = this.getAvailableRows(boardState);
                if (this.currentIndex >= availableRows.length) {
                    // Highlighting a board action (Zoom Out or Exit Game)
                    const actionIndex = this.currentIndex - availableRows.length;
                    // Find board actions in the DOM
                    const actionEls = document.querySelectorAll('#board-actions .menu-option');
                    // Highlight the action at the actionIndex
                    actionEls.forEach((el, idx) => {
                        if (idx === actionIndex) {
                            el.classList.add('highlighted');
                        } else {
                            el.classList.remove('highlighted');
                        }
                    });
                } else {
                    // Highlighting a row - clear board action highlights
                    const actionEls = document.querySelectorAll('#board-actions .menu-option');
                    actionEls.forEach((el) => {
                        el.classList.remove('highlighted');
                    });
                }
            }
        });
        
        // Start auto-scroll for board-based selection
        this.startGameAutoScroll();
    }
    
    
    renderBoardActions(container, boardState) {
        // Create actions container below board
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'minesweeper-board-actions';
        actionsContainer.id = 'board-actions';
        
        // Show Zoom Out when 5x5 play area is active, Exit Game when full board
        const hasPlayArea = this.playAreaStartRow !== null;
        
        // Create action options based on play area state
        const actionOptions = [];
        if (hasPlayArea) {
            // 5x5 selection area active: show only Zoom Out
            actionOptions.push({
                id: 'zoom-out',
                title: 'Zoom Out',
                isZoomOut: true
            });
        } else {
            // Full board selection: show only Exit Game
            actionOptions.push({
                id: 'exit-game',
                title: 'Exit Game',
                isExitGame: true
            });
        }
        
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
    
    getAvailableSquares(boardState) {
        // Get all unrevealed squares in the 3x3 play area
        const availableSquares = [];
        const startRow = this.playAreaStartRow !== null ? this.playAreaStartRow : 0;
        const endRow = this.playAreaEndRow !== null ? this.playAreaEndRow : boardState.rows - 1;
        const startCol = this.playAreaStartCol !== null ? this.playAreaStartCol : 0;
        const endCol = this.playAreaEndCol !== null ? this.playAreaEndCol : boardState.cols - 1;
        
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                if (!boardState.revealed[row][col]) {
                    availableSquares.push({ row, col });
                }
            }
        }
        return availableSquares;
    }
    
    startGameAutoScroll() {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
        }
        
        this.scrollInterval = setInterval(() => {
            if (!this.isSelecting && this.minesweeperMode) {
                if (this.gameMode === 'square-selection' || this.gameMode === 'row-selection' || this.gameMode === 'column-selection') {
                    // For board-based selection, just update the index and re-render
                    const boardState = this.minesweeperGame.getBoardState();
                if (this.gameMode === 'square-selection') {
                    // For 3x3 areas: scroll through squares
                    const availableSquares = this.getAvailableSquares(boardState);
                    const boardActionsCount = this.boardActions ? this.boardActions.length : 0;
                    const totalOptions = availableSquares.length + boardActionsCount;
                    if (totalOptions > 0) {
                        // Move to next option
                        this.currentIndex++;
                        if (this.currentIndex >= totalOptions) {
                            // After last board action, loop back to first square
                            this.currentIndex = 0;
                        }
                        // Re-render to update highlights
                        this.renderMinesweeperGame();
                    }
                } else if (this.gameMode === 'row-selection') {
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
                        // Re-render to update highlights
                        this.renderMinesweeperGame();
                    }
                } else if (this.gameMode === 'column-selection') {
                    // If we're currently acting on a column (blinking), don't auto-scroll
                    if (this.isSelecting && this.actionColumn !== null) {
                        return; // Don't auto-scroll when acting on a column
                    }
                    const availableCols = this.getAvailableColumns(boardState, this.selectedRow);
                    if (availableCols.length > 0) {
                        // Move to next column
                        this.currentIndex++;
                        if (this.currentIndex >= availableCols.length) {
                            // After last column, check if we've completed a full cycle without any action
                            if (this.columnSelectionStartIndex !== null) {
                                // We've scrolled through all columns without any action - reset to row selection
                                this.resetRowSelection();
                                return;
                            }
                            // Loop back to first
                            this.currentIndex = 0;
                        }
                        this.renderMinesweeperGame();
                    } else {
                        // No available columns - reset to row selection
                        this.resetRowSelection();
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
    
    resetRowSelection() {
        this.selectedRow = null;
        this.selectedCol = null;
        this.actionColumn = null;
        this.columnSelectionStartIndex = null;
        // For 3x3 areas with active play area, use square-selection mode; otherwise use row-selection
        if (this.focusAreaSize === 3 && this.playAreaStartRow !== null) {
            this.gameMode = 'square-selection';
        } else {
            this.gameMode = 'row-selection';
        }
        
        // Set currentIndex to the first row in the play area (top of 5x5)
        if (this.minesweeperGame) {
            const boardState = this.minesweeperGame.getBoardState();
            const availableRows = this.getAvailableRows(boardState);
            if (availableRows.length > 0) {
                // Find the first row in the play area
                const playAreaStartRow = this.playAreaStartRow !== null ? this.playAreaStartRow : 0;
                // Find the index of the first available row that is >= playAreaStartRow
                const firstRowIndex = availableRows.findIndex(row => row >= playAreaStartRow);
                this.currentIndex = firstRowIndex >= 0 ? firstRowIndex : 0;
            } else {
                this.currentIndex = 0;
            }
        } else {
            this.currentIndex = 0;
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
        if (this.minesweeperMode && (this.gameMode === 'square-selection' || this.gameMode === 'row-selection' || this.gameMode === 'column-selection')) {
            // Check if we're in square-selection mode (3x3 areas)
            if (this.gameMode === 'square-selection') {
                const boardState = this.minesweeperGame.getBoardState();
                const availableSquares = this.getAvailableSquares(boardState);
                
                // Check if we're blinking on a highlighted square (not a board action)
                if (this.currentIndex < availableSquares.length) {
                    const highlightedSquare = availableSquares[this.currentIndex];
                    const squareState = this.minesweeperGame.getSquareState(highlightedSquare.row, highlightedSquare.col);
                    
                    // Use blink threshold for hold time to mine
                    const holdTime = this.blinkThreshold;
                    const flagToggleThreshold = 1/3; // Toggle flag at 1/3 of hold time
                    
                    // Store the square we're acting on
                    this.actionSquare = highlightedSquare;
                    this.flagToggled = false; // Reset flag toggle state
                    
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
                        
                        // Toggle flag when we pass 50% threshold (only once)
                        // Re-check square state in case it changed
                        const currentSquareState = this.minesweeperGame.getSquareState(highlightedSquare.row, highlightedSquare.col);
                        if (!this.flagToggled && this.selectionProgress >= flagToggleThreshold && !currentSquareState.revealed) {
                            this.minesweeperGame.toggleFlag(highlightedSquare.row, highlightedSquare.col);
                            this.flagToggled = true;
                            // Autosave game state after board modification
                            this.saveGameState();
                            // Re-render immediately to show the flag change
                            this.renderMinesweeperGame();
                        }
                        
                        // Update progress fill on highlighted area
                        this.updateHighlightedAreaProgress(this.selectionProgress);
                        
                        if (this.selectionProgress >= 1) {
                            // Complete blink on highlighted square - perform mine action
                            const mineRow = this.actionSquare.row;
                            const mineCol = this.actionSquare.col;
                            this.cancelSelection();
                            this.handleMineActionOnSquare(mineRow, mineCol);
                            this.resetBlinkState();
                        } else {
                            this.selectionAnimationFrame = requestAnimationFrame(animate);
                        }
                    };
                    
                    this.selectionAnimationFrame = requestAnimationFrame(animate);
                    return;
                }
            }
            
            // Check if we're in column-selection mode and have a highlighted column
            if (this.gameMode === 'column-selection' && this.selectedRow !== null) {
                const boardState = this.minesweeperGame.getBoardState();
                const availableCols = this.getAvailableColumns(boardState, this.selectedRow);
                
                // Check if we're blinking on a highlighted column (not a selected column)
                if (this.currentIndex < availableCols.length) {
                    const highlightedCol = availableCols[this.currentIndex];
                    const squareState = this.minesweeperGame.getSquareState(this.selectedRow, highlightedCol);
                    
                    // Use blink threshold for hold time to mine
                    const holdTime = this.blinkThreshold;
                    const flagToggleThreshold = 1/3; // Toggle flag at 1/3 of hold time
                    
                    // Store the column we're acting on
                    this.actionColumn = highlightedCol;
                    this.flagToggled = false; // Reset flag toggle state
                    
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
                        
                        // Toggle flag when we pass 50% threshold (only once)
                        // Re-check square state in case it changed
                        const currentSquareState = this.minesweeperGame.getSquareState(this.selectedRow, highlightedCol);
                        if (!this.flagToggled && this.selectionProgress >= flagToggleThreshold && !currentSquareState.revealed) {
                            this.minesweeperGame.toggleFlag(this.selectedRow, highlightedCol);
                            this.flagToggled = true;
                            // Autosave game state after board modification
                            this.saveGameState();
                            // Re-render immediately to show the flag change
                            this.renderMinesweeperGame();
                        }
                        
                        // Update progress fill on highlighted area
                        this.updateHighlightedAreaProgress(this.selectionProgress);
                        
                        if (this.selectionProgress >= 1) {
                            // Complete blink on highlighted column - perform mine action
                            // Store actionColumn before cancelSelection clears it
                            const mineRow = this.selectedRow;
                            const mineCol = this.actionColumn;
                            this.cancelSelection();
                            this.handleMineActionOnColumn(mineRow, mineCol);
                            this.resetBlinkState();
                        } else {
                            this.selectionAnimationFrame = requestAnimationFrame(animate);
                        }
                    };
                    
                    this.selectionAnimationFrame = requestAnimationFrame(animate);
                    return;
                }
            }
            
            // Regular row/column/square/board action selection
            // Check if we're selecting a board action that needs special hold time
            let holdTime = this.blinkThreshold;
            const boardState = this.minesweeperGame.getBoardState();
            
            if (this.gameMode === 'square-selection') {
                const availableSquares = this.getAvailableSquares(boardState);
                if (this.currentIndex >= availableSquares.length && this.boardActions) {
                    // Selecting a board action
                    const actionIndex = this.currentIndex - availableSquares.length;
                    if (actionIndex < this.boardActions.length) {
                        const action = this.boardActions[actionIndex];
                        if (action.isExitGame) {
                            holdTime = this.exitGameHoldTime; // 2 seconds for Exit Game
                        }
                    }
                }
            } else if (this.gameMode === 'row-selection') {
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
            
            // Check if we're selecting a board action (Zoom Out or Exit Game)
            const isSelectingBoardAction = (this.gameMode === 'square-selection' || this.gameMode === 'row-selection') && 
                ((this.gameMode === 'square-selection' && this.currentIndex >= this.getAvailableSquares(boardState).length) ||
                 (this.gameMode === 'row-selection' && this.currentIndex >= this.getAvailableRows(boardState).length)) &&
                this.boardActions;
            
            if (isSelectingBoardAction) {
                // Selecting a board action - use menu option with progress indicator
                let actionIndex;
                if (this.gameMode === 'square-selection') {
                    actionIndex = this.currentIndex - this.getAvailableSquares(boardState).length;
                } else {
                    actionIndex = this.currentIndex - this.getAvailableRows(boardState).length;
                }
                
                // Use requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    const actionEls = document.querySelectorAll('#board-actions .menu-option');
                    // Find the action element at the actionIndex
                    let actionEl = null;
                    if (actionIndex < actionEls.length) {
                        actionEl = actionEls[actionIndex];
                    }
                    
                    if (actionEl) {
                        const progressFill = actionEl.querySelector('.progress-fill');
                        
                        if (!progressFill) {
                            // If no progress fill, still allow selection but without visual feedback
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
                                
                                if (this.selectionProgress >= 1) {
                                    // Selection complete
                                    this.cancelSelection();
                                    this.handleGameSelection();
                                    this.resetBlinkState();
                                } else {
                                    this.selectionAnimationFrame = requestAnimationFrame(animate);
                                }
                            };
                            
                            this.selectionAnimationFrame = requestAnimationFrame(animate);
                            return;
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
                            
                            if (this.selectionProgress >= 1) {
                                // Selection complete
                                this.cancelSelection();
                                this.handleGameSelection();
                                this.resetBlinkState();
                            } else {
                                this.selectionAnimationFrame = requestAnimationFrame(animate);
                            }
                        };
                        
                        this.selectionAnimationFrame = requestAnimationFrame(animate);
                    }
                });
                return;
            }
            
            // Board-based selection (rows/columns) - no progress indicator needed
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
        // Check if we were acting on a highlighted square/column and flag was toggled
        const wasActingOnSquare = this.minesweeperMode && 
            this.gameMode === 'square-selection' && 
            this.actionSquare !== null &&
            this.isSelecting;
        
        const wasActingOnColumn = this.minesweeperMode && 
            this.gameMode === 'column-selection' && 
            this.selectedRow !== null && 
            this.actionColumn !== null &&
            this.isSelecting;
        
        const actionSquare = this.actionSquare; // Store before resetting
        const actionCol = this.actionColumn; // Store before resetting
        const flagWasToggled = this.flagToggled; // Store before resetting
        
        this.isSelecting = false;
        this.selectionProgress = 0;
        this.actionColumn = null;
        this.actionSquare = null;
        this.flagToggled = false;
        
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
        
        // Also clear progress on board actions
        const boardActionEls = document.querySelectorAll('#board-actions .menu-option');
        boardActionEls.forEach(el => {
            const progressFill = el.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '0%';
            }
        });
        
        // Clear highlighted area progress
        this.updateHighlightedAreaProgress(0);
        
        // If flag was toggled and blink was released early, re-center play area on that square
        if (flagWasToggled) {
            if (wasActingOnSquare && actionSquare !== null) {
                // Re-center play area on the square where flag was toggled
                this.updatePlayAreaAfterAction(actionSquare.row, actionSquare.col);
                // Reset to square-selection mode
                this.gameMode = 'square-selection';
                this.currentIndex = 0;
                this.renderMinesweeperGame();
            } else if (wasActingOnColumn && actionCol !== null) {
                // Re-center play area on the column where flag was toggled
                this.updatePlayAreaAfterAction(this.selectedRow, actionCol);
                // Reset the cycle tracking since user took an action
                this.columnSelectionStartIndex = this.currentIndex;
                // Re-render to show the flag change and updated play area
                this.renderMinesweeperGame();
            }
        } else if (wasActingOnColumn && actionCol !== null) {
            // No flag was toggled, just reset cycle tracking
            this.columnSelectionStartIndex = this.currentIndex;
            this.renderMinesweeperGame();
        }
    }
    
    handleMineActionOnSquare(row, col) {
        // Handle mine action on a square (used for square-selection mode in 3x3 areas)
        const squareState = this.minesweeperGame.getSquareState(row, col);
        
        // If square is flagged (due to immediate toggle on blink start), unflag it before mining
        if (squareState.flagged) {
            this.minesweeperGame.toggleFlag(row, col);
        }
        
        // Set selected row/col for handleMineAction
        this.selectedRow = row;
        this.selectedCol = col;
        
        // Perform mine action
        this.handleMineAction();
        
        // Update play area center after mining
        this.updatePlayAreaAfterAction(row, col);
        
        // Autosave game state after board modification (handleMineAction already handles gameOver case)
        const boardState = this.minesweeperGame.getBoardState();
        if (!boardState.gameOver) {
            this.saveGameState();
        }
        
        // Reset to appropriate selection mode
        if (this.focusAreaSize === 3 && this.playAreaStartRow !== null) {
            // For 3x3 with active play area, reset to square-selection mode
            this.gameMode = 'square-selection';
            this.currentIndex = 0;
        } else {
            // For larger areas or zoomed out, reset to row-selection
            this.resetRowSelection();
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
            // Game is finished - clear saved state
            localStorage.removeItem('minesweeperGameState');
            this.gameInProgress = false;
            
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
            
            // Autosave game state after board modification
            this.saveGameState();
            
            // Re-render board and return to row selection
            // (resetRowSelection will clear columnSelectionStartIndex)
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
