export type IdleLevel = 3 | 8 | 15;

interface IdleManagerCallbacks {
  readonly onIdle: (level: IdleLevel) => void;
  readonly onCancel: () => void;
  readonly onTick?: (elapsedMs: number, deltaMs: number) => void;
}

const IDLE_LEVELS: readonly IdleLevel[] = [3, 8, 15];

export class IdleManager {
  static activeInstanceCount = 0;

  private readonly abortController = new AbortController();
  private readonly timer: number;
  private readonly triggeredLevels = new Set<IdleLevel>();
  private lastActivityAt = performance.now();
  private lastTickAt = this.lastActivityAt;
  private hiddenAt: number | null = null;
  private destroyed = false;

  constructor(private readonly callbacks: IdleManagerCallbacks) {
    IdleManager.activeInstanceCount += 1;
    this.timer = window.setInterval(() => this.tick(), 250);
    document.addEventListener('visibilitychange', this.onVisibilityChange, {
      signal: this.abortController.signal,
    });
  }

  recordActivity(): void {
    const now = performance.now();
    this.lastActivityAt = now;
    this.lastTickAt = now;
    this.triggeredLevels.clear();
    this.callbacks.onCancel();
    this.callbacks.onTick?.(0, 0);
  }

  getElapsedMs(): number {
    return Math.max(0, performance.now() - this.lastActivityAt);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    IdleManager.activeInstanceCount -= 1;
    window.clearInterval(this.timer);
    this.abortController.abort();
    this.triggeredLevels.clear();
  }

  private tick(): void {
    if (document.hidden || this.destroyed) {
      return;
    }

    const now = performance.now();
    const deltaMs = Math.max(0, now - this.lastTickAt);
    const elapsedMs = Math.max(0, now - this.lastActivityAt);
    this.lastTickAt = now;
    this.callbacks.onTick?.(elapsedMs, deltaMs);

    const dueLevels = IDLE_LEVELS.filter(
      (level) => elapsedMs >= level * 1000 && !this.triggeredLevels.has(level),
    );

    if (dueLevels.length > 0) {
      dueLevels.forEach((level) => this.triggeredLevels.add(level));
      this.callbacks.onIdle(dueLevels[dueLevels.length - 1]);
    }
  }

  private readonly onVisibilityChange = (): void => {
    const now = performance.now();

    if (document.hidden) {
      this.hiddenAt = now;
      return;
    }

    if (this.hiddenAt !== null) {
      const hiddenDuration = now - this.hiddenAt;
      this.lastActivityAt += hiddenDuration;
      this.lastTickAt = now;
      this.hiddenAt = null;
    }
  };
}
