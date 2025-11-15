/**
 * Minesweeper Game Engine
 * Handles game logic: board generation, mine placement, number calculation, win/lose detection
 */
export class MinesweeperEngine {
    constructor(difficulty, boardSize) {
        this.difficulty = difficulty;
        this.boardSize = boardSize;
        
        // Map board size names to dimensions
        const sizeMap = {
            'small': 10,
            'medium': 20,
            'large': 30
        };
        
        this.rows = sizeMap[boardSize] || 10;
        this.cols = sizeMap[boardSize] || 10;
        
        // Map difficulty to mine density
        const densityMap = {
            'easy': 0.10,   // 10% of squares
            'medium': 0.15, // 15% of squares
            'hard': 0.20    // 20% of squares
        };
        
        this.mineCount = Math.floor(this.rows * this.cols * (densityMap[difficulty] || 0.15));
        
        // Initialize board state
        this.board = [];
        this.mines = [];
        this.revealed = [];
        this.flagged = [];
        this.gameOver = false;
        this.won = false;
        this.firstMine = true; // Track if first square has been mined
        
        this.initializeBoard();
    }
    
    initializeBoard() {
        // Initialize board arrays
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
        this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
        this.mines = [];
    }
    
    placeMines(excludeRow, excludeCol) {
        // Place mines randomly, excluding the first clicked square
        const totalSquares = this.rows * this.cols;
        const minePositions = new Set();
        
        while (minePositions.size < this.mineCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            // Exclude first clicked square and its neighbors
            if (row === excludeRow && col === excludeCol) continue;
            if (Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1) continue;
            
            const key = `${row},${col}`;
            if (!minePositions.has(key)) {
                minePositions.add(key);
                this.mines.push({ row, col });
                this.board[row][col] = -1; // -1 represents a mine
            }
        }
        
        // Calculate numbers for all squares
        this.calculateNumbers();
    }
    
    calculateNumbers() {
        // Calculate adjacent mine count for each non-mine square
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] !== -1) {
                    let count = 0;
                    // Check all 8 neighbors
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (dr === 0 && dc === 0) continue;
                            const nr = row + dr;
                            const nc = col + dc;
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                                if (this.board[nr][nc] === -1) {
                                    count++;
                                }
                            }
                        }
                    }
                    this.board[row][col] = count;
                }
            }
        }
    }
    
    mineSquare(row, col) {
        // First mine: place mines (excluding this square)
        if (this.firstMine) {
            this.placeMines(row, col);
            this.firstMine = false;
        }
        
        // Check if already revealed or flagged
        if (this.revealed[row][col] || this.flagged[row][col]) {
            return { success: false, message: 'Square already revealed or flagged' };
        }
        
        // Check if it's a mine
        if (this.board[row][col] === -1) {
            this.gameOver = true;
            this.won = false;
            // Reveal the clicked mine square
            this.revealed[row][col] = true;
            // Reveal all other mines
            this.revealAllMines();
            return { success: true, gameOver: true, won: false };
        }
        
        // Reveal the square
        this.revealSquare(row, col);
        
        // Check win condition
        if (this.checkWin()) {
            this.gameOver = true;
            this.won = true;
            return { success: true, gameOver: true, won: true };
        }
        
        return { success: true, gameOver: false, value: this.board[row][col] };
    }
    
    revealSquare(row, col) {
        if (this.revealed[row][col]) return;
        
        this.revealed[row][col] = true;
        
        // Auto-reveal adjacent squares if this square is empty (0)
        if (this.board[row][col] === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        if (!this.revealed[nr][nc] && !this.flagged[nr][nc]) {
                            this.revealSquare(nr, nc);
                        }
                    }
                }
            }
        }
    }
    
    toggleFlag(row, col) {
        if (this.revealed[row][col]) {
            return { success: false, message: 'Cannot flag revealed square' };
        }
        
        this.flagged[row][col] = !this.flagged[row][col];
        return { success: true, flagged: this.flagged[row][col] };
    }
    
    checkWin() {
        // Win if all non-mine squares are revealed
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.board[row][col] !== -1 && !this.revealed[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    revealAllMines() {
        // Reveal all mines when game is lost
        for (const mine of this.mines) {
            this.revealed[mine.row][mine.col] = true;
        }
    }
    
    getSquareState(row, col) {
        return {
            value: this.board[row][col],
            revealed: this.revealed[row][col],
            flagged: this.flagged[row][col],
            isMine: this.board[row][col] === -1
        };
    }
    
    getBoardState() {
        return {
            rows: this.rows,
            cols: this.cols,
            mineCount: this.mineCount,
            gameOver: this.gameOver,
            won: this.won,
            board: this.board,
            revealed: this.revealed,
            flagged: this.flagged
        };
    }
}

