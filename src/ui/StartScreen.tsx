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
        <img src="/logo.jpg" alt="Logo" className="start-logo" />
        <h1 className="start-title">Kickboxing Arena</h1>
        <p className="start-instruction">Click to Start</p>
        <p className="start-controls">
          WASD: Move | Mouse: Look | Space: Jump | Left Click: Punch | ESC: Pause
        </p>
      </div>
    </div>
  );
}

