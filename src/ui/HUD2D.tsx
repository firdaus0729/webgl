import { useEffect, useState } from 'react';
import type { Engine2D } from '../core2d/Engine2D';
import './HUD2D.css';

interface HUD2DProps {
  engine: Engine2D | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function HUD2D({ engine }: HUD2DProps) {
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [timeRemaining, setTimeRemaining] = useState(90);

  useEffect(() => {
    if (!engine) return;
    const services = engine.getServices();
    const tick = () => {
      setPlayerHealth(services.getPlayerHealth?.() ?? 100);
      setOpponentHealth(services.getOpponentHealth?.() ?? 100);
      setTimeRemaining(services.getTimeRemaining?.() ?? 90);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [engine]);

  return (
    <div className="hud2d">
      <div className="hud2d-health-row">
        <div className="hud2d-health-block">
          <div className="hud2d-label">You</div>
          <div className="hud2d-bar-wrap">
            <div className="hud2d-bar hud2d-bar-player" style={{ width: `${playerHealth}%` }} />
          </div>
          <div className="hud2d-value">{playerHealth}/100</div>
        </div>
        <div className="hud2d-timer">{formatTime(timeRemaining)}</div>
        <div className="hud2d-health-block">
          <div className="hud2d-label">Opponent</div>
          <div className="hud2d-bar-wrap">
            <div className="hud2d-bar hud2d-bar-opponent" style={{ width: `${opponentHealth}%` }} />
          </div>
          <div className="hud2d-value">{opponentHealth}/100</div>
        </div>
      </div>
    </div>
  );
}
