import { useEffect, useRef, useState } from 'react';
import { GameManager } from './engine/gameManager';
import { ModeSelector } from './ui/ModeSelector';
import { CanvasGameView } from './ui/CanvasGameView';
import { HUD } from './ui/HUD';
import { EndScreen } from './ui/EndScreen';
import { PauseScreen } from './ui/PauseScreen';
import { StartScreen } from './ui/StartScreen';
import type { GameModeConfig } from './core2d/GameModeConfig';
import type { GameModeId } from './core2d/Types';
import './App.css';

type AppView = '2d_menu' | '2d_playing' | '3d';

function App() {
  const [view, setView] = useState<AppView>('2d_menu');
  const [gameConfig, setGameConfig] = useState<GameModeConfig | null>(null);
  const [gameTemplate, setGameTemplate] = useState<GameModeId>('boxing');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [gameManager, setGameManager] = useState<GameManager | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (view !== '3d' || !canvasRef.current) return;
    try {
      const manager = new GameManager(canvasRef.current);
      gameManagerRef.current = manager;
      setGameManager(manager);
      setInitError(null);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Failed to start game.');
      setGameManager(null);
      gameManagerRef.current = null;
    }
    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
        gameManagerRef.current = null;
      }
    };
  }, [view]);

  const handle2DStart = (config: GameModeConfig, template: GameModeId) => {
    setGameConfig(config);
    setGameTemplate(template);
    setView('2d_playing');
  };

  const handle2DBack = () => {
    setView('2d_menu');
    setGameConfig(null);
  };

  if (view === '2d_menu') {
    return (
      <div className="app">
        <ModeSelector onStart={handle2DStart} />
        <a href="#" className="app-3d-link" onClick={(e) => { e.preventDefault(); setView('3d'); }}>
          Play 3D prototype
        </a>
      </div>
    );
  }

  if (view === '2d_playing' && gameConfig) {
    return (
      <div className="app">
        <CanvasGameView config={gameConfig} template={gameTemplate} onBack={handle2DBack} />
      </div>
    );
  }

  if (view === '3d') {
    if (initError) {
      return (
        <div className="app app-error">
          <div className="error-overlay">
            <h1>Cannot start game</h1>
            <p>{initError}</p>
            <p className="error-hint">Try another browser or enable hardware acceleration.</p>
            <button type="button" onClick={() => setView('2d_menu')}>Back to 2D</button>
          </div>
        </div>
      );
    }
    return (
      <div className="app">
        <canvas ref={canvasRef} className="game-canvas" />
        {!gameStarted && (
          <StartScreen
            onStart={async () => {
              if (gameManagerRef.current) {
                try {
                  await gameManagerRef.current.startGame();
                  setGameStarted(true);
                } catch {
                  console.warn('Pointer lock denied');
                }
              }
            }}
          />
        )}
        {gameManager && gameStarted && <HUD gameManager={gameManager} />}
        {gameManager && <EndScreen gameManager={gameManager} onRestart={() => { gameManager.restart(); setGameStarted(false); }} />}
        {gameManager && <PauseScreen gameManager={gameManager} />}
        <a href="#" className="app-3d-link" onClick={(e) => { e.preventDefault(); setView('2d_menu'); }}>
          Back to 2D
        </a>
      </div>
    );
  }

  return null;
}

export default App;
