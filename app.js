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
const DEFAULT_SCROLL_SPEED = 0.5; // seconds
const DEFAULT_BLINK_THRESHOLD = 0.3; // seconds

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
        this.leftEyeCounter = 0;
        this.rightEyeCounter = 0;
        this.eyesWereOpen = true; // Track if eyes were open before starting selection
        
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
                { id: 'spell', title: 'Spell', subtitle: 'Write text by selecting letters or appending saved text' },
                { id: 'saved-text', title: 'Saved text', subtitle: 'Manage saved pieces of text' },
                { id: 'settings', title: 'Settings', subtitle: 'Customize the app to your preferences' },
                { id: 'lock', title: 'Lock', subtitle: 'Lock the app to rest' }
            ],
            spell: [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            'saved-text': [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            settings: [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ],
            lock: [
                { id: 'back', title: 'Back', subtitle: 'Return to previous menu' }
            ]
        };
    }
    
    renderMenu() {
        const menuTitle = document.getElementById('menu-title');
        const menuOptions = document.getElementById('menu-options');
        
        // Set title
        const titleMap = {
            'main': 'Main Menu',
            'spell': 'Spell',
            'saved-text': 'Saved text',
            'settings': 'Settings',
            'lock': 'Lock'
        };
        menuTitle.textContent = titleMap[this.currentMenu] || 'Menu';
        
        // Get options for current menu
        this.options = this.menus[this.currentMenu] || [];
        this.currentIndex = 0;
        
        // Clear and render options
        menuOptions.innerHTML = '';
        this.options.forEach((option, index) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'menu-option';
            optionEl.dataset.index = index;
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            
            const content = document.createElement('div');
            content.className = 'menu-option-content';
            
            const title = document.createElement('div');
            title.className = 'menu-option-title';
            title.textContent = option.title;
            
            const subtitle = document.createElement('div');
            subtitle.className = 'menu-option-subtitle';
            subtitle.textContent = option.subtitle;
            
            content.appendChild(title);
            content.appendChild(subtitle);
            optionEl.appendChild(progressFill);
            optionEl.appendChild(content);
            menuOptions.appendChild(optionEl);
        });
        
        this.updateHighlight();
    }
    
    updateHighlight() {
        const optionEls = document.querySelectorAll('.menu-option');
        optionEls.forEach((el, index) => {
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
                this.currentIndex = (this.currentIndex + 1) % this.options.length;
                this.updateHighlight();
            }
        }, this.scrollSpeed * 1000);
    }
    
    selectOption() {
        if (this.options.length === 0) return;
        
        const option = this.options[this.currentIndex];
        
        if (option.id === 'back') {
            this.navigateBack();
        } else {
            this.navigateTo(option.id);
        }
    }
    
    navigateTo(menuId) {
        this.menuStack.push(this.currentMenu);
        this.currentMenu = menuId;
        this.renderMenu();
        this.resetBlinkState();
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
        this.leftEyeCounter = 0;
        this.rightEyeCounter = 0;
        this.eyesWereOpen = false; // Require eyes to be open before next selection can start
    }
    
    startSelection() {
        if (this.isSelecting) return;
        if (!this.eyesWereOpen) return; // Don't start if eyes weren't open first
        
        this.isSelecting = true;
        this.selectionProgress = 0;
        this.selectionStartTime = Date.now();
        
        const optionEl = document.querySelectorAll('.menu-option')[this.currentIndex];
        const progressFill = optionEl.querySelector('.progress-fill');
        
        const animate = () => {
            if (!this.isSelecting) {
                this.cancelSelection();
                return;
            }
            
            const elapsed = (Date.now() - this.selectionStartTime) / 1000;
            this.selectionProgress = Math.min(elapsed / this.blinkThreshold, 1);
            
            progressFill.style.width = (this.selectionProgress * 100) + '%';
            
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
            progressFill.style.width = '0%';
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
        const leftClosed = this.earLeft < EAR_THRESHOLD;
        const rightOpen = this.earRight >= EAR_THRESHOLD;
        const rightClosed = this.earRight < EAR_THRESHOLD;
        const leftOpen = this.earLeft >= EAR_THRESHOLD;
        const bothOpen = leftOpen && rightOpen;
        const bothClosed = leftClosed && rightClosed;
        
        // Update eyesWereOpen flag - track when both eyes are open
        if (bothOpen) {
            this.eyesWereOpen = true;
        }
        
        // Left eye wink
        if (leftClosed && rightOpen) {
            this.leftEyeCounter++;
            this.leftEyeClosed = true;
            if (this.leftEyeCounter > 6) {
                this.leftEyeCounter = 2;
            }
        } else {
            this.leftEyeCounter = 0;
            this.leftEyeClosed = false;
        }
        
        // Right eye wink
        if (rightClosed && leftOpen) {
            this.rightEyeCounter++;
            this.rightEyeClosed = true;
            if (this.rightEyeCounter > 6) {
                this.rightEyeCounter = 2;
            }
        } else {
            this.rightEyeCounter = 0;
            this.rightEyeClosed = false;
        }
        
        // Update winking state
        if (this.leftEyeClosed && rightOpen) {
            this.isWinking = true;
            this.winkingEye = 'left';
        } else if (this.rightEyeClosed && leftOpen) {
            this.isWinking = true;
            this.winkingEye = 'right';
        } else {
            this.isWinking = false;
            this.winkingEye = null;
        }
        
        // Check for double-eye blink (both closed) - cancel selection
        if (bothClosed) {
            this.cancelSelection();
            this.eyesWereOpen = false; // Require eyes to open again
            return;
        }
        
        // Handle selection based on wink state
        if (this.isWinking) {
            if (!this.isSelecting && this.eyesWereOpen) {
                this.startSelection();
            }
        } else {
            if (this.isSelecting) {
                this.cancelSelection();
            }
        }
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
