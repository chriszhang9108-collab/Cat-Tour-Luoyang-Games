import type { HapticCueId } from '../data/audio';

const HAPTIC_PATTERNS: Readonly<Record<HapticCueId, number | readonly number[]>> = {
  soft_touch: 8,
  purr: [12, 64, 12],
  surprised: 16,
  annoyed: [18, 42, 18],
};

export class HapticsManager {
  private readonly abortController = new AbortController();
  private enabled = true;

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibilityChange, {
      signal: this.abortController.signal,
    });
  }

  isSupported(): boolean {
    return typeof navigator.vibrate === 'function';
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  play(cue: HapticCueId): boolean {
    if (!this.enabled || !this.isSupported()) {
      return false;
    }

    try {
      return navigator.vibrate([...asPattern(HAPTIC_PATTERNS[cue])]);
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.isSupported()) {
      navigator.vibrate(0);
    }
  }

  destroy(): void {
    this.abortController.abort();
    this.stop();
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.stop();
  };
}

function asPattern(pattern: number | readonly number[]): readonly number[] {
  return typeof pattern === 'number' ? [pattern] : pattern;
}
