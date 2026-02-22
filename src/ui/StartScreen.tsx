import './StartScreen.css';

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
  };

  return (
    <div className="start-screen" onClick={handleClick}>
      <div className="start-content" onClick={handleClick}>
        <h1 className="start-title">FPS Arena Shooter</h1>
        <p className="start-instruction">Click to Start</p>
        <p className="start-controls">
          WASD: Move | Mouse: Look | Space: Jump | Left Click: Shoot | ESC: Pause
        </p>
      </div>
    </div>
  );
}

