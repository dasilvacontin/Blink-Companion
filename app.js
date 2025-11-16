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
const DEFAULT_EAR_THRESHOLD = 0.15; // Lower default for better mobile detection
const DEFAULT_SCROLL_SPEED = 0.7; // seconds
const DEFAULT_BLINK_THRESHOLD = 1.0; // seconds

class MenuApp {
    constructor() {
        this.currentMenu = 'lock';
        this.menuStack = [];
        this.options = [];
        this.currentIndex = 0;
        this.scrollSpeed = DEFAULT_SCROLL_SPEED;
        this.blinkThreshold = DEFAULT_BLINK_THRESHOLD;
        this.earThresholdLeft = DEFAULT_EAR_THRESHOLD; // Configurable EAR threshold for left eye (user's left)
        this.earThresholdRight = DEFAULT_EAR_THRESHOLD; // Configurable EAR threshold for right eye (user's right)
        
        // Minesweeper setup state
        this.selectedDifficulty = null;
        this.selectedBoardSize = null;
        this.minesweeperGame = null;
        this.minesweeperMode = false; // Whether we're in game mode
        this.gameMode = 'row-selection'; // 'row-selection', 'column-selection', 'square-selection', 'game-over'
        this.confettiInstance = null; // Confetti instance for win celebrations
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
        this.BLINK_DEBOUNCE_TIME = 200; // Milliseconds eyes must be closed before registering as blink start (configurable)
        this.blinkDebounceSeconds = 0.2; // UI setting in seconds; mirrored to BLINK_DEBOUNCE_TIME
        this.firstItemWaitSeconds = 0.5; // Extra dwell time on first selectable item after actions
        this.pendingFirstItemWait = false; // Apply first-item wait only once after an action/navigation
        
        // SOS Pattern state (for lock screen)
        this.sosPattern = [0.2, 0.2, 0.2, 1.0, 1.0, 1.0, 0.2, 0.2, 0.2]; // short, short, short, long, long, long, short, short, short
        this.sosStep = 0; // Current step in pattern (0-8)
        this.sosBlinkStartTime = null; // When current blink started
        this.sosBlinkDuration = 0; // Duration of current blink
        this.isLocked = true; // Whether app is locked - start locked
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
        
        // Debug mode - check URL for ?debug parameter
        this.debugMode = this.isDebugMode();
        
        // Check if we should skip the lock screen (for development)
        const shouldSkipLockscreen = this.shouldSkipLockscreen();
        if (shouldSkipLockscreen) {
            this.currentMenu = 'main';
            this.isLocked = false;
        }
        
        // Calibration state
        this.isCalibrating = false;
        this.calibrationStep = 0;
        this.calibrationData = {
            bothEyesOpen: [],
            leftEyeClosed: [],
            leftEyeOpen: [],
            rightEyeClosed: [],
            rightEyeOpen: []
        };
        this.calibrationTimer = null;
        this.calibrationStartTime = null;
        this.calibrationStepDuration = 5000; // 5 seconds per step
        
        // Load settings
        this.loadSettings();
        
        // Initialize
        this.initializeMenus();
        this.renderMenu();
        this.startAutoScroll();
        this.waitForMediaPipe();
    }
    
    isDebugMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('debug');
    }
    
    shouldSkipLockscreen() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('skipLockscreen');
    }
    
    triggerMinesweeperConfetti() {
        // Trigger confetti celebration when winning Minesweeper
        try {
            // Use canvas-confetti library (more reliable and well-documented)
            if (typeof confetti !== 'undefined') {
                // Trigger confetti from multiple positions for better effect
                const duration = 3000; // 3 seconds
                const end = Date.now() + duration;
                
                const interval = setInterval(() => {
                    if (Date.now() > end) {
                        clearInterval(interval);
                        return;
                    }
                    
                    // Confetti from left
                    confetti({
                        particleCount: 2,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
                    });
                    
                    // Confetti from right
                    confetti({
                        particleCount: 2,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
                    });
                }, 25);
                
                // Also trigger a big burst from center
                confetti({
                    particleCount: 50,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
                });
                
                console.log('Confetti triggered successfully!');
            } else if (typeof window.confetti !== 'undefined') {
                // Try window.confetti
                window.confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                console.log('Confetti triggered (window.confetti)!');
            } else {
                console.error('Confetti library not loaded. Available:', {
                    'confetti': typeof confetti,
                    'window.confetti': typeof window.confetti
                });
            }
        } catch (error) {
            console.error('Error triggering confetti:', error);
        }
    }
    
    loadSettings() {
        const savedScrollSpeed = localStorage.getItem('scrollSpeed');
        const savedBlinkThreshold = localStorage.getItem('blinkThreshold');
        const savedFocusAreaSize = localStorage.getItem('focusAreaSize');
        const savedEarThresholdLeft = localStorage.getItem('earThresholdLeft');
        const savedEarThresholdRight = localStorage.getItem('earThresholdRight');
        const savedEarThreshold = localStorage.getItem('earThreshold'); // Legacy support
        const savedBlinkDebounceSeconds = localStorage.getItem('blinkDebounceSeconds');
        const savedFirstItemWaitSeconds = localStorage.getItem('firstItemWaitSeconds');
        
        if (savedScrollSpeed) {
            this.scrollSpeed = parseFloat(savedScrollSpeed);
        }
        if (savedBlinkThreshold) {
            this.blinkThreshold = parseFloat(savedBlinkThreshold);
        }
        if (savedFocusAreaSize) {
            this.focusAreaSize = parseInt(savedFocusAreaSize, 10);
        }
        if (savedEarThresholdLeft) {
            this.earThresholdLeft = parseFloat(savedEarThresholdLeft);
        }
        if (savedEarThresholdRight) {
            this.earThresholdRight = parseFloat(savedEarThresholdRight);
        }
        // Legacy support: if old single threshold exists but not the new ones, use it for both
        if (savedEarThreshold && !savedEarThresholdLeft && !savedEarThresholdRight) {
            const legacyThreshold = parseFloat(savedEarThreshold);
            this.earThresholdLeft = legacyThreshold;
            this.earThresholdRight = legacyThreshold;
        }
        if (savedBlinkDebounceSeconds) {
            this.blinkDebounceSeconds = parseFloat(savedBlinkDebounceSeconds);
            if (!isNaN(this.blinkDebounceSeconds) && this.blinkDebounceSeconds > 0) {
                this.BLINK_DEBOUNCE_TIME = Math.round(this.blinkDebounceSeconds * 1000);
            }
        } else {
            // Ensure ms mirror is in sync with default seconds
            this.BLINK_DEBOUNCE_TIME = Math.round(this.blinkDebounceSeconds * 1000);
        }
        if (savedFirstItemWaitSeconds) {
            const v = parseFloat(savedFirstItemWaitSeconds);
            if (!isNaN(v)) this.firstItemWaitSeconds = v;
        }
    }
    
    saveSettings() {
        localStorage.setItem('scrollSpeed', this.scrollSpeed.toString());
        localStorage.setItem('blinkThreshold', this.blinkThreshold.toString());
        localStorage.setItem('focusAreaSize', this.focusAreaSize.toString());
        localStorage.setItem('earThresholdLeft', this.earThresholdLeft.toString());
        localStorage.setItem('earThresholdRight', this.earThresholdRight.toString());
        localStorage.setItem('blinkDebounceSeconds', this.blinkDebounceSeconds.toString());
        localStorage.setItem('firstItemWaitSeconds', this.firstItemWaitSeconds.toString());
    }
    
    initializeMenus() {
        this.menus = {
            main: [
                { id: 'lock', title: 'Rest', subtitle: 'Lock the app to rest' },
                { id: 'write', title: 'Write', subtitle: 'with predictive assistance' },
                { id: 'minesweeper', title: 'Play Minesweeper' },
                { id: 'settings', title: 'Settings' }
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
                { id: 'blink-debounce', title: 'Blink debounce', subtitle: 'Minimum time eyes must be closed to start a blink', value: '' },
                { id: 'blink-threshold', title: 'Blink threshold', subtitle: 'Amount of time a blink must last to be recognised as a blink.', value: '' },
                { id: 'scroll-speed', title: 'Scroll Speed', subtitle: 'Amount of time the cursor spends on each option', value: '' },
                { id: 'first-item-wait', title: 'First-Item Wait', subtitle: 'Extra time the cursor waits on the first item after actions', value: '' }
            ],
            debug: [
                { id: 'back', title: 'Back', subtitle: '' },
                { id: 'trigger-confetti', title: 'Trigger Confetti', subtitle: 'Test the confetti celebration effect' }
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
        
        // Add/remove debug option from settings menu based on debug mode
        if (this.currentMenu === 'settings' && this.menus.settings) {
            const hasDebugOption = this.menus.settings.some(opt => opt.id === 'debug');
            if (this.debugMode && !hasDebugOption) {
                // Add debug option if in debug mode and it doesn't exist
                this.menus.settings.push({ id: 'debug', title: 'Debug', subtitle: 'Debug tools and options' });
            } else if (!this.debugMode && hasDebugOption) {
                // Remove debug option if not in debug mode
                this.menus.settings = this.menus.settings.filter(opt => opt.id !== 'debug');
            }
        }
        
        // Get options for current menu
        this.options = this.menus[this.currentMenu] || [];
        this.currentIndex = 0;
        
        // Determine title text
        let titleText = '';
        if (this.currentMenu === 'scroll-speed') {
            titleText = 'Settings / Scroll Speed';
        } else if (this.currentMenu === 'first-item-wait') {
            titleText = 'Settings / First-Item Wait';
        } else if (this.currentMenu === 'blink-threshold') {
            titleText = 'Settings / Blink threshold';
        } else if (this.currentMenu === 'blink-debounce') {
            titleText = 'Settings / Blink debounce';
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
                'debug': 'Debug',
                'lock': 'Rest'
            };
            titleText = titleMap[this.currentMenu] || 'Menu';
        }
        
        // Special handling for calibration screen
        if (this.isCalibrating) {
            // Hide camera overlay during calibration (even in debug mode)
            const cameraOverlay = document.getElementById('camera-overlay');
            if (cameraOverlay) {
                cameraOverlay.classList.add('hidden');
            }
            // Don't render normal menu when calibrating
            return;
        }
        
        // Special handling for lock screen - use LockScreen component
        if (this.currentMenu === 'lock' || this.isLocked) {
            // Always hide camera overlay (never show video feed)
            const cameraOverlay = document.getElementById('camera-overlay');
            if (cameraOverlay) {
                cameraOverlay.classList.add('hidden');
            }
            
            // Check if lock screen already exists
            const existingLockScreen = document.querySelector('.lock-screen');
            if (!existingLockScreen) {
                // Clear menu container and show lock screen
                const app = document.getElementById('app');
                const menuContainerEl = document.getElementById('menu-container');
                if (menuContainerEl) {
                    menuContainerEl.innerHTML = '';
                    const lockScreen = createLockScreen({ patternProgress: [], showDebug: this.debugMode });
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
            
            // Add click handler for calibrate button
            setTimeout(() => {
                const calibrateButton = document.getElementById('calibrate-blink-button');
                if (calibrateButton && !calibrateButton.hasAttribute('data-listener-added')) {
                    calibrateButton.setAttribute('data-listener-added', 'true');
                    calibrateButton.addEventListener('click', () => this.startCalibration());
                }
            }, 100);
            
            return;
        }
        
        // Special handling for Writing Tool (simplified T9 keypad)
        if (this.currentMenu === 'write') {
            // Update title
            if (menuTitleEl) {
                // Remove title space entirely for writing tool
                const emptyTitle = document.createElement('div');
                emptyTitle.id = 'menu-title';
                menuTitleEl.replaceWith(emptyTitle);
            }
            
            // Clear options area
            menuOptions.innerHTML = '';
            
            // Wrapper
            const writingWrapper = document.createElement('div');
            writingWrapper.className = 'writing-tool';
            
            // Large text area
            const textArea = document.createElement('textarea');
            textArea.className = 'writing-textarea';
            textArea.id = 'writing-textarea';
            textArea.setAttribute('aria-label', 'Writing area');
            textArea.placeholder = 'Start typing...';
            writingWrapper.appendChild(textArea);
            
            // Keypad container
            const keypad = document.createElement('div');
            keypad.className = 'writing-keypad';
            
            // Prepare options mapping for blink navigation
            const optionsMap = [];
            
            // Helper to create a key button (selectable)
            const createKey = (label, output, id, extraClass = '') => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `menu-option key-button${extraClass ? ' ' + extraClass : ''}`;
                btn.dataset.id = id;
                
                // Progress fill
                const progressFill = document.createElement('div');
                progressFill.className = 'progress-fill';
                progressFill.style.width = '0%';
                
                // Content
                const content = document.createElement('div');
                content.className = 'menu-option-content';
                const titleEl = document.createElement('div');
                titleEl.className = 'menu-option-title';
                titleEl.textContent = label;
                content.appendChild(titleEl);
                
                btn.appendChild(progressFill);
                btn.appendChild(content);
                
                // Click support (for mouse/touch)
                btn.addEventListener('click', () => {
                    if (output === ' ') {
                        textArea.value += ' ';
                    } else {
                        textArea.value += output;
                    }
                    // Keep cursor at end and focus
                    textArea.focus();
                    textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
                });
                
                // Add to options list for blink selection
                optionsMap.push({ id, title: label, subtitle: '', output });
                return btn;
            };
            
            // Layout rows (omit suggestion row and bottom delete/action/exit)
            const rows = [
                [ ['space', ' ', 'key-space'], ['abc2', 'a', 'key-a'], ['def3', 'd', 'key-d'] ],
                [ ['ghi4', 'g', 'key-g'], ['jkl5', 'j', 'key-j'], ['mno6', 'm', 'key-m'] ],
                [ ['pqrs7', 'p', 'key-p'], ['tuv8', 't', 'key-t'], ['wxyz9', 'w', 'key-w'] ]
            ];
            
            rows.forEach(row => {
                const rowEl = document.createElement('div');
                rowEl.className = 'keypad-row';
                row.forEach(([label, out, id]) => {
                    rowEl.appendChild(createKey(label, out, id));
                });
                keypad.appendChild(rowEl);
            });
            
            // Bottom row: delete and exit (regular-size buttons)
            const bottomRow = document.createElement('div');
            bottomRow.className = 'keypad-row';
            bottomRow.appendChild(createKey('delete', '', 'delete'));
            bottomRow.appendChild(createKey('exit', '', 'exit'));
            keypad.appendChild(bottomRow);
            
            writingWrapper.appendChild(keypad);
            menuOptions.appendChild(writingWrapper);
            
            // Options array contains all keys including exit so blink navigation cycles through them
            this.options = optionsMap;
            // Assign dataset.index to each key in DOM order
            const optionEls = menuOptions.querySelectorAll('.menu-option');
            optionEls.forEach((el, index) => {
                el.dataset.index = index;
            });
            this.currentIndex = 0; // start from first key
            this.updateHighlight();
            return;
        }
        
        // Special handling for settings detail pages - use SettingsDetail component
        if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold' || this.currentMenu === 'minesweeper-focus-area-size' || this.currentMenu === 'blink-debounce' || this.currentMenu === 'first-item-wait') {
            let currentValue;
            if (this.currentMenu === 'scroll-speed') {
                currentValue = this.scrollSpeed;
            } else if (this.currentMenu === 'first-item-wait') {
                currentValue = this.firstItemWaitSeconds;
            } else if (this.currentMenu === 'blink-threshold') {
                currentValue = this.blinkThreshold;
            } else if (this.currentMenu === 'blink-debounce') {
                currentValue = this.blinkDebounceSeconds;
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
                isSettings: this.currentMenu === 'settings' || this.currentMenu === 'minesweeper-settings'
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
            clearTimeout(this.scrollInterval);
            this.scrollInterval = null;
        }
        
        const getSelectableIndices = () => {
            const selectable = [];
            this.options.forEach((opt, idx) => {
                if (opt.selectable === false || opt.disabled) return;
                selectable.push(idx);
            });
            return selectable;
        };
        
        const loop = () => {
            if (!this.isSelecting) {
                const selectableIndices = getSelectableIndices();
                if (selectableIndices.length > 0) {
                    let currentSelectableIdx = selectableIndices.indexOf(this.currentIndex);
                    if (currentSelectableIdx < 0) currentSelectableIdx = 0;
                    
                    // Move to next selectable
                    currentSelectableIdx = (currentSelectableIdx + 1) % selectableIndices.length;
                    this.currentIndex = selectableIndices[currentSelectableIdx];
                } else {
                    this.currentIndex = (this.currentIndex + 1) % this.options.length;
                }
                this.updateHighlight();
            }
            
            // Decide next delay. If we're on first selectable, add first-item wait.
            const selectableIndices = getSelectableIndices();
            const firstSelectable = selectableIndices.length > 0 ? selectableIndices[0] : 0;
            const isOnFirst = this.currentIndex === firstSelectable;
            const baseDelay = this.scrollSpeed * 1000;
            const shouldApplyExtra = isOnFirst && this.pendingFirstItemWait;
            const extra = shouldApplyExtra ? (this.firstItemWaitSeconds * 1000) : 0;
            // Consume the one-time extra wait if we used it
            if (shouldApplyExtra) {
                this.pendingFirstItemWait = false;
            }
            this.scrollInterval = setTimeout(loop, baseDelay + extra);
        };
        
        // Start immediately with the first delay (apply extra only if we're on the first selectable)
        const selectableAtStart = getSelectableIndices();
        const firstSelectableAtStart = selectableAtStart.length > 0 ? selectableAtStart[0] : 0;
        const initialShouldApplyExtra = (this.currentIndex === firstSelectableAtStart) && this.pendingFirstItemWait;
        const initialDelay = (this.scrollSpeed * 1000) + (initialShouldApplyExtra ? this.firstItemWaitSeconds * 1000 : 0);
        if (initialShouldApplyExtra) {
            // Consume first wait on initial run if applied
            this.pendingFirstItemWait = false;
        }
        this.scrollInterval = setTimeout(loop, initialDelay);
    }
    
    selectOption() {
        if (this.options.length === 0) return;
        
        // Handle Minesweeper game selections
        if (this.minesweeperMode) {
            this.handleGameSelection();
            return;
        }
        
        // Handle Writing Tool selections
        if (this.currentMenu === 'write') {
            const option = this.options[this.currentIndex];
            if (!option) return;
            if (option.id === 'exit') {
                this.navigateBack();
                return;
            } else if (option.id === 'delete') {
                const textArea = document.getElementById('writing-textarea');
                if (textArea && textArea.value.length > 0) {
                    textArea.value = textArea.value.slice(0, -1);
                    textArea.focus();
                    textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
                }
                this.currentIndex = 0;
                this.updateHighlight();
                return;
            }
            const textArea = document.getElementById('writing-textarea');
            if (textArea) {
                const output = option.output || '';
                textArea.value += output;
                textArea.focus();
                textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
            }
            // After triggering a key, reset cursor to the first option
            this.currentIndex = 0;
            this.updateHighlight();
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
        } else if (option.id === 'debug') {
            // Navigate to debug menu
            this.navigateTo('debug');
        } else if (option.id === 'trigger-confetti') {
            // Trigger confetti for testing
            this.triggerMinesweeperConfetti();
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
            if (option.id === 'exit-game') {
                // Clear game completely when exiting from game over
                this.minesweeperGame = null;
                this.gameInProgress = false;
                localStorage.removeItem('minesweeperGameState'); // Clear saved state
                this.exitMinesweeperGame();
            }
        }
    }
    
    handleMineAction() {
        // Don't allow actions if game is over
        if (this.gameMode === 'game-over') {
            return;
        }
        
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
            
            // Stop auto-scroll
            if (this.scrollInterval) {
                clearInterval(this.scrollInterval);
                this.scrollInterval = null;
            }
            
            if (result.won) {
                // Trigger confetti celebration
                this.triggerMinesweeperConfetti();
                
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
        // Don't allow actions if game is over
        if (this.gameMode === 'game-over') {
            return;
        }
        
        const result = this.minesweeperGame.toggleFlag(this.selectedRow, this.selectedCol);
        
        // Check if flagging resulted in a win
        if (result.gameOver && result.won) {
            // Trigger confetti celebration
            this.triggerMinesweeperConfetti();
            
            // Game is finished - clear saved state
            localStorage.removeItem('minesweeperGameState');
            this.gameInProgress = false;
            
            // Stop auto-scroll
            if (this.scrollInterval) {
                clearInterval(this.scrollInterval);
                this.scrollInterval = null;
            }
            
            // Handle win - show win menu
            this.gameMode = 'game-over';
            this.currentIndex = 0;
            this.renderMinesweeperGame();
            return;
        }
        
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
        } else if (this.currentMenu === 'blink-debounce') {
            this.blinkDebounceSeconds = Math.max(0.1, this.blinkDebounceSeconds - 0.1);
            this.BLINK_DEBOUNCE_TIME = Math.round(this.blinkDebounceSeconds * 1000);
            this.saveSettings();
            this.updateValueDisplay();
            this.updateDisabledStates();
        } else if (this.currentMenu === 'first-item-wait') {
            this.firstItemWaitSeconds = Math.max(0, this.firstItemWaitSeconds - 0.1);
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
        } else if (this.currentMenu === 'blink-debounce') {
            this.blinkDebounceSeconds += 0.1;
            this.BLINK_DEBOUNCE_TIME = Math.round(this.blinkDebounceSeconds * 1000);
            this.saveSettings();
            this.updateValueDisplay();
            this.updateDisabledStates();
        } else if (this.currentMenu === 'first-item-wait') {
            this.firstItemWaitSeconds += 0.1;
            this.saveSettings();
            this.updateValueDisplay();
            this.updateDisabledStates();
        }
        // Update settings menu values if we're going back to settings
        this.updateSettingsMenu();
    }
    
    updateValueDisplay() {
        // Update value display for settings detail pages without re-rendering entire menu
        if (this.currentMenu === 'scroll-speed' || this.currentMenu === 'blink-threshold' || this.currentMenu === 'minesweeper-focus-area-size' || this.currentMenu === 'blink-debounce' || this.currentMenu === 'first-item-wait') {
            let currentValue;
            if (this.currentMenu === 'scroll-speed') {
                currentValue = this.scrollSpeed;
            } else if (this.currentMenu === 'blink-threshold') {
                currentValue = this.blinkThreshold;
            } else if (this.currentMenu === 'first-item-wait') {
                currentValue = this.firstItemWaitSeconds;
            } else if (this.currentMenu === 'blink-debounce') {
                currentValue = this.blinkDebounceSeconds;
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
        // Apply first-item wait once upon entering a new menu
        this.pendingFirstItemWait = true;
        // Restart auto-scroll so the initial delay logic (with first-item wait) applies immediately
        this.startAutoScroll();
    }
    
    updateSettingsMenu() {
        if (this.menus.settings) {
            // Find options by ID instead of index (since Back is now first)
            const scrollSpeedOption = this.menus.settings.find(opt => opt.id === 'scroll-speed');
            const blinkThresholdOption = this.menus.settings.find(opt => opt.id === 'blink-threshold');
            const blinkDebounceOption = this.menus.settings.find(opt => opt.id === 'blink-debounce');
            const firstItemWaitOption = this.menus.settings.find(opt => opt.id === 'first-item-wait');
            if (scrollSpeedOption) {
                scrollSpeedOption.value = `${this.scrollSpeed.toFixed(1)}s`;
            }
            if (blinkThresholdOption) {
                blinkThresholdOption.value = `${this.blinkThreshold.toFixed(1)}s`;
            }
            if (blinkDebounceOption) {
                blinkDebounceOption.value = `${this.blinkDebounceSeconds.toFixed(1)}s`;
            }
            if (firstItemWaitOption) {
                firstItemWaitOption.value = `${this.firstItemWaitSeconds.toFixed(1)}s`;
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
            this.currentMenu === 'blink-threshold' ||
            this.currentMenu === 'blink-debounce') {
            const menuOptions = document.getElementById('menu-options');
            if (!menuOptions) return;
            
            let currentValue;
            if (this.currentMenu === 'minesweeper-focus-area-size') {
                currentValue = this.focusAreaSize;
            } else if (this.currentMenu === 'scroll-speed') {
                currentValue = this.scrollSpeed;
            } else if (this.currentMenu === 'blink-threshold') {
                currentValue = this.blinkThreshold;
            } else if (this.currentMenu === 'blink-debounce') {
                currentValue = this.blinkDebounceSeconds;
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
            this.navigateTo('main');
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
        // Apply first-item wait once after navigating back
        this.pendingFirstItemWait = true;
        // Ensure the new menu run starts its own auto-scroll cycle with initial delay
        this.startAutoScroll();
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
        
        // Determine win/loss status
        const statusText = boardState.won ? 'You won' : 'You lost';
        
        // Create menu options - only Exit Game (removed Play Again)
        const gameOverOptions = [
            {
                id: 'exit-game',
                title: `Exit Game (${statusText})`,
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
        
        // Don't start auto-scroll if game is over
        const boardState = this.minesweeperGame ? this.minesweeperGame.getBoardState() : null;
        if (boardState && boardState.gameOver) {
            return;
        }
        
        this.scrollInterval = setInterval(() => {
            if (!this.isSelecting && this.minesweeperMode) {
                // Check if game is over - if so, only allow menu scrolling, not board selections
                const currentBoardState = this.minesweeperGame ? this.minesweeperGame.getBoardState() : null;
                if (currentBoardState && currentBoardState.gameOver) {
                    // If game is over but we're in game-over menu mode, allow menu scrolling
                    if (this.gameMode === 'game-over') {
                        // Allow scrolling through game-over menu options
                        // This is handled below in the game-over section
                    } else {
                        // Game is over but not in game-over menu - stop auto-scroll
                        if (this.scrollInterval) {
                            clearInterval(this.scrollInterval);
                            this.scrollInterval = null;
                        }
                        return;
                    }
                }
                
                if (this.gameMode === 'square-selection' || this.gameMode === 'row-selection' || this.gameMode === 'column-selection') {
                    // Don't allow board selections if game is over
                    if (currentBoardState && currentBoardState.gameOver) {
                        return;
                    }
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
        
        // Custom selection behavior for Writing Tool
        if (this.currentMenu === 'write') {
            const optionEls = document.querySelectorAll('.menu-option');
            if (this.currentIndex < 0 || this.currentIndex >= optionEls.length) return;
            const optionEl = optionEls[this.currentIndex];
            const id = optionEl.dataset.id;
            const progressFill = optionEl.querySelector('.progress-fill');
            
            // Space: immediately insert a space and finish
            if (id === 'key-space' || id === 'space') {
                const textArea = document.getElementById('writing-textarea');
                if (textArea) {
                    textArea.value += ' ';
                    textArea.focus();
                    textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
                }
                this.cancelSelection();
                this.currentIndex = 0;
                this.updateHighlight();
                return;
            }
            
            // Determine character sequence for this key
            let characters = [];
            if (id === 'exit') {
                characters = []; // exit doesn't type characters
            } else if (id === 'delete') {
                characters = []; // handled specially below
            } else {
                const titleEl = optionEl.querySelector('.menu-option-title');
                const labelText = titleEl ? titleEl.textContent : '';
                // Include letters and numbers from the button label (e.g., "abc2")
                characters = (labelText.match(/[a-z0-9]/gi) || []).map(ch => ch.toLowerCase());
            }
            
            const textArea = document.getElementById('writing-textarea');
            let stepDuration = 0.5; // seconds per character step
            let totalSteps = Math.max(characters.length, id === 'exit' ? 1 : 0);
            // Exit should require 2 seconds to trigger fully
            if (id === 'exit') {
                totalSteps = Math.max(totalSteps, Math.ceil(2.0 / stepDuration)); // 4 steps of 0.5s each
            }
            const totalDuration = totalSteps * stepDuration;
            
            // Special handling for delete key: start acting after blinkThreshold; then every 0.5s delete another char
            if (id === 'delete') {
                this.isSelecting = true;
                this.selectionStartTime = Date.now();
                let nextDeleteTime = this.blinkThreshold; // first deletion after one threshold hold
                const deleteStep = this.blinkThreshold; // subsequent deletions every threshold duration
                
                const animateDelete = () => {
                    if (!this.isSelecting) {
                        this.cancelSelection();
                        return;
                    }
                    const elapsed = (Date.now() - this.selectionStartTime) / 1000;
                    
                    // Update progress fill: ramp up to threshold, then loop every 0.5s
                    if (progressFill) {
                        if (elapsed < this.blinkThreshold) {
                            progressFill.style.width = `${Math.min(elapsed / this.blinkThreshold, 1) * 100}%`;
                        } else {
                            const cycle = (elapsed - this.blinkThreshold) % deleteStep;
                            progressFill.style.width = `${(cycle / deleteStep) * 100}%`;
                        }
                    }
                    
                    if (elapsed >= nextDeleteTime) {
                        // Delete one character (if any)
                        if (textArea && textArea.value.length > 0) {
                            textArea.value = textArea.value.slice(0, -1);
                            textArea.focus();
                            textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
                        }
                        nextDeleteTime += deleteStep;
                    }
                    
                    this.selectionAnimationFrame = requestAnimationFrame(animateDelete);
                };
                
                this.selectionAnimationFrame = requestAnimationFrame(animateDelete);
                return;
            }
            
            // Insert first character immediately (if any)
            let insertedStartIndex = null;
            if (textArea && characters.length > 0) {
                textArea.value += characters[0];
                textArea.focus();
                textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
                insertedStartIndex = textArea.value.length - 1;
            }
            
            this.isSelecting = true;
            this.selectionStartTime = Date.now();
            let lastStepIndex = 0; // already applied step 0 if characters exist
            
            const animate = () => {
                if (!this.isSelecting) {
                    this.cancelSelection();
                    return;
                }
                
                const elapsed = (Date.now() - this.selectionStartTime) / 1000;
                
                // Update progress fill to match discrete steps
                if (progressFill && totalSteps > 0) {
                    const fill = Math.min(elapsed / totalDuration, 1) * 100;
                    progressFill.style.width = `${fill}%`;
                }
                
                // Determine current step (0-based)
                const currentStepIndex = Math.min(Math.floor(elapsed / stepDuration), Math.max(totalSteps - 1, 0));
                
                // If advanced to a new step, replace last typed character
                if (characters.length > 0 && currentStepIndex !== lastStepIndex && currentStepIndex < characters.length) {
                    if (insertedStartIndex !== null) {
                        const before = textArea.value.slice(0, insertedStartIndex);
                        const after = textArea.value.slice(insertedStartIndex + 1);
                        textArea.value = before + characters[currentStepIndex] + after;
                        textArea.focus();
                        textArea.selectionStart = textArea.selectionEnd = insertedStartIndex + 1;
                    }
                    lastStepIndex = currentStepIndex;
                }
                
                // Completion condition
                if (totalSteps > 0 && elapsed >= totalDuration) {
                    // For exit, trigger navigation when full
                    if (id === 'exit') {
                        this.cancelSelection();
                        this.navigateBack();
                        return;
                    }
                    // For character keys, nothing else to do (last character already shown)
                    this.cancelSelection();
                    // Reset cursor to first option
                    this.currentIndex = 0;
                    this.updateHighlight();
                    return;
                }
                
                this.selectionAnimationFrame = requestAnimationFrame(animate);
            };
            
            this.selectionAnimationFrame = requestAnimationFrame(animate);
            return;
        }
        
        // Handle game-over menu selections
        if (this.minesweeperMode && this.gameMode === 'game-over') {
            // Allow selections in game-over menu - this will fall through to menu option selection
            // Don't return early - let it proceed to menu option selection logic
        }
        
        // For board-based selection (row/column/square), we don't need progress indicators
        // The selection happens directly on the board
        if (this.minesweeperMode && (this.gameMode === 'square-selection' || this.gameMode === 'row-selection' || this.gameMode === 'column-selection')) {
            // Check if game is over - if so, don't allow board selections
            const currentBoardState = this.minesweeperGame ? this.minesweeperGame.getBoardState() : null;
            if (currentBoardState && currentBoardState.gameOver) {
                return; // Game is over - don't allow board selections
            }
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
                            const flagResult = this.minesweeperGame.toggleFlag(highlightedSquare.row, highlightedSquare.col);
                            this.flagToggled = true;
                            
                            // Check if flagging resulted in a win
                            if (flagResult.gameOver && flagResult.won) {
                                // Trigger confetti celebration
                                this.triggerMinesweeperConfetti();
                                
                                // Game is finished - clear saved state
                                localStorage.removeItem('minesweeperGameState');
                                this.gameInProgress = false;
                                
                                // Stop auto-scroll
                                if (this.scrollInterval) {
                                    clearInterval(this.scrollInterval);
                                    this.scrollInterval = null;
                                }
                                
                                // Cancel selection animation
                                this.cancelSelection();
                                
                                // Handle win - show win menu
                                this.gameMode = 'game-over';
                                this.currentIndex = 0;
                                this.renderMinesweeperGame();
                                this.resetBlinkState();
                                return;
                            }
                            
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
                            const flagResult = this.minesweeperGame.toggleFlag(this.selectedRow, highlightedCol);
                            this.flagToggled = true;
                            
                            // Check if flagging resulted in a win
                            if (flagResult.gameOver && flagResult.won) {
                                // Trigger confetti celebration
                                this.triggerMinesweeperConfetti();
                                
                                // Game is finished - clear saved state
                                localStorage.removeItem('minesweeperGameState');
                                this.gameInProgress = false;
                                
                                // Stop auto-scroll
                                if (this.scrollInterval) {
                                    clearInterval(this.scrollInterval);
                                    this.scrollInterval = null;
                                }
                                
                                // Cancel selection animation
                                this.cancelSelection();
                                
                                // Handle win - show win menu
                                this.gameMode = 'game-over';
                                this.currentIndex = 0;
                                this.renderMinesweeperGame();
                                this.resetBlinkState();
                                return;
                            }
                            
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
        
        // For Writing Tool, reset cursor to first button after any blink release
        if (this.currentMenu === 'write') {
            this.currentIndex = 0;
            this.updateHighlight();
        }
        
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
        // Don't allow actions if game is over
        if (this.gameMode === 'game-over') {
            return;
        }
        
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
        
        // Only continue if game is not over
        const boardState = this.minesweeperGame.getBoardState();
        if (boardState.gameOver) {
            return; // Game over - don't reset selection mode
        }
        
        // Update play area center after mining
        this.updatePlayAreaAfterAction(row, col);
        
        // Autosave game state after board modification
        this.saveGameState();
        
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
        // Don't allow actions if game is over
        if (this.gameMode === 'game-over') {
            return;
        }
        
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
            
            // Stop auto-scroll
            if (this.scrollInterval) {
                clearInterval(this.scrollInterval);
                this.scrollInterval = null;
            }
            
            if (result.won) {
                // Trigger confetti celebration
                this.triggerMinesweeperConfetti();
                
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
        // Note: MediaPipe's left/right is from camera perspective (mirrored)
        // So we use right threshold for MediaPipe's "right" (user's left eye)
        // and left threshold for MediaPipe's "left" (user's right eye)
        const leftClosed = this.earRight < this.earThresholdLeft; // User's left eye uses right EAR
        const rightClosed = this.earLeft < this.earThresholdRight; // User's right eye uses left EAR
        const leftOpen = this.earRight >= this.earThresholdLeft;
        const rightOpen = this.earLeft >= this.earThresholdRight;
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
        const OVERFILL_THRESHOLD = 1.0; // 1.0 seconds after full fill is a mistake
        
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
        
        // Always hide camera overlay when unlocked
        const cameraOverlay = document.getElementById('camera-overlay');
        if (cameraOverlay) {
            cameraOverlay.classList.add('hidden');
        }
        
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
            
            // Collect calibration data if calibrating
            if (this.isCalibrating) {
                this.collectCalibrationData();
                this.updateEyeCharts();
            }
            
            this.detectSingleEyeBlink();
            
            // Update debug info if on lock screen and in debug mode
            if ((this.currentMenu === 'lock' || this.isLocked) && this.debugMode) {
                this.updateDebugInfo(true);
            }
        } else {
            this.isWinking = false;
            this.winkingEye = null;
            this.cancelSelection();
            this.eyesWereOpen = false; // Reset when face not detected
            
            // Update debug info - no face detected
            if ((this.currentMenu === 'lock' || this.isLocked) && this.debugMode) {
                this.updateDebugInfo(false);
            }
        }
    }
    
    updateDebugInfo(faceDetected) {
        const debugContent = document.getElementById('debug-content');
        if (!debugContent) return;
        
        // Note: MediaPipe's left/right is from camera perspective (mirrored)
        // So we use right threshold for MediaPipe's "right" (user's left eye)
        // and left threshold for MediaPipe's "left" (user's right eye)
        const leftClosed = this.earRight < this.earThresholdLeft; // User's left eye uses right EAR
        const rightClosed = this.earLeft < this.earThresholdRight; // User's right eye uses left EAR
        const leftOpen = this.earRight >= this.earThresholdLeft;
        const rightOpen = this.earLeft >= this.earThresholdRight;
        const bothOpen = leftOpen && rightOpen;
        const anyEyeClosed = leftClosed || rightClosed;
        
        const debounceStatus = this.eyeClosedStartTime !== null 
            ? `Active (${Date.now() - this.eyeClosedStartTime}ms)`
            : 'Inactive';
        
        const debugItems = [
            { label: 'Face Detected', value: faceDetected ? 'Yes' : 'No', status: faceDetected ? 'success' : 'error' },
            { label: 'Left EAR', value: faceDetected ? this.earRight.toFixed(3) : 'N/A', status: leftClosed ? 'warning' : 'success' },
            { label: 'Right EAR', value: faceDetected ? this.earLeft.toFixed(3) : 'N/A', status: rightClosed ? 'warning' : 'success' },
            { label: 'Left Threshold', value: this.earThresholdLeft.toFixed(3), status: 'normal' },
            { label: 'Right Threshold', value: this.earThresholdRight.toFixed(3), status: 'normal' },
            { label: 'Left Eye', value: leftClosed ? 'CLOSED' : 'OPEN', status: leftClosed ? 'warning' : 'success' },
            { label: 'Right Eye', value: rightClosed ? 'CLOSED' : 'OPEN', status: rightClosed ? 'warning' : 'success' },
            { label: 'Both Eyes Open', value: bothOpen ? 'Yes' : 'No', status: bothOpen ? 'success' : 'warning' },
            { label: 'Any Eye Closed', value: anyEyeClosed ? 'Yes' : 'No', status: anyEyeClosed ? 'warning' : 'success' },
            { label: 'Is Winking', value: this.isWinking ? 'Yes' : 'No', status: this.isWinking ? 'warning' : 'success' },
            { label: 'Winking Eye', value: this.winkingEye || 'None', status: this.winkingEye ? 'warning' : 'success' },
            { label: 'Debounce Timer', value: debounceStatus, status: this.eyeClosedStartTime !== null ? 'warning' : 'success' },
            { label: 'Eyes Were Open', value: this.eyesWereOpen ? 'Yes' : 'No', status: this.eyesWereOpen ? 'success' : 'warning' },
            { label: 'SOS Step', value: `${this.sosStep}/8`, status: 'normal' },
            { label: 'Is Selecting', value: this.isSelecting ? 'Yes' : 'No', status: this.isSelecting ? 'warning' : 'success' },
        ];
        
        debugContent.innerHTML = '';
        debugItems.forEach(item => {
            const debugItem = document.createElement('div');
            debugItem.className = 'debug-item';
            
            const label = document.createElement('div');
            label.className = 'debug-label';
            label.textContent = item.label;
            
            const value = document.createElement('div');
            value.className = `debug-value ${item.status}`;
            value.textContent = item.value;
            
            debugItem.appendChild(label);
            debugItem.appendChild(value);
            debugContent.appendChild(debugItem);
        });
        
        // Add note about threshold adjustment
        const noteItem = document.createElement('div');
        noteItem.className = 'debug-item';
        noteItem.style.gridColumn = '1 / -1';
        noteItem.style.fontSize = '0.85rem';
        noteItem.style.fontStyle = 'italic';
        noteItem.style.color = 'var(--text-secondary)';
        noteItem.textContent = `Tip: Adjust thresholds in console: app.earThresholdLeft = 0.12; app.earThresholdRight = 0.13; app.saveSettings(); (then refresh)`;
        debugContent.appendChild(noteItem);
    }
    
    startCalibration() {
        this.isCalibrating = true;
        this.calibrationStep = 0;
        this.calibrationData = {
            bothEyesOpen: [],
            leftEyeClosed: [],
            leftEyeOpen: [],
            rightEyeClosed: [],
            rightEyeOpen: []
        };
        
        // Hide camera overlay during calibration (even in debug mode)
        const cameraOverlay = document.getElementById('camera-overlay');
        if (cameraOverlay) {
            cameraOverlay.classList.add('hidden');
        }
        
        this.renderCalibrationScreen();
    }
    
    collectCalibrationData() {
        if (!this.isCalibrating) return;
        
        const stepNames = ['bothEyesOpen', 'leftEyeClosed', 'leftEyeOpen', 'rightEyeClosed', 'rightEyeOpen'];
        const currentStepName = stepNames[this.calibrationStep];
        
        if (currentStepName && this.calibrationData[currentStepName]) {
            // Note: MediaPipe's left/right is from camera perspective (mirrored)
            // So we swap the values to match user's perspective
            // MediaPipe's "right" EAR = user's left eye
            // MediaPipe's "left" EAR = user's right eye
            this.calibrationData[currentStepName].push({
                leftEAR: this.earRight,  // Swap: MediaPipe's right = user's left
                rightEAR: this.earLeft,  // Swap: MediaPipe's left = user's right
                timestamp: Date.now()
            });
        }
    }
    
    renderCalibrationScreen() {
        // Ensure camera overlay is hidden during calibration
        const cameraOverlay = document.getElementById('camera-overlay');
        if (cameraOverlay) {
            cameraOverlay.classList.add('hidden');
        }
        
        const menuContainerEl = document.getElementById('menu-container');
        if (!menuContainerEl) return;
        
        const stepNames = [
            'Open both eyes',
            'Close your left eye',
            'Open your left eye',
            'Close your right eye',
            'Open your right eye'
        ];
        
        const currentStepName = stepNames[this.calibrationStep];
        const progress = this.calibrationStep / stepNames.length;
        
        menuContainerEl.innerHTML = '';
        menuContainerEl.className = 'calibration-screen';
        menuContainerEl.style.cssText = 'width: 100%; max-width: 600px;';

        const stepTitle = document.createElement('h2');
        stepTitle.className = 'calibration-step-title';
        stepTitle.textContent = currentStepName;
        stepTitle.style.cssText = 'font-size: 1.5rem; margin: 30px 0; text-align: center;';
        menuContainerEl.appendChild(stepTitle);
        
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'calibration-timer';
        timerDisplay.className = 'calibration-timer';
        timerDisplay.style.cssText = 'font-size: 3rem; text-align: center; margin: 20px 0; font-weight: bold;';
        menuContainerEl.appendChild(timerDisplay);
        
        // Eye charts container - only show in debug mode
        if (this.debugMode) {
            const chartsContainer = document.createElement('div');
            chartsContainer.className = 'calibration-charts';
            chartsContainer.style.cssText = `
                display: flex;
                gap: 20px;
                margin: 30px 0;
                justify-content: space-around;
            `;
            
            // Left eye chart
            const leftEyeChart = this.createEyeChart('left');
            chartsContainer.appendChild(leftEyeChart);
            
            // Right eye chart
            const rightEyeChart = this.createEyeChart('right');
            chartsContainer.appendChild(rightEyeChart);
            
            menuContainerEl.appendChild(chartsContainer);
        }
        
        this.startCalibrationStep();
    }
    
    createEyeChart(eye) {
        const chartContainer = document.createElement('div');
        chartContainer.className = `eye-chart eye-chart-${eye}`;
        chartContainer.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        `;
        
        const label = document.createElement('div');
        label.textContent = `${eye === 'left' ? 'Left' : 'Right'} Eye EAR`;
        label.style.cssText = `
            font-size: 1rem;
            font-weight: bold;
            margin-bottom: 10px;
            text-transform: capitalize;
        `;
        chartContainer.appendChild(label);
        
        const chart = document.createElement('div');
        chart.id = `ear-chart-${eye}`;
        chart.className = 'ear-chart';
        chart.style.cssText = `
            width: 100%;
            height: 200px;
            background: var(--bg-white);
            border: 4px solid var(--border-fill);
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        `;
        
        // Chart background with scale (0 to 1)
        const scaleContainer = document.createElement('div');
        scaleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 5px;
            font-size: 0.7rem;
            color: var(--text-secondary);
            pointer-events: none;
        `;
        const scaleTop = document.createElement('div');
        scaleTop.textContent = '1.0';
        scaleTop.style.cssText = 'text-align: right;';
        const scaleMiddle = document.createElement('div');
        scaleMiddle.textContent = '0.5';
        scaleMiddle.style.cssText = 'text-align: right;';
        const scaleBottom = document.createElement('div');
        scaleBottom.textContent = '0.0';
        scaleBottom.style.cssText = 'text-align: right;';
        scaleContainer.appendChild(scaleTop);
        scaleContainer.appendChild(scaleMiddle);
        scaleContainer.appendChild(scaleBottom);
        chart.appendChild(scaleContainer);
        
        // EAR value bar
        const valueBar = document.createElement('div');
        valueBar.id = `ear-value-${eye}`;
        valueBar.className = 'ear-value-bar';
        valueBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 0%;
            background: ${eye === 'left' ? '#381DFF' : '#FF381D'};
            transition: height 0.1s ease;
            border-radius: 0 0 4px 4px;
        `;
        chart.appendChild(valueBar);
        
        // Current value display
        const valueDisplay = document.createElement('div');
        valueDisplay.id = `ear-value-display-${eye}`;
        valueDisplay.className = 'ear-value-display';
        valueDisplay.textContent = '0.000';
        valueDisplay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--text-primary);
            z-index: 2;
            pointer-events: none;
        `;
        chart.appendChild(valueDisplay);
        
        chartContainer.appendChild(chart);
        
        return chartContainer;
    }
    
    updateEyeCharts() {
        if (!this.isCalibrating || !this.debugMode) return;
        
        // Note: MediaPipe's left/right is from the camera's perspective (mirrored)
        // So we need to swap the displays to match the user's perspective
        // Update left chart with right EAR (user's left eye from their perspective)
        const leftValueBar = document.getElementById('ear-value-left');
        const leftValueDisplay = document.getElementById('ear-value-display-left');
        if (leftValueBar && leftValueDisplay) {
            // Display right EAR in left chart (because MediaPipe's "right" is user's left)
            const normalizedValue = Math.min(1, Math.max(0, this.earRight));
            leftValueBar.style.height = `${normalizedValue * 100}%`;
            leftValueDisplay.textContent = this.earRight.toFixed(3);
        }
        
        // Update right chart with left EAR (user's right eye from their perspective)
        const rightValueBar = document.getElementById('ear-value-right');
        const rightValueDisplay = document.getElementById('ear-value-display-right');
        if (rightValueBar && rightValueDisplay) {
            // Display left EAR in right chart (because MediaPipe's "left" is user's right)
            const normalizedValue = Math.min(1, Math.max(0, this.earLeft));
            rightValueBar.style.height = `${normalizedValue * 100}%`;
            rightValueDisplay.textContent = this.earLeft.toFixed(3);
        }
    }
    
    startCalibrationStep() {
        this.calibrationStartTime = Date.now();
        const stepDuration = this.calibrationStepDuration;
        
        const updateTimer = () => {
            if (!this.isCalibrating) return;
            
            const elapsed = Date.now() - this.calibrationStartTime;
            const remaining = Math.max(0, stepDuration - elapsed);
            const seconds = Math.ceil(remaining / 1000);
            
            const timerDisplay = document.getElementById('calibration-timer');
            if (timerDisplay) {
                timerDisplay.textContent = seconds;
            }
            
            if (remaining > 0) {
                this.calibrationTimer = setTimeout(updateTimer, 100);
            } else {
                this.completeCalibrationStep();
            }
        };
        
        updateTimer();
    }
    
    completeCalibrationStep() {
        this.calibrationStep++;
        const totalSteps = 5;
        
        if (this.calibrationStep < totalSteps) {
            // Move to next step
            this.renderCalibrationScreen();
        } else {
            // All steps complete - calculate threshold
            this.finishCalibration();
        }
    }
    
    finishCalibration() {
        // Calculate averages
        // Note: calibrationData already has swapped values (leftEAR = user's left, rightEAR = user's right)
        const avgBothOpen = this.calculateAverage(this.calibrationData.bothEyesOpen);
        const avgLeftClosed = this.calculateAverage(this.calibrationData.leftEyeClosed);
        const avgLeftOpen = this.calculateAverage(this.calibrationData.leftEyeOpen);
        const avgRightClosed = this.calculateAverage(this.calibrationData.rightEyeClosed);
        const avgRightOpen = this.calculateAverage(this.calibrationData.rightEyeOpen);
        
        // Debug: log the averages and data collection status
        console.log('Calibration data collection:', {
            bothEyesOpen: this.calibrationData.bothEyesOpen.length,
            leftEyeClosed: this.calibrationData.leftEyeClosed.length,
            leftEyeOpen: this.calibrationData.leftEyeOpen.length,
            rightEyeClosed: this.calibrationData.rightEyeClosed.length,
            rightEyeOpen: this.calibrationData.rightEyeOpen.length
        });
        console.log('Calibration averages:', {
            bothOpen: avgBothOpen,
            leftClosed: avgLeftClosed,
            leftOpen: avgLeftOpen,
            rightClosed: avgRightClosed,
            rightOpen: avgRightOpen
        });
        
        // Calculate separate thresholds for each eye
        // Left eye threshold: based on left eye open/closed data
        const leftEyeClosedAvg = avgLeftClosed.leftEAR; // User's left eye when closed
        const leftEyeOpenAvg = (avgBothOpen.leftEAR + avgLeftOpen.leftEAR) / 2; // User's left eye when open
        
        // Right eye threshold: based on right eye open/closed data
        const rightEyeClosedAvg = avgRightClosed.rightEAR; // User's right eye when closed
        const rightEyeOpenAvg = (avgBothOpen.rightEAR + avgRightOpen.rightEAR) / 2; // User's right eye when open
        
        // Validate that we have sufficient data
        const hasLeftData = this.calibrationData.bothEyesOpen.length > 0 && 
                           this.calibrationData.leftEyeClosed.length > 0 &&
                           this.calibrationData.leftEyeOpen.length > 0;
        const hasRightData = this.calibrationData.bothEyesOpen.length > 0 && 
                            this.calibrationData.rightEyeClosed.length > 0 &&
                            this.calibrationData.rightEyeOpen.length > 0;
        
        // Calculate thresholds: 30% from closed toward open
        // No caps - use the calculated value directly
        let leftEyeRange, leftEyeThreshold, rightEyeRange, rightEyeThreshold;
        
        if (hasLeftData) {
            leftEyeRange = leftEyeOpenAvg - leftEyeClosedAvg;
            leftEyeThreshold = leftEyeClosedAvg + (leftEyeRange * 0.3); // 30% from closed toward open
            this.earThresholdLeft = leftEyeThreshold; // No caps - use calculated value
        } else {
            console.warn('Insufficient left eye calibration data, keeping existing threshold');
        }
        
        if (hasRightData) {
            rightEyeRange = rightEyeOpenAvg - rightEyeClosedAvg;
            rightEyeThreshold = rightEyeClosedAvg + (rightEyeRange * 0.3); // 30% from closed toward open
            this.earThresholdRight = rightEyeThreshold; // No caps - use calculated value
        } else {
            console.warn('Insufficient right eye calibration data, keeping existing threshold');
        }
        
        // Debug: log calculated thresholds
        console.log('Calculated thresholds:', {
            leftEyeClosedAvg,
            leftEyeOpenAvg,
            leftEyeRange,
            leftEyeThreshold,
            earThresholdLeft: this.earThresholdLeft,
            rightEyeClosedAvg,
            rightEyeOpenAvg,
            rightEyeRange,
            rightEyeThreshold,
            earThresholdRight: this.earThresholdRight
        });
        
        // Save the thresholds
        this.saveSettings();
        
        // Show completion screen
        this.showCalibrationComplete();
    }
    
    calculateAverage(dataArray) {
        if (!dataArray || dataArray.length === 0) {
            return { leftEAR: 0, rightEAR: 0 };
        }
        
        const sum = dataArray.reduce((acc, sample) => ({
            leftEAR: acc.leftEAR + sample.leftEAR,
            rightEAR: acc.rightEAR + sample.rightEAR
        }), { leftEAR: 0, rightEAR: 0 });
        
        return {
            leftEAR: sum.leftEAR / dataArray.length,
            rightEAR: sum.rightEAR / dataArray.length
        };
    }
    
    showCalibrationComplete() {
        const menuContainerEl = document.getElementById('menu-container');
        if (!menuContainerEl) return;
        
        this.isCalibrating = false;
        if (this.calibrationTimer) {
            clearTimeout(this.calibrationTimer);
            this.calibrationTimer = null;
        }
        
        menuContainerEl.innerHTML = '';
        menuContainerEl.className = '';
        
        const title = document.createElement('h1');
        title.className = 'menu-title';
        title.textContent = 'Calibration Complete!';
        menuContainerEl.appendChild(title);
        
        const result = document.createElement('div');
        result.style.cssText = 'text-align: center; margin: 30px 0; padding: 20px; background: rgba(226, 222, 255, 0.3); border-radius: 8px;';
        
        const thresholdText = document.createElement('p');
        thresholdText.style.cssText = 'font-size: 1.3rem; margin: 15px 0;';
        thresholdText.textContent = `Left Eye Threshold: ${this.earThresholdLeft.toFixed(3)}`;
        result.appendChild(thresholdText);
        
        const thresholdTextRight = document.createElement('p');
        thresholdTextRight.style.cssText = 'font-size: 1.3rem; margin: 15px 0;';
        thresholdTextRight.textContent = `Right Eye Threshold: ${this.earThresholdRight.toFixed(3)}`;
        result.appendChild(thresholdTextRight);
        
        const explanation = document.createElement('p');
        explanation.style.cssText = 'font-size: 1rem; margin: 15px 0; color: var(--text-secondary);';
        explanation.textContent = 'This threshold has been saved and will be used for blink detection.';
        result.appendChild(explanation);
        
        menuContainerEl.appendChild(result);
        
        const backButton = document.createElement('button');
        backButton.className = 'calibrate-button';
        backButton.textContent = 'Back to Lock Screen';
        backButton.addEventListener('click', () => {
            this.renderMenu();
        });
        menuContainerEl.appendChild(backButton);
    }
}

// Register Service Worker for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Use current location to determine service worker path
        const swPath = new URL('sw.js', window.location.href).pathname;
        navigator.serviceWorker.register(swPath)
            .then((registration) => {
                console.log('Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// Initialize app when DOM is ready
let app; // Make app globally accessible for debugging
document.addEventListener('DOMContentLoaded', () => {
    app = new MenuApp();
    // Make app accessible globally for console debugging
    window.app = app;
});
