# Product Requirements Document (PRD)
## Blink-Controlled Menu Navigation App

**Version:** 1.0  
**Date:** 2024  
**Status:** Draft

---

## 1. Executive Summary

A web application that enables users to navigate menus and select options using single-eye blink (wink) detection. The app provides an accessible interface for users who may have limited mobility or prefer hands-free interaction. The interface features an auto-scrolling cursor that cycles through menu options, with visual feedback during blink-based selection.

---

## 2. Product Overview

### 2.1 Problem Statement
Users need a hands-free way to navigate and interact with a menu-based application using only eye movements (blinking).

### 2.2 Solution
A web application that:
- Automatically cycles through menu options at a configurable speed
- Detects single-eye blinks (winks) for selection
- Provides visual feedback during the selection process
- Requires sustained blinks to confirm selections, preventing accidental triggers

### 2.3 Target Users
- Users with limited hand/arm mobility
- Users seeking hands-free interaction
- Users in environments where touch/keyboard input is impractical

---

## 3. User Stories

### 3.1 Core Navigation
- **As a user**, I want the app to automatically cycle through menu options so that I can see all available choices without manual navigation.
- **As a user**, I want to select an option by blinking so that I can interact with the app hands-free.
- **As a user**, I want visual feedback showing which option is currently highlighted so that I know what I'm about to select.

### 3.2 Selection Mechanism
- **As a user**, I want to hold a single-eye blink (wink) to select an option so that I can confirm my choice intentionally.
- **As a user**, I want to see a progress indicator (fill animation) while holding a wink so that I know how long I need to maintain the wink.
- **As a user**, I want the selection to reset if I release the wink early so that I don't accidentally trigger unwanted actions.
- **As a user**, I want the selection to reset if I close both eyes (double blink) so that I can cancel a selection by naturally blinking with both eyes.

### 3.3 Customization
- **As a user**, I want to adjust the scroll speed so that I can control how fast options cycle.
- **As a user**, I want to adjust the blink threshold so that I can customize the minimum blink duration required for selection.

### 3.4 Menu Structure
- **As a user**, I want to navigate through different menus/pages so that I can access all app features.
- **As a user**, I want to return to previous menus so that I can navigate back if needed.

---

## 4. Functional Requirements

### 4.1 Menu System

#### FR-1: Menu Structure
- The app shall display a menu/page with multiple selectable options
- Each menu shall have a title displayed at the top
- Options shall be displayed as rectangular cards/buttons with:
  - A main title (large, black, rounded font)
  - A descriptive subtitle (smaller, grey/black, rounded font)
  - A light purple border
  - White background (or light purple when highlighted)

#### FR-2: Auto-Scrolling Cursor
- The app shall automatically cycle through menu options
- Only one option shall be highlighted at a time
- When the cursor reaches the last option, it shall automatically return to the first option (circular navigation)
- The time between option switches shall be configurable (Scroll Speed setting)
- Default scroll speed: 0.5 seconds

#### FR-3: Option Highlighting
- The currently highlighted option shall be visually distinct:
  - Background color changes to light purple
  - Border may be emphasized
  - Other options remain with white background

### 4.2 Blink Detection

#### FR-4: Single-Eye Blink Detection
- The app shall detect single-eye blinks (winks) only
- **Only one eye must be closed at a time** for a valid selection attempt
- The app shall distinguish between left-eye and right-eye winks
- Both left-eye and right-eye winks shall be valid for selection
- Blink detection shall use MediaPipe Face Mesh for accuracy
- **Double-eye blinks (both eyes closed) shall be treated as invalid and shall cancel any ongoing selection**

#### FR-5: Blink Registration Threshold
- A blink must be held for a minimum duration to be registered
- **The blink must remain a single-eye blink (wink) for the entire duration**
- This threshold shall be configurable (Blink threshold setting)
- Default threshold: 0.3 seconds
- If a blink is released before reaching the threshold, it shall not trigger any action
- **If both eyes close at any point during the selection process, the timer shall reset and no action shall be triggered**

### 4.3 Selection Mechanism

#### FR-6: Selection Process
- When a user holds a **single-eye blink (wink)** while an option is highlighted:
  1. The selection process shall begin
  2. A progress indicator shall appear, filling the option from left to right
  3. The fill color shall be distinct (e.g., darker purple, blue, or green)
  4. The fill animation shall complete in the time specified by the Blink threshold setting
  5. **The user must maintain a single-eye blink (only one eye closed) throughout the entire selection process**
  6. **If at any point both eyes close, the selection process shall immediately cancel and reset**

#### FR-7: Selection Completion
- When the progress indicator reaches 100% (right edge), the option shall be triggered/selected
- The action associated with the selected option shall execute
- The selection process shall reset after completion

#### FR-8: Selection Cancellation
- The selection process shall be cancelled and reset in the following scenarios:
  1. **If the user releases the single-eye blink before the progress indicator reaches 100%:**
     - The progress indicator shall reset to 0%
     - The selection process shall cancel
     - No action shall be triggered
     - The cursor shall continue auto-scrolling
  2. **If both eyes close at any point during the selection process:**
     - The progress indicator shall immediately reset to 0%
     - The selection timer shall reset
     - The selection process shall cancel
     - No action shall be triggered
     - The cursor shall continue auto-scrolling
     - **This behavior is identical to releasing the blink early**

#### FR-9: Continuous Blink Detection
- The app shall continuously monitor for blinks while an option is highlighted
- The app shall continuously verify that only one eye is closed during selection
- **The app shall detect if both eyes close and immediately cancel the selection**
- The user can start a selection at any time while an option is highlighted
- If the cursor moves to a new option while a selection is in progress, the selection shall reset

### 4.4 Settings

#### FR-10: Scroll Speed Setting
- Users shall be able to adjust the scroll speed
- Scroll speed shall be measured in seconds (e.g., 0.5s, 1.0s, 1.5s)
- Minimum value: 0.1 seconds
- Maximum value: 5.0 seconds
- Increment/decrement controls shall be provided
- Changes shall take effect immediately

#### FR-11: Blink Threshold Setting
- Users shall be able to adjust the minimum blink duration required for selection
- Blink threshold shall be measured in seconds (e.g., 0.3s, 0.5s, 1.0s)
- Minimum value: 0.1 seconds
- Maximum value: 3.0 seconds
- Increment/decrement controls shall be provided
- Changes shall take effect immediately

#### FR-12: Settings Persistence
- Settings shall persist across page refreshes
- Settings shall be stored in browser localStorage

### 4.5 Navigation

#### FR-13: Menu Navigation
- Selecting an option may navigate to a new menu/page
- Each menu/page shall have a "Back" option to return to the previous menu
- The app shall maintain a navigation stack/history

#### FR-14: Main Menu
- The app shall have a main menu as the entry point
- Main menu options (from images):
  - **Spell**: Write text by selecting letters or appending saved text
  - **Saved text**: Manage saved pieces of text
  - **Settings**: Customize the app to your preferences
  - **Lock**: Lock the app to rest

---

## 5. Technical Requirements

### 5.1 Technology Stack

#### TR-1: Web Technologies
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Blink Detection**: MediaPipe Face Mesh (via CDN)
- **Camera Access**: WebRTC getUserMedia API
- **Storage**: Browser localStorage for settings persistence
- **No Backend Required**: Fully client-side application
- **Component Documentation**: Storybook for component development and documentation

#### TR-1.1: Component Development and Documentation
- **All components created for this application shall be added to Storybook**
- Storybook shall be used for:
  - Component development and isolation
  - Visual testing of components
  - Documentation of component props, states, and usage
  - Design system documentation
- Each component shall have:
  - At least one story demonstrating its default state
  - Stories for all significant variations and states
  - Documentation of all props and their types
  - Usage examples
- Storybook shall be maintained alongside the main application
- Components shall be developed in Storybook before integration into the main app

#### TR-2: Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari (may require additional permissions)
- Requires HTTPS or localhost for camera access

### 5.2 Performance Requirements

#### TR-3: Real-Time Processing
- Blink detection shall process at minimum 30 FPS
- Menu cursor updates shall be smooth and responsive
- Progress indicator animation shall be smooth (60 FPS)

#### TR-4: Resource Usage
- Camera feed processing shall be optimized for performance
- MediaPipe Face Mesh shall run efficiently in the browser
- Memory usage shall be reasonable for extended use

### 5.3 Camera Requirements

#### TR-5: Camera Access
- The app shall request camera permissions on first use
- The app shall handle camera permission denial gracefully
- The app shall support front-facing cameras
- Camera feed shall be mirrored for better UX

---

## 6. UI/UX Requirements

### 6.1 Visual Design

#### UX-1: Design Language
- **Background**: White (#FFFFFF)
- **Font**: Comic Sans MS (Comic Sans)
- **Colors**:
  - Primary text: Black (#000000)
  - Secondary text (menu indicator): Black with 50% opacity (#000000 at 50% opacity / rgba(0, 0, 0, 0.5))
  - Borders: #E2DEFF
  - Fills (highlighted states, progress indicator): #E2DEFF
  - Progress fill: #E2DEFF (fills from left to right during selection)
- **Spacing**: Ample white space between elements
- **Layout**: Centered, vertically stacked options

#### UX-2: Typography
- **Font Family**: Comic Sans MS (Comic Sans) for all text elements
- **Title**: Large, Comic Sans font (centered)
- **Option Titles**: Large, black, Comic Sans font
- **Subtitles**: Smaller, black, Comic Sans font
- **Menu Indicator**: Black Comic Sans font with 50% opacity
- **Consistent**: All text uses Comic Sans font family throughout the application

#### UX-3: Interactive Elements
- Options shall be rectangular cards with rounded corners
- Borders shall be #E2DEFF (thin border)
- Default option state: White background with #E2DEFF border
- Highlighted option shall have #E2DEFF background fill
- Progress indicator shall fill smoothly from left to right using #E2DEFF color
- All fills and borders use the same color: #E2DEFF

### 6.2 User Feedback

#### UX-4: Visual Feedback
- Highlighted option shall be clearly visible
- Progress indicator shall provide real-time feedback
- Selection completion shall have a clear visual indication (e.g., brief flash, color change)

#### UX-5: Error Handling
- If camera is not available, display a clear error message
- If face is not detected, display "No face detected" status
- If blink detection fails, provide visual feedback

### 6.3 Accessibility

#### UX-6: Accessibility Features
- High contrast between text and background
- Clear visual indicators for all states
- Sufficient time for users to react to option changes
- Configurable timing to accommodate different user needs

---

## 7. Non-Functional Requirements

### 7.1 Usability

#### NFR-1: Ease of Use
- The app shall be intuitive for first-time users
- Settings shall be easily accessible and understandable
- Visual feedback shall be clear and unambiguous

#### NFR-2: Learning Curve
- Users shall be able to use the app with minimal instruction
- The auto-scrolling cursor shall make navigation obvious
- Progress indicator shall make selection process clear

### 7.2 Reliability

#### NFR-3: Blink Detection Accuracy
- Blink detection shall be accurate (minimize false positives and false negatives)
- The app shall handle variations in lighting conditions
- The app shall work with different face positions (within reasonable range)

#### NFR-4: Stability
- The app shall not crash during normal use
- Camera feed interruptions shall be handled gracefully
- Settings shall persist reliably

### 7.3 Privacy

#### NFR-5: Data Privacy
- All processing shall occur client-side (no data sent to servers)
- Camera feed shall not be recorded or stored
- No personal data shall be collected or transmitted

---

## 8. Edge Cases and Error Handling

### 8.1 Camera Issues

#### EC-1: Camera Permission Denied
- Display clear message: "Camera access is required for blink detection"
- Provide instructions for enabling camera permissions
- Disable blink detection features until permission is granted

#### EC-2: Camera Unavailable
- Detect when camera is not available
- Display error message
- Provide fallback or instructions

#### EC-3: Camera Disconnected During Use
- Detect camera disconnection
- Pause auto-scrolling
- Display "Camera disconnected" message
- Allow user to restart camera

### 8.2 Face Detection Issues

#### EC-4: No Face Detected
- Display "No face detected" status
- Continue auto-scrolling (user can still see options)
- Resume blink detection when face is detected

#### EC-5: Multiple Faces Detected
- Use the first detected face (MediaPipe maxNumFaces: 1)
- Display warning if multiple faces are consistently detected

#### EC-6: Face Out of Frame
- Handle gracefully when face moves out of camera view
- Display appropriate status message
- Resume when face returns to frame

### 8.3 Selection Edge Cases

#### EC-7: Cursor Changes During Selection
- If cursor moves to new option while selection is in progress:
  - Reset progress indicator
  - Cancel current selection
  - Allow new selection on new option

#### EC-8: Rapid Blinking
- Rapid blinks shall not trigger multiple selections
- Selection must complete before new selection can begin
- Minimum time between selections: 0.5 seconds (debounce)

#### EC-9: Double-Eye Blink During Selection
- If both eyes close at any point during an active selection:
  - The selection shall immediately cancel
  - The progress indicator shall reset to 0%
  - The timer shall reset
  - No action shall be triggered
  - This shall behave identically to releasing the blink early
  - The cursor shall continue auto-scrolling

#### EC-10: Blink During Option Transition
- If user blinks during the transition between options:
  - Selection shall apply to the newly highlighted option
  - Previous selection (if any) shall be cancelled

### 8.4 Settings Edge Cases

#### EC-11: Invalid Settings Values
- Validate settings inputs
- Clamp values to valid ranges
- Provide default values if invalid

#### EC-12: Settings Not Persisting
- Handle localStorage errors gracefully
- Provide default settings if storage fails
- Warn user if settings cannot be saved

---

## 9. Implementation Phases

### Phase 1: Core Infrastructure
- Set up project structure
- Set up Storybook for component development
- Integrate MediaPipe Face Mesh
- Implement basic blink detection
- Create menu system structure

### Phase 2: Auto-Scrolling Cursor
- Create MenuOption component in Storybook
- Implement auto-scrolling logic
- Add option highlighting
- Create circular navigation
- Document components in Storybook

### Phase 3: Selection Mechanism
- Create ProgressIndicator component in Storybook
- Implement blink-hold detection
- Add progress indicator animation
- Create selection completion logic
- Handle selection cancellation
- Document components in Storybook

### Phase 4: Settings System
- Create SettingsMenu component in Storybook
- Create SettingControl component in Storybook
- Create settings menu
- Implement scroll speed adjustment
- Implement blink threshold adjustment
- Add settings persistence
- Document components in Storybook

### Phase 5: Menu Navigation
- Create MainMenu component in Storybook
- Create NavigationStack component in Storybook
- Create main menu
- Implement menu navigation system
- Add back button functionality
- Create additional menus (Spell, Saved text, etc.)
- Document all menu components in Storybook

### Phase 6: Polish & Testing
- Complete Storybook documentation for all components
- UI/UX refinements
- Error handling
- Edge case handling
- Performance optimization
- User testing
- Storybook visual regression testing

---

## 10. Success Metrics

### 10.1 Usability Metrics
- Time to complete first selection: < 30 seconds
- Selection accuracy rate: > 95%
- User satisfaction score: > 4/5

### 10.2 Technical Metrics
- Blink detection accuracy: > 90%
- False positive rate: < 5%
- App responsiveness: < 100ms latency

### 10.3 Accessibility Metrics
- Works for users with different blink patterns
- Configurable settings accommodate various needs
- Clear visual feedback for all users

---

## 11. Future Enhancements (Out of Scope)

- Voice commands as alternative input method
- Eye tracking for cursor control (beyond blinking)
- Customizable themes and colors
- Multiple language support
- Gesture recognition
- Integration with other assistive technologies

---

## 12. Dependencies

### 12.1 External Libraries
- MediaPipe Face Mesh (via CDN)
- MediaPipe Camera Utils (via CDN)
- Storybook (for component development and documentation)

### 12.2 Browser APIs
- getUserMedia (camera access)
- localStorage (settings persistence)
- Canvas API (visual feedback)

### 12.3 Development Tools
- Storybook: Component development, testing, and documentation
- Storybook Addons: Controls, Actions, Docs, Accessibility testing

---

## 13. Risks and Mitigations

### Risk 1: Blink Detection Accuracy
- **Risk**: False positives/negatives in blink detection
- **Mitigation**: Fine-tune EAR threshold, use consecutive frame analysis, allow user customization

### Risk 2: Camera Access Issues
- **Risk**: Users may not grant camera permissions
- **Mitigation**: Clear instructions, graceful error handling, alternative input methods (future)

### Risk 3: Performance on Low-End Devices
- **Risk**: MediaPipe may be slow on older devices
- **Mitigation**: Optimize processing, provide performance settings, test on various devices

### Risk 4: User Fatigue
- **Risk**: Extended blinking may cause eye strain
- **Mitigation**: Configurable timing, clear visual feedback, lock/rest feature

---

## 14. Glossary

- **EAR**: Eye Aspect Ratio - a metric used to detect eye closure
- **Wink**: Single-eye blink (one eye closed, other open) - the only valid input for selection
- **Double Blink**: Both eyes closed simultaneously - **invalidates and cancels any ongoing selection, resets timer, no action triggered**
- **Scroll Speed**: Time interval between option highlights
- **Blink Threshold**: Minimum duration a single-eye blink must be held to trigger selection
- **Progress Indicator**: Visual feedback showing selection progress (left-to-right fill)
- **Selection Cancellation**: Occurs when user releases blink early OR when both eyes close (double blink) - both behaviors are identical

---

## 15. Approval

**Product Owner:** _________________  
**Technical Lead:** _________________  
**Design Lead:** _________________  
**Date:** _________________

---

**Document Status:** Ready for Review

