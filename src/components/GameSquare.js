/**
 * GameSquare Component
 * Individual square in the Minesweeper board
 */

// SVG for unrevealed square (white with 3D border effect)
const UNREVEALED_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="2" y="2" width="36" height="36" fill="white"/>
<rect x="2" y="2" width="36" height="36" stroke="#EFEFEF" stroke-width="4"/>
<path d="M36 36L40 40L40 0L36 4L36 36Z" fill="#BFBFBF"/>
<path d="M4 36L0 40L40 40L36 36L4 36Z" fill="#BFBFBF"/>
</svg>`;

// SVG for revealed square (gray background)
const REVEALED_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="0.5" y="0.5" width="39" height="39" fill="#D4D4D4"/>
<rect x="0.5" y="0.5" width="39" height="39" stroke="#BABABA"/>
</svg>`;

export function createGameSquare({ 
    value = 0, 
    revealed = false, 
    flagged = false, 
    isMine = false,
    highlighted = false 
} = {}) {
    const square = document.createElement('div');
    square.className = 'game-square';
    
    if (revealed) {
        square.classList.add('revealed');
        square.setAttribute('data-value', value.toString());
    }
    if (flagged) {
        square.classList.add('flagged');
    }
    if (highlighted) {
        square.classList.add('highlighted');
    }
    
    // Create SVG background
    const svgWrapper = document.createElement('div');
    svgWrapper.className = 'game-square-svg';
    svgWrapper.style.width = '40px';
    svgWrapper.style.height = '40px';
    svgWrapper.style.position = 'absolute';
    svgWrapper.style.top = '0';
    svgWrapper.style.left = '0';
    svgWrapper.style.pointerEvents = 'none';
    svgWrapper.innerHTML = revealed ? REVEALED_SVG : UNREVEALED_SVG;
    square.appendChild(svgWrapper);
    
    const content = document.createElement('div');
    content.className = 'game-square-content';
    
    if (flagged) {
        content.textContent = '🚩';
    } else if (revealed) {
        if (isMine) {
            content.textContent = '💣';
        } else if (value > 0) {
            content.textContent = value.toString();
        }
        // value === 0 shows empty (no content)
    }
    // Unrevealed squares show nothing
    
    square.appendChild(content);
    
    return square;
}

