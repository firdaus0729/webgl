import { useEffect, useState } from 'react';
import { GameManager } from '../engine/gameManager';
import './PauseScreen.css';

interface PauseScreenProps {
  gameManager: GameManager | null;
}

export function PauseScreen({ gameManager }: PauseScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!gameManager) return;

    const handleStateChange = (state: string) => {
      setVisible(state === 'paused');
    };

    gameManager.onStateChange(handleStateChange);

    return () => {
      // Cleanup handled by gameManager
    };
  }, [gameManager]);

  if (!visible) return null;

  return (
    <div className="pause-screen">
      <div className="pause-content">
        <h1 className="pause-title">PAUSED</h1>
        <p className="pause-instruction">Press ESC to resume</p>
        <p className="pause-note">Click the canvas to re-lock mouse pointer</p>
      </div>
    </div>
  );
}

