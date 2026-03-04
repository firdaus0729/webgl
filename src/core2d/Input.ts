export type ActionId =
  | 'move_left'
  | 'move_right'
  | 'move_up'
  | 'move_down'
  | 'jump'
  | 'attack_primary'
  | 'attack_secondary'
  | 'confirm'
  | 'cancel'
  | 'pause';

export type InputMapping = Partial<Record<ActionId, string[]>>;

/** Normalize key: browser uses "a", "ArrowLeft"; mapping may use "KeyA" or "a" */
function normalizeKey(key: string): string {
  const k = key.toLowerCase();
  const keyMap: Record<string, string> = {
    keya: 'a', keyb: 'b', keyc: 'c', keyd: 'd', keye: 'e', keyf: 'f',
    keyg: 'g', keyh: 'h', keyi: 'i', keyj: 'j', keyk: 'k', keyl: 'l',
    keym: 'm', keyn: 'n', keyo: 'o', keyp: 'p', keyq: 'q', keyr: 'r',
    keys: 's', keyt: 't', keyu: 'u', keyv: 'v', keyw: 'w', keyx: 'x',
    keyy: 'y', keyz: 'z',
  };
  return keyMap[k] ?? k;
}

/** Parse "mouse0", "mouse1" -> button number; else null */
function parseMouseButton(binding: string): number | null {
  const m = binding.toLowerCase().match(/^mouse(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private mouseDown: Set<number> = new Set();
  private mouseJustPressed: Set<number> = new Set();
  private mapping: InputMapping;

  constructor(mapping: InputMapping, _canvas?: HTMLCanvasElement | null) {
    this.mapping = mapping;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = normalizeKey(e.key);
      if (!this.keysDown.has(key)) {
        this.keysJustPressed.add(key);
      }
      this.keysDown.add(key);
      if (['a', 'd', 'j', 'k', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(normalizeKey(e.key));
    });

    window.addEventListener('mousedown', (e) => {
      const btn = e.button;
      if (!this.mouseDown.has(btn)) {
        this.mouseJustPressed.add(btn);
      }
      this.mouseDown.add(btn);
      e.preventDefault();
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseDown.delete(e.button);
    });
  }

  setMapping(mapping: InputMapping): void {
    this.mapping = mapping;
  }

  isActionDown(action: ActionId): boolean {
    const keys = this.mapping[action];
    if (!keys) return false;
    for (const binding of keys) {
      const mouse = parseMouseButton(binding);
      if (mouse !== null) {
        if (this.mouseDown.has(mouse)) return true;
      } else {
        const norm = normalizeKey(binding);
        if (this.keysDown.has(norm)) return true;
      }
    }
    return false;
  }

  justPressed(action: ActionId): boolean {
    const keys = this.mapping[action];
    if (!keys) return false;
    for (const binding of keys) {
      const mouse = parseMouseButton(binding);
      if (mouse !== null) {
        if (this.mouseJustPressed.has(mouse)) return true;
      } else {
        const norm = normalizeKey(binding);
        if (this.keysJustPressed.has(norm)) return true;
      }
    }
    return false;
  }

  consumeJustPressed(): void {
    this.keysJustPressed.clear();
    this.mouseJustPressed.clear();
  }

  dispose(): void {
    this.keysDown.clear();
    this.keysJustPressed.clear();
    this.mouseDown.clear();
    this.mouseJustPressed.clear();
  }
}
