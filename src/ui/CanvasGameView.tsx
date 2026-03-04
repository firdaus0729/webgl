import { useEffect, useRef, useState } from 'react';
import { Engine2D } from '../core2d/Engine2D';
import { boxingMode } from '../modes/boxing/boxingMode';
import { arenaMode } from '../modes/topdownArena/arenaMode';
import { runnerMode } from '../modes/endlessRunner/runnerMode';
import { gridMode } from '../modes/gridBoard/gridMode';
import type { GameModeConfig } from '../core2d/GameModeConfig';
import type { GameModeId } from '../core2d/Types';
import { HUD2D } from './HUD2D';
import './CanvasGameView.css';

const MODE_MAP: Partial<Record<GameModeId, typeof boxingMode>> = {
  boxing: boxingMode,
  topdown_arena: arenaMode as typeof boxingMode,
  endless_runner: runnerMode as typeof boxingMode,
  grid_board: gridMode as typeof boxingMode,
};

const CONTROLS_HINT: Record<GameModeId, string> = {
  boxing: 'A / D move · J or left-click punch',
  topdown_arena: 'WASD move · Click or Space shoot',
  endless_runner: 'A / D switch lanes',
  grid_board: 'A / D select column · Enter drop',
};

interface CanvasGameViewProps {
  config: GameModeConfig;
  template: GameModeId;
  onBack: () => void;
}

type GameResult = { playerWon: boolean; isDraw?: boolean } | null;

export function CanvasGameView({ config, template, onBack }: CanvasGameViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine2D | null>(null);
  const [engine, setEngine] = useState<Engine2D | null>(null);
  const [gameResult, setGameResult] = useState<GameResult>(null);

  useEffect(() => {
    const container = containerRef.current;
    const mode = MODE_MAP[template];
    if (!container || !mode) return;

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const resize = () => {
      canvas.width = container!.clientWidth;
      canvas.height = container!.clientHeight;
    };
    window.addEventListener('resize', resize);

    const eng = new Engine2D({
      canvas,
      mode,
      config,
    });
    engineRef.current = eng;
    setEngine(eng);

    const unsubDie = eng.getEvents().subscribe('entity_died', (e) => {
      if (e.type !== 'entity_died') return;
      const world = eng.getWorld();
      const tag = world.getComponent(e.entity, 'tag');
      const playerWon = tag?.value === 'opponent';
      setGameResult({ playerWon });
    });

    const unsubRound = eng.getEvents().subscribe('round_ended', (e) => {
      if (e.type !== 'round_ended') return;
      const isDraw = e.winner === 'draw';
      const playerWon = e.winner === 'player';
      setGameResult({ playerWon, isDraw });
    });

    eng.start();

    return () => {
      unsubDie();
      unsubRound();
      eng.stop();
      engineRef.current = null;
      setEngine(null);
      setGameResult(null);
      window.removeEventListener('resize', resize);
      container.removeChild(canvas);
    };
  }, [template, config.camera.mode]);

  const handleRestart = () => {
    setGameResult(null);
    engineRef.current?.restart();
  };

  const showHUD = template === 'boxing' || template === 'topdown_arena';

  return (
    <div className="canvas-game-view">
      <div ref={containerRef} className="canvas-game-view-canvas-wrap" />
      <div className="canvas-game-view-controls-hint">{CONTROLS_HINT[template]}</div>
      {engine && showHUD && <HUD2D engine={engine} />}
      <button type="button" className="canvas-game-view-back" onClick={onBack}>
        Back to menu
      </button>
      {gameResult && (
        <div className="canvas-game-view-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
          <div className={`canvas-game-view-result-modal canvas-game-view-result-modal--${gameResult.isDraw ? 'draw' : gameResult.playerWon ? 'win' : 'lose'}`}>
            <h2 id="game-result-title" className="canvas-game-view-result-title">
              {gameResult.isDraw ? 'Draw' : gameResult.playerWon ? 'Victory' : 'Defeat'}
            </h2>
            <p className="canvas-game-view-result-subtitle">
              {gameResult.isDraw ? 'No winner this round.' : gameResult.playerWon ? 'You won the match!' : 'The opponent won the match.'}
            </p>
            <div className="canvas-game-view-result-actions">
              <button type="button" className="canvas-game-view-result-btn canvas-game-view-result-btn-primary" onClick={handleRestart}>
                Restart
              </button>
              <button type="button" className="canvas-game-view-result-btn canvas-game-view-result-btn-secondary" onClick={onBack}>
                Back to menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
