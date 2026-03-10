import { useState } from 'react';
import type { GameModeId } from '../core2d/Types';
import type { GameModeConfig } from '../core2d/GameModeConfig';
import { textToConfig } from '../prompt/textToConfig';
import './ModeSelector.css';

const TEMPLATES: { id: GameModeId; label: string }[] = [
  { id: 'boxing', label: 'Boxing (side-view duel)' },
  { id: 'platformer', label: 'Platformer (Mario style)' },
  { id: 'topdown_arena', label: 'Top-down shooter' },
  { id: 'endless_runner', label: 'Endless runner' },
  { id: 'grid_board', label: 'Grid / Connect 4' },
];

interface ModeSelectorProps {
  onStart: (config: GameModeConfig, template: GameModeId) => void;
}

export function ModeSelector({ onStart }: ModeSelectorProps) {
  const [template, setTemplate] = useState<GameModeId>('boxing');
  const [promptText, setPromptText] = useState('');

  const handlePlay = () => {
    const config = textToConfig({ template, text: promptText });
    onStart(config, template);
  };

  return (
    <div className="mode-selector">
      <div className="mode-selector-card">
        <h1 className="mode-selector-title">2D Game</h1>
        <p className="mode-selector-step">Step 1: Select template</p>
        <select
          className="mode-selector-select"
          value={template}
          onChange={(e) => setTemplate(e.target.value as GameModeId)}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mode-selector-step">Step 2: Describe your game (optional)</p>
        <input
          type="text"
          className="mode-selector-input"
          placeholder="e.g. Fast aggressive boxer in a neon arena"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
        />
        <p className="mode-selector-step">Step 3: Play</p>
        <button className="mode-selector-play" onClick={handlePlay}>
          Play
        </button>
      </div>
    </div>
  );
}
