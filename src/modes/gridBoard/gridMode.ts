import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import type { Component } from '../../core2d/Components';
import { gridDefaultConfig } from './gridConfig';
import { createGrid, dropToken, getEmptyCols, checkWin, isFull, getLastFilledRow, type Cell } from './gridLogic';

const CELL_W = 1.2;
const CELL_H = 1.2;

function worldPos(col: number, row: number, cols: number, rows: number): { x: number; y: number } {
  const cx = (col - (cols - 1) / 2) * CELL_W;
  const cy = (row - (rows - 1) / 2) * CELL_H;
  return { x: cx, y: cy };
}

function createTokenComponents(
  col: number,
  row: number,
  cols: number,
  rows: number,
  player: 1 | 2
): Component[] {
  const pos = worldPos(col, row, cols, rows);
  const spriteId = player === 1 ? 'token_red' : 'token_yellow';
  return [
    { kind: 'transform', position: pos, rotation: 0, scale: { x: 0.9, y: 0.9 } },
    { kind: 'sprite', spriteId, layer: 'world' },
    { kind: 'tag', value: 'token' },
  ];
}

let gridState: Cell[][] = [];
let humanTurn = true;
let selectedCol = 0;
let gameOverWinner: 0 | 1 | 2 = 0;

export const gridMode: GameMode = {
  id: 'grid_board',
  defaultConfig: gridDefaultConfig,

  setupMatch(world: World, config: GameModeConfig, _services: ModeServices): void {
    world.clear();
    const g = config.gridBoard;
    const rows = g?.rows ?? 6;
    const cols = g?.cols ?? 7;
    humanTurn = g?.humanStarts ?? true;
    gameOverWinner = 0;
    selectedCol = Math.floor(cols / 2);
    gridState = createGrid(rows, cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const pos = worldPos(c, r, cols, rows);
        world.createEntity([
          { kind: 'transform', position: pos, rotation: 0, scale: { x: 1, y: 1 } },
          { kind: 'sprite', spriteId: 'board_slot', layer: 'background' },
          { kind: 'collider', shape: 'rect', width: CELL_W * 0.9, height: CELL_H * 0.9, isTrigger: true, mask: 0 },
        ]);
      }
    }
  },

  update(world, _time, ctx) {
    if (gameOverWinner !== 0) return;
    const config = ctx.config.gridBoard;
    const rows = config?.rows ?? 6;
    const cols = config?.cols ?? 7;
    const connectN = config?.connectN ?? 4;

    if (humanTurn) {
      if (ctx.input.justPressed('move_left')) selectedCol = Math.max(0, selectedCol - 1);
      if (ctx.input.justPressed('move_right')) selectedCol = Math.min(cols - 1, selectedCol + 1);
      if (ctx.input.justPressed('confirm')) {
        if (dropToken(gridState, selectedCol, 1)) {
          const r = getLastFilledRow(gridState, selectedCol, 1);
          if (r >= 0) {
            world.createEntity(createTokenComponents(selectedCol, r, cols, rows, 1));
          }
          const win = checkWin(gridState, connectN);
          if (win !== 0) {
            gameOverWinner = win;
            ctx.events.emit({ type: 'round_ended', winner: win === 1 ? 'player' : 'opponent' });
            return;
          }
          if (isFull(gridState)) {
            ctx.events.emit({ type: 'round_ended', winner: 'draw' });
            return;
          }
          humanTurn = false;
        }
      }
      return;
    }

    const empty = getEmptyCols(gridState);
    if (empty.length === 0) return;
    const aiCol = empty[Math.floor(Math.random() * empty.length)];
    if (dropToken(gridState, aiCol, 2)) {
      const r = getLastFilledRow(gridState, aiCol, 2);
      if (r >= 0) {
        world.createEntity(createTokenComponents(aiCol, r, cols, rows, 2));
      }
      const win = checkWin(gridState, connectN);
      if (win !== 0) {
        gameOverWinner = win;
        ctx.events.emit({ type: 'round_ended', winner: win === 1 ? 'player' : 'opponent' });
        return;
      }
      if (isFull(gridState)) {
        ctx.events.emit({ type: 'round_ended', winner: 'draw' });
        return;
      }
      humanTurn = true;
    }
  },

  teardownMatch(world: World): void {
    world.clear();
  },
};

export function getGridResult(): 0 | 1 | 2 {
  return gameOverWinner;
}
