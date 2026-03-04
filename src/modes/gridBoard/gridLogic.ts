export type Cell = 0 | 1 | 2;

export function createGrid(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0) as Cell[]);
}

export function dropToken(grid: Cell[][], col: number, player: 1 | 2): boolean {
  if (col < 0 || col >= grid[0].length) return false;
  for (let r = grid.length - 1; r >= 0; r--) {
    if (grid[r][col] === 0) {
      grid[r][col] = player;
      return true;
    }
  }
  return false;
}

export function getEmptyCols(grid: Cell[][]): number[] {
  const cols: number[] = [];
  for (let c = 0; c < grid[0].length; c++) {
    if (grid[0][c] === 0) cols.push(c);
  }
  return cols;
}

export function checkWin(grid: Cell[][], connectN: number): 0 | 1 | 2 {
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell === 0) continue;
      if (c + connectN <= cols && grid[r].slice(c, c + connectN).every((v) => v === cell)) return cell as 1 | 2;
      if (r + connectN <= rows) {
        let ok = true;
        for (let i = 0; i < connectN; i++) if (grid[r + i][c] !== cell) { ok = false; break; }
        if (ok) return cell as 1 | 2;
      }
      if (r + connectN <= rows && c + connectN <= cols) {
        let ok = true;
        for (let i = 0; i < connectN; i++) if (grid[r + i][c + i] !== cell) { ok = false; break; }
        if (ok) return cell as 1 | 2;
      }
      if (r - connectN + 1 >= 0 && c + connectN <= cols) {
        let ok = true;
        for (let i = 0; i < connectN; i++) if (grid[r - i][c + i] !== cell) { ok = false; break; }
        if (ok) return cell as 1 | 2;
      }
    }
  }
  return 0;
}

export function isFull(grid: Cell[][]): boolean {
  return grid[0].every((v) => v !== 0);
}

export function getLastFilledRow(grid: Cell[][], col: number, player: 1 | 2): number {
  for (let r = grid.length - 1; r >= 0; r--) {
    if (grid[r][col] === player) return r;
  }
  return -1;
}
