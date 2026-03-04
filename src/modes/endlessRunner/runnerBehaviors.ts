import { registerBehavior } from '../../core2d/Systems/ScriptSystem';
import { RUNNER_LANE_Y } from './runnerPrefabs';

let playerLane = 1;

export function resetRunnerPlayerLane(): void {
  playerLane = 1;
}

export function registerRunnerBehaviors(): void {
  registerBehavior('runner_player_controller', (entity, ctx) => {
    const { world, input } = ctx;
    const transform = world.getComponent(entity, 'transform');
    if (!transform) return;
    let newLane = playerLane;
    if (input.justPressed('move_left')) newLane = Math.max(0, playerLane - 1);
    if (input.justPressed('move_right')) newLane = Math.min(RUNNER_LANE_Y.length - 1, playerLane + 1);
    playerLane = newLane;
    transform.position.y = RUNNER_LANE_Y[newLane];
    transform.position.x = 0;
  });
}
