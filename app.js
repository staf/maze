class Cell {
    /**
     * @property {CellMap} map
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

    ToString() {
        return `${this.x}, ${this.y}`;
    }

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

    SetWall(direction, state) {
        this.walls[direction] = state;
        let neighbour = this.GetNeighbour(direction);
        if (neighbour) {
            neighbour.walls[oppositeWall(direction)] = state;
        }
    }
}

class CellMap {
    constructor(width, height) {
        this.cells = [];
        this.height = height;
        this.width = width;
    }

    GenerateMap() {
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
    static Generate(map) {

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

function randomArrayValue(array) {
    if (array.length > 0) {
        return array[random(0, array.length - 1)];
    }

    return null;
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

document.addEventListener("DOMContentLoaded", function () {

    let board = document.getElementById("game");
    let width = 20;
    let height = 20;
    let map = new CellMap(width, height);

    document.getElementById("style").innerHTML = `.cell { flex-basis: ${(1 / width) * 100}%; }`;

    map.GenerateMap(width, height);

    Generator.Generate(map);
    //Generator.KnockDownWalls(map, 50);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let cell = map.cells[y][x];
            cell.node.textContent = cell.ToString();
            cell.UpdateWalls();
            board.appendChild(cell.node);
        }
    }

});


