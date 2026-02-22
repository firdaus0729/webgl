import { useEffect, useState } from 'react';
import { GameManager } from '../engine/gameManager';
import './EndScreen.css';

interface EndScreenProps {
  gameManager: GameManager | null;
  onRestart: () => void;
}

export function EndScreen({ gameManager, onRestart }: EndScreenProps) {
  const [visible, setVisible] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [playerKills, setPlayerKills] = useState(0);
  const [botKills, setBotKills] = useState(0);

  useEffect(() => {
    if (!gameManager) return;

    const handleStateChange = (state: string) => {
      if (state === 'matchEnded') {
        setVisible(true);
        const kills = gameManager.getPlayerKills();
        const botK = gameManager.getBotKills();
        setPlayerKills(kills);
        setBotKills(botK);
        const winner = gameManager.getMatchWinner();
        setPlayerWon(winner === 'player');
      } else {
        setVisible(false);
      }
    };

    gameManager.onStateChange(handleStateChange);

    return () => {
      // Cleanup handled by gameManager
    };
  }, [gameManager]);

  if (!visible) return null;

  return (
    <div className="end-screen">
      <div className="end-screen-content">
        <h1 className="end-screen-title">
          {playerWon ? 'Victory!' : 'Defeat!'}
        </h1>
        <div className="end-screen-score">
          <div className="end-score-item">
            <span className="end-score-label">You</span>
            <span className="end-score-value">{playerKills}</span>
          </div>
          <div className="end-score-separator">-</div>
          <div className="end-score-item">
            <span className="end-score-label">Bot</span>
            <span className="end-score-value">{botKills}</span>
          </div>
        </div>
        <button className="restart-button" onClick={onRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}

