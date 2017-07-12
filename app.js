let data = {
    maze: null,
    seed: 123132
};


/**
 * Setup the maze once the page has loaded. Though it is probably not necessary 
 * to wait for the DOMContent since there are no external assets being loaded...
 */
document.addEventListener("DOMContentLoaded", function () {
    data.maze = document.getElementById("game");
    let sizeInput = document.getElementById("size");
    let seedInput = document.getElementById("seed");
    let wallInput = document.getElementById("walls");
    let settingsForm = document.getElementById("settings-form");
    let seedButton = document.getElementById("random-seed");

    // Function to run when we generate a maze with input settings
    const customMaze = e => {
        if (e) e.preventDefault();
        createMazeWithSettings(
            parseInt(sizeInput.value),
            parseInt(seedInput.value),
            parseInt(wallInput.value)
        );
    }

    // Set defaults
    let defaults = {
        seed: 123546,
        size: 15,
        knockDown: 0
    }
    sizeInput.value = defaults.size;
    seedInput.value = defaults.seed;
    wallInput.value = defaults.knockDown;

    // Generate initial maze
    customMaze();

    // Register the listener to the settings form
    settingsForm.addEventListener("submit", customMaze);

    // Setup the random seed button
    seedButton.addEventListener("click", function (e) {
        e.preventDefault();
        let max = 999999;
        let min = 0;
        seedInput.value = Math.floor(Math.random() * (max - min + 1)) + min;
        customMaze();
    });

});

function createMazeWithSettings(size, seed, knockDown) {

    // Seed the random number generator
    data.seed = seed;

    // Ensure we are displaying the grid properly.
    document.getElementById("style").innerHTML = `.cell { flex-basis: ${(1 / size) * 100}%; }`;

    let map = new CellMap(size, size);
    map.Init();

    Generator.BuildMaze(map);
    Generator.KnockDownWalls(map, knockDown);

    // Print the cells on the page.
    data.maze.innerHTML = "";
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let cell = map.cells[y][x];
            cell.node.textContent = cell.ToString();
            cell.UpdateWalls();
            data.maze.appendChild(cell.node);
        }
    }
}


/**
 * Seeded random number generator.
 * The output is based on the 
 * 
 * @return {number}
 */
function seededRandom() {
    let x = Math.sin(data.seed++) * 10000;
    return x - Math.floor(x);
}


/**
 * Get a random integer between the given min and max values
 * 
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
function random(min, max) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
}


/**
 * Get a random element from an array, but return null if the array is empty
 * 
 * @param {Array} array
 * @return {null|*}
 */
function randomArrayValue(array) {
    if (array.length > 0) {
        return array[random(0, array.length - 1)];
    }

    return null;
}

/**
 * Get the opposite direction.
 * There should be a simpler way to do this right? This feels clunky...
 * 
 * Directions are represented as numbers.
 *  - north/up = 0
 *  - east/right = 1
 *  - south/down = 2
 *  - left/west = 3
 * 
 * @param {number} direction
 * @return {number}
 */
function oppositeWall(direction) {
    switch (direction) {
        case 0:
            return 2;
        case 1:
            return 3;
        case 2:
            return 0;
        case 3:
        default:
            return 1;
    }
}

class Cell {
    /**
     * @param {CellMap} map
     * @param {number} x
     * @param {number} y
     */
    constructor(map, x, y) {
        this.map = map;

        this.walls = [ // should be map <(enum value),(bool state)>?
            true, // 0 - north
            true, // 1 - east
            true, // 2 - south
            true  // 3 - west
        ];

        this.x = x;
        this.y = y;
        this.node = document.createElement("div");
        this.node.classList.add("cell");

        this.open = false;
    }

    /**
     * @return {string}
     */
    ToString() {
        return `${this.x}, ${this.y}`;
    }

    /**
     * Set the class names for the cell's walls
     */
    UpdateWalls() {
        this.walls.forEach((state, i) => {
            this.node.classList.toggle(`wall-${i}`, state);
        });
    }

    /**
     * Get the directions with walls.
     * Important: We exclude walls on the outer border of the maze
     */
    WallDirections() {
        let directions = [];

        if (this.walls[0] && this.y > 0) directions.push(0);
        if (this.walls[1] && this.x < this.map.width - 1) directions.push(1);
        if (this.walls[2] && this.y < this.map.height - 1) directions.push(2);
        if (this.walls[3] && this.x > 0) directions.push(3);

        return directions;
    }

    /**
     * Get the neighour cell in a specific direction.
     * 
     * @return {null|Cell}
     */
    GetNeighbour(direction) {
        switch (direction) {
            case 0:
                return this.map.GetCellAt(this.x, this.y - 1);
            case 1:
                return this.map.GetCellAt(this.x + 1, this.y);
            case 2:
                return this.map.GetCellAt(this.x, this.y + 1);
            case 3:
            default:
                return this.map.GetCellAt(this.x - 1, this.y);
        }
    }

    /**
     * Set the wall state of the cell in one direction.
     * This also updates any potential neighbour in that direction
     * 
     * @param {number} direction
     * @param {bool} state
     */
    SetWall(direction, state) {
        this.walls[direction] = state;
        let neighbour = this.GetNeighbour(direction);
        if (neighbour) {
            neighbour.walls[oppositeWall(direction)] = state;
        }
    }
}

class CellMap {
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        this.cells = [];
        this.height = height;
        this.width = width;
    }

    /**
     * Create all the base cells for the map
     */
    Init() {
        this.cells = [];
        for (let y = 0; y < this.height; y++) {
            let row = [];
            for (let x = 0; x < this.width; x++) {
                row[x] = new Cell(this, x, y);
            }
            this.cells[y] = row;
        }
    }

    /**
     * Get a cell at a set of coordinates.
     * 
     * @param {number} x
     * @param {number} y
     * @return {null|Cell}
     */
    GetCellAt(x, y) {
        let row = this.cells[y];
        if (typeof row !== "undefined") {
            let cell = row[x];
            if (typeof cell !== "undefined") {
                return cell;
            }
        }

        return null;
    }
}

class Generator {
    /**
     * "Snakes" through the cells of a map randomly and creates the maze
     * 
     * @param {CellMap} map
     */
    static BuildMaze(map) {

        let startX = 0; //random(0, map.width - 1);
        let startY = random(0, map.height - 1);
        let startCell = map.cells[startY][startX];

        startCell.SetWall(3, false); // open wall to left
        startCell.node.classList.add("start");
        startCell.open = true;

        let totalCells = map.width * map.height;
        let openCells = 1;
        let previous = startCell;

        while (openCells < totalCells) {

            let randomCell;
            if (random(0, 100) > 50) { // Prefer previous cell
                randomCell = previous;
            } else {
                randomCell = Generator.RandomOpenCell(map);
            }

            if (!randomCell) {
                break;
            }

            let target = Generator.RandomClosedSibling(randomCell);
            if (!target) {
                continue;
            }

            openCells++;
            target.cell.open = true;
            randomCell.SetWall(target.direction, false);
            previous = target.cell;
        }

        // Place an exit
        let exitDirection = randomArrayValue([0, 1, 2]); // any except starting direction
        let exit;
        if (exitDirection == 0) {
            exit = map.GetCellAt(random(0, map.width - 1), 0);
        } else if (exitDirection == 1) {
            exit = map.GetCellAt(map.width - 1, random(0, map.height - 1));
        } else if (exitDirection == 2) {
            exit = map.GetCellAt(random(0, map.width - 1), map.height - 1);
        }

        exit.SetWall(exitDirection, false);
        exit.node.classList.add("exit");

    }

    /**
     * Knock down a set number of walls on a map
     * 
     * @param {CellMap} map
     * @param {number} count
     */
    static KnockDownWalls(map, count = 1) {
        for (let i = 0; i < count; i++) {

            let cell;
            let directions;
            let maxTries = count * 4; // To stop infinite loops when there are no walls left. todo: check if there are walls left instead.
            let tries = 0;
            do {
                cell = Generator.RandomOpenCell(map);
                directions = cell.WallDirections();
            } while (directions.length == 0 || ++tries > maxTries);

            cell.SetWall(randomArrayValue(directions), false);
        }
    }

    /**
     * Get a random cell that has been marked as open
     * 
     * @param {CellMap} map
     * @return {null|Cell}
     */
    static RandomOpenCell(map) {
        let possibilities = [];

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                let cell = map.cells[y][x];
                if (cell.open) {
                    possibilities.push(cell);
                }
            }
        }

        return randomArrayValue(possibilities);
    }

    /**
     * Find a random neighbour of a cell that is closed.
     * 
     * @return {null|Cell}
     */
    static RandomClosedSibling(cell) {
        let available = [];
        [0, 1, 2, 3].forEach(direction => {
            let possibleTarget = cell.GetNeighbour(direction);
            if (possibleTarget !== null && possibleTarget.open === false) {
                available.push({ direction, cell: possibleTarget });
            }
        });

        return randomArrayValue(available);
    }
}

