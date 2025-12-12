// Bingo Logic Utility

// Column ranges
const B_RANGE = [1, 15];
const I_RANGE = [16, 30];
const N_RANGE = [31, 45];
const G_RANGE = [46, 60];
const O_RANGE = [61, 75];

const RANGES = [B_RANGE, I_RANGE, N_RANGE, G_RANGE, O_RANGE];
const LETTERS = ['B', 'I', 'N', 'G', 'O'];

// Helper to get random numbers within a range
const getRandomNumbers = (min, max, count) => {
    const nums = new Set();
    while (nums.size < count) {
        nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return Array.from(nums);
};

// Generate a valid Bingo Card (5x5 matrix)
// Returns array of columns, or flattened array depending on UI preference.
// Here we return a flat array of objects: { id: 'B1', number: 5, col: 'B' }
export const generateBingoCard = () => {
    const card = [];

    // N column has 4 numbers + FREE space

    RANGES.forEach((range, colIndex) => {
        const isNCol = colIndex === 2;
        const numbers = getRandomNumbers(range[0], range[1], 5);

        // In N column, the middle one (index 2) is FREE
        if (isNCol) {
            numbers[2] = 'FREE';
        }

        numbers.forEach((num, rowIndex) => {
            let cell = {
                id: `${LETTERS[colIndex]}-${rowIndex}`,
                letter: LETTERS[colIndex],
                number: num,
                row: rowIndex,
                col: colIndex,
                marked: num === 'FREE' // FREE is auto-marked
            };
            card.push(cell);
        });
    });

    return card;
};

// Generate shuffled sequence of 1-75
export const generateBallSequence = () => {
    const balls = [];
    for (let i = 1; i <= 75; i++) {
        balls.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = balls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    return balls;
};

// Check for Win patterns
// cardCells: Array of cell objects (state of the player's card)
// currentPattern: 'FULL_HOUSE' | 'HORIZONTAL_LINE' | 'VERTICAL_LINE' | 'DIAGONAL'
export const checkWin = (cardCells, currentPattern = 'FULL_HOUSE') => {
    // Helper: Get cell at row, col
    const getCell = (r, c) => cardCells.find(cell => cell.row === r && cell.col === c);

    // All marked?
    const isMarked = (r, c) => {
        const cell = getCell(r, c);
        return cell && cell.marked;
    };

    if (currentPattern === 'FULL_HOUSE') {
        return cardCells.every(cell => cell.marked);
    }

    if (currentPattern === 'HORIZONTAL_LINE') {
        for (let r = 0; r < 5; r++) {
            if ([0, 1, 2, 3, 4].every(c => isMarked(r, c))) return true;
        }
    }

    if (currentPattern === 'VERTICAL_LINE') {
        for (let c = 0; c < 5; c++) {
            if ([0, 1, 2, 3, 4].every(r => isMarked(r, c))) return true;
        }
    }

    if (currentPattern === 'DIAGONAL') {
        // Major diagonal (0,0 to 4,4)
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, i))) return true;
        // Minor diagonal (0,4 to 4,0)
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, 4 - i))) return true;
    }

    return false;
};
