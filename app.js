// Import components
import { createMenuContainer } from './src/components/MenuContainer.js';
import { createSettingsDetail } from './src/components/SettingsDetail.js';
import { createMenuTitle } from './src/components/MenuTitle.js';
import { createLockScreen } from './src/components/LockScreen.js';

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
                { id: 'settings', title: 'Settings', subtitle: 'Customize the app to your preferences' },
                { id: 'lock', title: 'Rest', subtitle: 'Lock the app to rest' }
            ],
            write: [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'saved-text': [
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
        } else {
            const titleMap = {
                'main': 'Main Menu',
                'write': 'Write',
                'saved-text': 'Saved text',
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
        } else {
            this.navigateTo(option.id);
        }
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
        if (this.menuStack.length > 0) {
            this.currentMenu = this.menuStack.pop();
            this.renderMenu();
        }
        this.resetBlinkState();
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
        
        const optionEls = document.querySelectorAll('.menu-option');
        if (this.currentIndex >= optionEls.length) return;
        
        const optionEl = optionEls[this.currentIndex];
        const progressFill = optionEl.querySelector('.progress-fill');
        
        // Don't start selection if there's no progress fill (e.g., value display)
        if (!progressFill) return;
        
        this.isSelecting = true;
        this.selectionProgress = 0;
        this.selectionStartTime = Date.now();
        
        const animate = () => {
            if (!this.isSelecting) {
                this.cancelSelection();
                return;
            }
            
            const elapsed = (Date.now() - this.selectionStartTime) / 1000;
            this.selectionProgress = Math.min(elapsed / this.blinkThreshold, 1);
            
            if (progressFill) {
                progressFill.style.width = (this.selectionProgress * 100) + '%';
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
        this.isSelecting = false;
        this.selectionProgress = 0;
        
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
