# Product Requirements Document (PRD)
## Blink-Controlled Minesweeper Game

**Version:** 1.0  
**Date:** 2024  
**Status:** Draft

---

## 1. Executive Summary

A Minesweeper game integrated into the blink-controlled menu navigation app. Players navigate the game board using a two-step selection process: first selecting a row, then a column to identify a square. Once a square is selected, players choose an action (mine, flag, or exit) through a blink-controlled menu. Before starting, players configure difficulty and board size.

---

## 2. Product Overview

### 2.1 Problem Statement
Users need a hands-free way to play Minesweeper using only eye movements (blinking) within the existing blink-controlled app ecosystem.

### 2.2 Solution
A Minesweeper game that:
- Allows players to configure difficulty and board size before starting
- Uses a focused 7x7 play area that centers on the last action for easier navigation
- Constrains row/column selection to the active 7x7 area
- Uses two-step selection (row, then column) to identify squares within the play area
- Provides a menu for square actions (mine, flag, exit) with longer hold times for destructive actions
- Includes "Zoom Out" button to expand selection area when 7x7 is active
- Includes an "Exit Game" option that requires a longer hold time (2 seconds)
- The full board remains visible while selection is constrained to the 7x7 area
- Integrates seamlessly with the existing blink-controlled navigation system
- Follows standard Minesweeper game rules

### 2.3 Target Users
- Users already using the blink-controlled menu navigation app
- Users who enjoy puzzle games
- Users seeking accessible gaming experiences

---

## 3. User Stories

### 3.1 Game Setup
- **As a user**, I want to select a difficulty level before starting so that I can choose an appropriate challenge.
- **As a user**, I want to select a board size before starting so that I can customize the game to my preference.
- **As a user**, I want to start the game after configuring settings so that I can begin playing.

### 3.2 Game Access
- **As a user**, I want to access Minesweeper from the Games menu so that I can play the game.
- **As a user**, I want to see the game board clearly so that I can understand the current game state.

### 3.3 Row Selection
- **As a user**, I want to select a row first so that I can narrow down which square I want to interact with.
- **As a user**, I want to see which row is currently highlighted so that I know what I'm selecting.
- **As a user**, I want the row selection to auto-scroll so that I can see all available rows.
- **As a user**, I want row selection to be constrained to the active 7x7 play area so that navigation is easier.
- **As a user**, I want rows with all squares already revealed to be skipped so that I only see rows with available squares.
- **As a user**, I want to be able to zoom out to expand the selection area when a 7x7 area is active.
- **As a user**, I want to be able to exit the game at any time during row selection so that I can leave when needed.

### 3.4 Column Selection
- **As a user**, I want to select a column after selecting a row so that I can identify the specific square.
- **As a user**, I want to see which column is currently highlighted so that I know what I'm selecting.
- **As a user**, I want the column selection to auto-scroll so that I can see all available columns.
- **As a user**, I want column selection to be constrained to the active 7x7 play area so that navigation is easier.
- **As a user**, I want columns with already-revealed squares in the selected row to be skipped so that I only see columns with available squares.
- **As a user**, I want the row selection to reset if I don't select a column so that I can start over if I change my mind.

### 3.5 Square Actions
- **As a user**, I want to choose what to do with a selected square (mine, flag, or exit) so that I can play the game.
- **As a user**, I want to mine a square to see if it contains a mine or a number so that I can progress in the game.
- **As a user**, I want to flag a square to mark it as a potential mine so that I can track my suspicions.
- **As a user**, I want destructive actions (mine, flag) to require a longer hold time (0.5 seconds) so that I don't accidentally trigger them.
- **As a user**, I want the 7x7 play area to re-center on my last action so that I can continue playing in a focused area.
- **As a user**, I want to exit the square selection menu so that I can cancel my selection and return to row/column selection.

### 3.6 Game State
- **As a user**, I want to see revealed squares with their numbers so that I can make informed decisions.
- **As a user**, I want to see flagged squares so that I can remember which squares I've marked.
- **As a user**, I want to know when I've won or lost the game so that I can understand the outcome.

### 3.7 Exit Game and Zoom Out
- **As a user**, I want to exit the game at any time so that I can return to the Games menu.
- **As a user**, I want the Exit Game button to require a longer hold time (2 seconds) so that I don't accidentally exit.
- **As a user**, I want to zoom out to expand the selection area when a 7x7 play area is active so that I can access more of the board.
- **As a user**, I want the Zoom Out button to only appear when a 7x7 area is active so that the interface is clean when not needed.
- **As a user**, I want the scrolling sequence to include Zoom Out (when available) and Exit Game so that I can access these options easily.

---

## 4. Functional Requirements

### 4.1 Game Setup

#### FR-1: Difficulty Selection
- Before starting a game, the user shall select a difficulty level
- Difficulty options shall include:
  - **Easy**: Fewer mines, larger safe areas
  - **Medium**: Standard mine density
  - **Hard**: More mines, tighter spacing
- Difficulty selection shall use the standard menu system with auto-scrolling cursor
- After selecting difficulty, the game shall proceed to board size selection

#### FR-2: Board Size Selection
- After selecting difficulty, the user shall select a board size
- Board size options shall include:
  - **Small**: 9x9 (or similar)
  - **Medium**: 20x20 (standard)
  - **Large**: 30x30 (or similar)
- Board size selection shall use the standard menu system with auto-scrolling cursor
- After selecting board size, the game shall start with the configured settings

#### FR-3: Game Initialization
- After both difficulty and board size are selected, the game shall initialize
- Mines shall be placed according to the selected difficulty
- The board shall be generated with the selected dimensions
- Initially, no 7x7 play area shall be active (full board available for selection)
- The game shall enter row selection mode
- After the first square is mined, a 7x7 play area shall be created centered on that square

### 4.2 Game Board

#### FR-4: Board Structure
- The game shall display a Minesweeper board with rows and columns
- Board size shall be determined by user selection (Small, Medium, Large)
- The board shall be visually clear and easy to navigate
- Each square shall be clearly identifiable

#### FR-5: Board Display
- The full game board shall always be visible
- Unrevealed squares shall be displayed as blank squares with borders
- Revealed squares shall show:
  - Numbers (1-8) indicating adjacent mine count
  - Empty (0 adjacent mines)
  - Mine icon (if revealed and contains mine)
- Flagged squares shall display a flag icon
- The board shall use the app's design system (Comic Sans font, #E2DEFF borders, white background)
- The 7x7 play area may be visually indicated (optional visual highlight) but the full board remains visible

### 4.3 7x7 Play Area

#### FR-6: 7x7 Play Area Creation
- After the first square is mined, a 7x7 play area shall be created
- The 7x7 area shall be centered on the square that was just mined
- The play area shall be a 7x7 grid (7 rows by 7 columns) centered on the action square
- The full board remains visible, but selection is constrained to the 7x7 area

#### FR-7: 7x7 Play Area Movement
- After any action on a square (mine or flag toggle), the 7x7 play area shall re-center on that square
- The play area shall move dynamically as the user plays
- The play area boundaries shall be calculated based on board edges (may be smaller than 7x7 near board edges)

#### FR-8: Selection Constraint to 7x7 Area
- Row selection shall only include rows that are within the active 7x7 play area
- Column selection shall only include columns that are within the active 7x7 play area
- If no 7x7 area is active (before first mine), all rows and columns are available
- The filtering logic shall combine with the "skip fully-revealed" logic

### 4.4 Zoom Out Button

#### FR-9: Zoom Out Button Display
- A "Zoom Out" button shall be displayed below the game board
- The button shall only be visible and available when a 7x7 play area is active
- When no 7x7 area is active, the button shall be disabled and excluded from scrolling
- The button shall use the same styling as other menu options

#### FR-10: Zoom Out Functionality
- Selecting "Zoom Out" shall deactivate the 7x7 play area
- After zooming out, all rows and columns on the full board shall be available for selection
- The "Zoom Out" button shall disappear from the interface after use
- The user can continue playing with the full board available

### 4.5 Exit Game Button

#### FR-11: Exit Game Button Display
- An "Exit Game" button shall always be displayed below the game board
- The button shall use the same styling as other menu options
- The button shall be clearly visible and accessible

#### FR-12: Exit Game in Row Selection
- During row selection, the scrolling sequence shall be:
  1. Available rows within the 7x7 area (or all rows if no 7x7 area)
  2. "Zoom Out" button (only if 7x7 area is active)
  3. "Exit Game" button
- The "Exit Game" button shall require a 2-second blink hold to trigger (longer than normal selection)
- Selecting "Exit Game" shall return the user to the Games menu
- Game state may be saved for future sessions (optional)

### 4.6 Two-Step Selection Process

#### FR-13: Row Selection Phase
- The game shall start in "row selection" mode
- Rows shall be displayed as a vertical list of options
- **If a 7x7 play area is active, only rows within that area shall be available for selection**
- **If no 7x7 area is active, all rows on the board shall be available**
- **The auto-scrolling cursor shall skip rows where all squares have been revealed**
- Only rows with at least one unrevealed square shall be included in the scrolling sequence
- After all available rows, the cursor shall scroll to:
  1. "Zoom Out" button (if 7x7 area is active)
  2. "Exit Game" button
- Only one option (row, Zoom Out, or Exit Game) shall be highlighted at a time
- Selecting a row (via blink) shall transition to "column selection" mode
- Selecting "Zoom Out" (via blink) shall deactivate the 7x7 area
- Selecting "Exit Game" (via blink, 2-second hold) shall exit the game
- The selected row shall remain visually indicated during column selection
- If all rows are fully revealed, only "Zoom Out" (if active) and "Exit Game" buttons shall be available

#### FR-14: Column Selection Phase
- After selecting a row, the game shall enter "column selection" mode
- Columns shall be displayed as a horizontal list of options
- **If a 7x7 play area is active, only columns within that area shall be available for selection**
- **If no 7x7 area is active, all columns on the board shall be available**
- **The auto-scrolling cursor shall skip columns where the square at the selected row/column intersection has already been revealed**
- Only columns with unrevealed squares in the selected row shall be included in the scrolling sequence
- The auto-scrolling cursor shall cycle through available columns
- Only one column shall be highlighted at a time
- Selecting a column (via blink) shall identify the square at the intersection
- If the user does not select a column and the cursor moves away or times out, the row selection shall reset and return to row selection mode
- If all columns in the selected row are already revealed, the row selection shall automatically reset and return to row selection mode

#### FR-15: Row Selection Reset
- If a row is selected but no column is selected, the row selection shall reset
- The reset shall occur when:
  - The user navigates away from column selection (e.g., selects "Back")
  - A timeout period passes without column selection (configurable, default: 5 seconds)
  - The user explicitly exits column selection
- After reset, the game shall return to row selection mode
- The previously selected row shall no longer be highlighted
- The scrolling sequence (rows → Zoom Out → Exit Game) shall resume

### 4.7 Square Action Menu

#### FR-16: Action Menu Display
- After selecting both a row and column, a menu shall appear with three options:
  1. **"Mine"** - Mine the selected square
  2. **"Flag"** - Place or remove a flag on the selected square
  3. **"Exit"** - Cancel selection and return to row/column selection

#### FR-17: Action Menu Navigation
- The action menu shall use the same auto-scrolling cursor system as other menus
- Options shall be selectable via blink-hold selection
- **All action menu options (Mine, Flag, Exit) shall require a 0.5-second hold time (longer than normal selection)**
- The menu shall follow the same visual design as other app menus

#### FR-18: Mine Action
- Selecting "Mine" with a 0.5-second hold shall mine the square
- If the square contains a mine, the game shall end (lose condition)
- If the square contains a number, it shall be displayed
- If the square is empty (0 adjacent mines), adjacent squares shall be auto-revealed (standard Minesweeper behavior)
- **After mining, the 7x7 play area shall re-center on the mined square**
- If this is the first mine, the 7x7 play area shall be created centered on this square
- After mining, the game shall return to row selection mode

#### FR-19: Flag Action
- Selecting "Flag" with a 0.5-second hold shall toggle the flag state of the square
- If the square is unflagged, a flag shall be placed
- If the square is flagged, the flag shall be removed
- Flagged squares cannot be mined until the flag is removed
- **After flagging/unflagging, the 7x7 play area shall re-center on the flagged square**
- If this is the first action, the 7x7 play area shall be created centered on this square
- After flagging/unflagging, the game shall return to row selection mode

#### FR-20: Exit Action
- Selecting "Exit" with a 0.5-second hold shall cancel the square selection
- The game shall return to row selection mode
- No changes shall be made to the selected square
- The row and column selections shall be cleared
- The 7x7 play area shall remain in its current position (if active)

### 4.8 Game Logic

#### FR-21: Mine Placement
- Mines shall be randomly placed on the board at game start
- Mine count shall be determined by difficulty and board size:
  - Easy: Lower mine density (e.g., 10% of squares)
  - Medium: Standard mine density (e.g., 15% of squares)
  - Hard: Higher mine density (e.g., 20% of squares)
- Mine positions shall be fixed once the game starts
- The first mined square shall never contain a mine (standard Minesweeper rule)

#### FR-22: Number Calculation
- Each non-mine square shall display the count of adjacent mines
- Adjacent includes all 8 surrounding squares (diagonal and orthogonal)
- Numbers shall be displayed clearly using the app's design system

#### FR-23: Win Condition
- The game is won when all non-mine squares are revealed
- A win message shall be displayed
- The user shall be able to start a new game or return to the Games menu

#### FR-24: Lose Condition
- The game is lost when a mine is mined
- All mines shall be revealed
- A lose message shall be displayed
- The user shall be able to start a new game or return to the Games menu

### 4.9 Navigation

#### FR-25: Game Menu Integration
- Minesweeper shall be accessible from the "Games" menu
- The game setup (difficulty, board size) shall be accessible from the Games menu
- Navigation shall use the existing blink-controlled system

#### FR-26: Game State Management
- The game state shall persist during play
- If the user navigates away and returns, the game state may be maintained (optional)
- The user shall be able to start a new game at any time
- Exiting the game shall return to the Games menu

---

## 5. Technical Requirements

### 5.1 Game Implementation

#### TR-1: Game Engine
- The game shall be implemented in JavaScript
- Game logic shall be client-side only
- The game shall use the existing menu navigation system
- All components shall be added to Storybook

#### TR-2: Board Representation
- The board shall be represented as a 2D array
- Each cell shall track:
  - Whether it contains a mine
  - Whether it is revealed
  - Whether it is flagged
  - Adjacent mine count

#### TR-3: Component Structure
- **MinesweeperGame Component**: Main game container
- **DifficultySelector Component**: Difficulty selection menu
- **BoardSizeSelector Component**: Board size selection menu
- **MinesweeperBoard Component**: Main game board display (always shows full board)
- **RowSelector Component**: Row selection menu (includes Zoom Out and Exit Game buttons, filters to 7x7 area and fully-revealed rows)
- **ColumnSelector Component**: Column selection menu (filters to 7x7 area and already-revealed squares in selected row)
- **SquareActionMenu Component**: Action menu for selected square (0.5s hold time)
- **GameSquare Component**: Individual square display
- **ZoomOutButton Component**: Zoom out button (only visible when 7x7 area is active)
- **ExitGameButton Component**: Exit game button (2s hold time)
- All components shall be documented in Storybook

#### TR-6: Smart Filtering Logic
- Row selection shall filter out rows where all squares are revealed
- Column selection shall filter out columns where the square at row/column intersection is already revealed
- **If a 7x7 play area is active, filtering shall be constrained to rows/columns within that area**
- Filtering shall update dynamically as squares are revealed
- The filtering logic shall be efficient and not cause performance issues

#### TR-7: 7x7 Play Area Logic
- The 7x7 play area shall be calculated as a 7x7 grid centered on the action square
- The area shall be bounded by the board edges (may be smaller than 7x7 near edges)
- The play area shall be recalculated after each action (mine or flag toggle)
- The play area center shall be the square where the last action occurred
- Row/column selection shall be filtered to only include options within the active 7x7 area

#### TR-8: Hold Time Requirements
- **Exit Game button**: Requires 2-second blink hold
- **Action menu options (Mine, Flag, Exit)**: Require 0.5-second blink hold
- **Normal menu navigation**: Uses standard blink threshold setting
- Hold times shall be clearly indicated with progress indicators

### 5.2 Integration Requirements

#### TR-4: Menu System Integration
- The game shall integrate with the existing MenuApp class
- Row and column selection shall use the existing auto-scroll system
- Square action menu shall use the existing menu container system
- Blink detection shall use the existing blink detection system
- Difficulty and board size selection shall use the existing menu system

#### TR-5: State Management
- Game state shall be managed within the MenuApp class
- Difficulty selection state shall be tracked
- Board size selection state shall be tracked
- Row selection state shall be tracked
- Column selection state shall be tracked
- Board state shall be maintained throughout the game session

---

## 6. UI/UX Requirements

### 6.1 Visual Design

#### UX-1: Design Consistency
- The game shall follow the app's design system:
  - Comic Sans font
  - White background (#FFFFFF)
  - #E2DEFF borders and fills
  - Black primary text
  - Black secondary text with 50% opacity
- Board squares shall use the same styling as menu options
- Highlighted rows/columns shall use the same highlighting as menu options
- Exit Game button shall match other menu option styling

#### UX-2: Board Layout
- The board shall be centered on the screen
- Squares shall be clearly spaced and visible
- Row numbers/letters shall be displayed if helpful
- Column numbers/letters shall be displayed if helpful
- Exit Game button shall be positioned below the board, clearly separated

#### UX-3: Square States
- Unrevealed squares: White background with #E2DEFF border
- Revealed squares: White background with number/mine icon
- Flagged squares: Visual flag indicator (icon or color)
- Highlighted squares: #E2DEFF background fill

#### UX-4: Setup Menus
- Difficulty selection menu shall follow standard menu design
- Board size selection menu shall follow standard menu design
- Both shall use auto-scrolling cursor
- Both shall be clearly labeled

### 6.2 User Feedback

#### UX-5: Selection Feedback
- Selected difficulty shall be clearly indicated
- Selected board size shall be clearly indicated
- Selected row shall be clearly highlighted
- Selected column shall be clearly highlighted
- Selected square (row + column intersection) shall be clearly indicated
- Exit Game button shall be highlighted when in scrolling sequence
- Progress indicators shall show during blink-hold selection

#### UX-6: Game State Feedback
- Win/lose messages shall be clear and prominent
- Game status (mines remaining, flags placed) shall be displayed
- Visual feedback for all actions (mine, flag, exit)
- Current phase (row selection, column selection, action menu) shall be clear

---

## 7. Non-Functional Requirements

### 7.1 Performance

#### NFR-1: Responsiveness
- Row/column selection shall be smooth and responsive
- Board updates shall be immediate
- Menu transitions shall be smooth
- Setup menus (difficulty, board size) shall be responsive

#### NFR-2: Game Logic Performance
- Mine placement algorithm shall be efficient
- Number calculation shall be fast
- Auto-reveal of empty areas shall be performant
- Large boards shall not cause performance issues

### 7.2 Usability

#### NFR-3: Intuitive Navigation
- The setup process (difficulty, board size) shall be clear
- The two-step selection process shall be clear to users
- Visual indicators shall make it obvious which phase the user is in
- Reset behavior shall be predictable
- Exit Game button shall be easily accessible

#### NFR-4: Error Prevention
- Users shall not be able to mine flagged squares
- Users shall not be able to perform invalid actions
- Clear feedback for all user actions
- Setup selections shall be validated

---

## 8. Edge Cases and Error Handling

### 8.1 Setup Edge Cases

#### EC-1: Setup Navigation
- If user navigates away during setup:
  - Setup state shall be cleared
  - User shall return to Games menu
  - No game shall be started

#### EC-2: Invalid Configuration
- If difficulty/board size combination is invalid:
  - Default values shall be used
  - User shall be notified
  - Game shall proceed with defaults

### 8.2 Selection Edge Cases

#### EC-3: Row Selection Timeout
- If a row is selected but no column is selected within the timeout period:
  - Row selection shall reset
  - Game shall return to row selection mode
  - Exit Game button shall again be in scrolling sequence
  - User shall be able to select a new row or exit

#### EC-10: All Rows Revealed
- If all rows have all squares revealed:
  - Only the "Exit Game" button shall be available
  - User can exit or game may auto-detect win condition
  - No row selection options shall be shown

#### EC-11: All Columns Revealed in Selected Row
- If all columns in the selected row are already revealed:
  - Row selection shall automatically reset
  - Game shall return to row selection mode
  - User shall be notified (optional) or silently returned to row selection
  - The fully-revealed row shall be filtered out from future row selections

#### EC-12: 7x7 Area at Board Edges
- If the action square is near a board edge, the 7x7 area may extend beyond the board
- The play area shall be constrained to valid board coordinates
- Only rows and columns that exist on the board shall be available for selection
- The area may be smaller than 7x7 when near edges

#### EC-13: Zoom Out When No 7x7 Active
- If user somehow accesses Zoom Out when no 7x7 area is active:
  - Button shall be disabled
  - Button shall not appear in scrolling sequence
  - No action shall occur

#### EC-14: First Action Creates 7x7
- When the first square is mined or flagged:
  - 7x7 play area shall be created centered on that square
  - Zoom Out button shall become available
  - Row/column selection shall be constrained to the 7x7 area

#### EC-4: Navigation During Selection
- If user navigates away during row/column selection:
  - Selection state shall be cleared
  - Game shall return to initial state
  - Exit Game shall work from any state

#### EC-5: Selecting Already Revealed Square
- If user selects a square that is already revealed:
  - Action menu shall still appear
  - "Mine" option may be disabled or show "Already mined"
  - Flag and Exit options shall remain available

#### EC-6: Selecting Flagged Square
- If user selects a flagged square:
  - Action menu shall appear
  - "Mine" option shall be disabled
  - "Flag" option shall show "Remove flag"
  - Exit option shall remain available

### 8.3 Game State Edge Cases

#### EC-7: Game Win Detection
- Win condition shall be checked after each mine
- Win detection shall account for all revealed squares
- Win message shall be displayed immediately upon winning

#### EC-8: Game Loss Handling
- When a mine is mined:
  - Game shall immediately end
  - All mines shall be revealed
  - Lose message shall be displayed
  - User shall not be able to continue playing

#### EC-9: Exit Game During Play
- If user exits game during play:
  - Game state may be saved (optional)
  - User shall return to Games menu
  - No game data shall be lost if save is implemented

---

## 9. Implementation Phases

### Phase 1: Game Setup
- Create DifficultySelector component in Storybook
- Create BoardSizeSelector component in Storybook
- Implement difficulty selection menu
- Implement board size selection menu
- Add setup flow to Games menu

### Phase 2: Core Game Logic
- Implement Minesweeper game engine
- Create board generation and mine placement
- Implement number calculation
- Create win/lose detection
- Add difficulty-based mine density

### Phase 3: Board Display
- Create MinesweeperBoard component in Storybook
- Create GameSquare component in Storybook
- Implement board rendering
- Add visual states for squares

### Phase 4: Row/Column Selection
- Create RowSelector component in Storybook
- Create ColumnSelector component in Storybook
- Create ExitGameButton component in Storybook
- Implement two-step selection process
- Add Exit Game button to row selection scrolling sequence
- Add row selection reset logic

### Phase 5: Square Actions
- Create SquareActionMenu component in Storybook
- Implement mine action
- Implement flag action
- Implement exit action

### Phase 6: Integration
- Integrate game into Games menu
- Connect to existing navigation system
- Add game state management
- Test full game flow including setup

### Phase 7: Polish & Testing
- Complete Storybook documentation
- UI/UX refinements
- Edge case handling
- User testing

---

## 10. Success Metrics

### 10.1 Usability Metrics
- Time to complete setup: < 20 seconds
- Time to complete first square selection: < 30 seconds
- User understanding of two-step selection: > 90%
- Game completion rate: > 50%
- Exit Game usage: Measured for user satisfaction

### 10.2 Technical Metrics
- Game logic accuracy: 100%
- Selection accuracy: > 95%
- Performance: Smooth 60 FPS
- Setup flow completion rate: > 95%

---

## 11. Glossary

- **Difficulty**: Game challenge level affecting mine density (Easy, Medium, Hard)
- **Board Size**: Dimensions of the game board (Small, Medium, Large)
- **Row Selection**: First phase where user selects which row contains the target square
- **Column Selection**: Second phase where user selects which column contains the target square
- **Square**: The intersection of a row and column on the game board
- **Mine**: Action to uncover a square and see its contents (mine or number)
- **Flag**: Action to mark a square as a suspected mine
- **Auto-reveal**: Automatic revealing of adjacent empty squares when an empty square is revealed
- **Row Selection Reset**: Returning to row selection mode when column selection is not completed
- **Exit Game Button**: Always-accessible button below the board that allows leaving the game
- **Smart Filtering**: Automatic skipping of rows/columns where all squares are already revealed
- **Fully-Revealed Row**: A row where every square has been revealed
- **Revealed Square**: A square that has been uncovered and shows its contents (number or mine)
- **7x7 Play Area**: A focused 7x7 grid area centered on the last action square, constraining row/column selection
- **Zoom Out**: Action to deactivate the 7x7 play area and return to full board selection
- **Action Square**: The square where the last action (mine or flag toggle) occurred, which becomes the center of the 7x7 area

---

## 12. Approval

**Product Owner:** _________________  
**Technical Lead:** _________________  
**Design Lead:** _________________  
**Date:** _________________

---

**Document Status:** Ready for Review

