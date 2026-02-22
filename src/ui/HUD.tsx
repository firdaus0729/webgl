import { useEffect, useState } from 'react';
import { GameManager } from '../engine/gameManager';
import './HUD.css';

interface HUDProps {
  gameManager: GameManager | null;
}

export function HUD({ gameManager }: HUDProps) {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerKills, setPlayerKills] = useState(0);
  const [botKills, setBotKills] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [showHitmarker, setShowHitmarker] = useState(false);

  useEffect(() => {
    if (!gameManager) return;

    const updateStats = () => {
      setPlayerHealth(gameManager.getPlayerHealth());
      setPlayerKills(gameManager.getPlayerKills());
      setBotKills(gameManager.getBotKills());
      setTimeRemaining(Math.ceil(gameManager.getMatchTimeRemaining()));
    };

    // Subscribe to updates
    gameManager.onStatsUpdate(() => {
      updateStats();
    });

    // Subscribe to hits for hitmarker
    gameManager.onHit(() => {
      setShowHitmarker(true);
      setTimeout(() => {
        setShowHitmarker(false);
      }, 200);
    });

    // Initial update
    updateStats();

    // Update timer every second
    const timerInterval = setInterval(() => {
      setTimeRemaining(Math.ceil(gameManager.getMatchTimeRemaining()));
    }, 100);

    return () => {
      clearInterval(timerInterval);
    };
  }, [gameManager]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const healthPercentage = (playerHealth / 100) * 100;

  return (
    <div className="hud">
      {/* Health Bar */}
      <div className="hud-health">
        <div className="health-label">Health</div>
        <div className="health-bar-container">
          <div 
            className="health-bar" 
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
        <div className="health-value">{playerHealth}/100</div>
      </div>

      {/* Score */}
      <div className="hud-score">
        <div className="score-item">
          <span className="score-label">You</span>
          <span className="score-value">{playerKills}</span>
        </div>
        <div className="score-separator">-</div>
        <div className="score-item">
          <span className="score-label">Bot</span>
          <span className="score-value">{botKills}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="hud-timer">
        {formatTime(timeRemaining)}
      </div>

      {/* Hitmarker */}
      {showHitmarker && (
        <div className="hitmarker">
          <div className="hitmarker-line hitmarker-line-h" />
          <div className="hitmarker-line hitmarker-line-v" />
        </div>
      )}
    </div>
  );
}

