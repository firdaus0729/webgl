import { useEffect, useRef, useState } from 'react';
import { GameManager } from './engine/gameManager';
import { HUD } from './ui/HUD';
import { EndScreen } from './ui/EndScreen';
import { PauseScreen } from './ui/PauseScreen';
import { StartScreen } from './ui/StartScreen';
import { Crosshair } from './ui/Crosshair';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [gameManager, setGameManager] = useState<GameManager | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);

  // Track online/offline so the app works and informs the user in both cases
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const manager = new GameManager(canvasRef.current);
      gameManagerRef.current = manager;
      setGameManager(manager);
      setInitError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start game.';
      setInitError(message);
      setGameManager(null);
      gameManagerRef.current = null;
    }

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.dispose();
        gameManagerRef.current = null;
      }
    };
  }, []);

  const handleStart = async () => {
    if (gameManagerRef.current && !gameStarted) {
      try {
        await gameManagerRef.current.startGame();
        // Only update state if startGame succeeded
        setGameStarted(true);
      } catch (error) {
        // startGame failed (likely pointer lock denied)
        // Don't update state, let user try again
        console.warn('Failed to start game:', error);
      }
    }
  };

  const handleRestart = () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.restart();
      setGameStarted(false);
      // Reset game started state so start screen shows again
    }
  };

  // Handle canvas click to re-request pointer lock after pause
  useEffect(() => {
    if (!canvasRef.current || !gameManager) return;

    const handleCanvasClick = async () => {
      if (gameManager && gameManager.isPaused()) {
        // Unpause and re-request pointer lock when clicking canvas after pause
        try {
          await gameManager.unpause();
        } catch (error) {
          console.warn('Failed to unpause:', error);
        }
      }
    };

    canvasRef.current.addEventListener('click', handleCanvasClick);
    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('click', handleCanvasClick);
      }
    };
  }, [gameManager]);

  if (initError) {
    return (
      <div className="app app-error">
        <div className="error-overlay">
          <h1>Cannot start game</h1>
          <p>{initError}</p>
          <p className="error-hint">Try another browser or enable hardware acceleration in settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <canvas ref={canvasRef} className="game-canvas" />
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`} aria-live="polite">
        {isOnline ? null : <span>Offline — game runs from cache</span>}
      </div>
      {!gameStarted && <StartScreen onStart={handleStart} />}
      {gameManager && gameStarted && <Crosshair />}
      {gameManager && <HUD gameManager={gameManager} />}
      {gameManager && <EndScreen gameManager={gameManager} onRestart={handleRestart} />}
      {gameManager && <PauseScreen gameManager={gameManager} />}
    </div>
  );
}

export default App;
