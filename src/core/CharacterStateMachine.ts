import type { AnimationAdapter } from './AnimationAdapter';

export type CharacterState =
  | 'IDLE'
  | 'PETTING'
  | 'HAPPY'
  | 'VERY_HAPPY'
  | 'CURIOUS'
  | 'SURPRISED'
  | 'ANNOYED'
  | 'SLEEPY'
  | 'RELAXED';

export interface CharacterStateSnapshot {
  readonly state: CharacterState;
  readonly animation: string;
}

interface CharacterStateTransition {
  readonly animation: string;
  readonly durationMs?: number;
  readonly recoverTo?: CharacterState;
  readonly recoverAnimation?: string;
}

type CharacterStateListener = (snapshot: CharacterStateSnapshot) => void;

export class CharacterStateMachine {
  private state: CharacterState = 'IDLE';
  private recoveryTimer: number | null = null;
  private transitionRevision = 0;
  private destroyed = false;

  constructor(
    private readonly animationAdapter: AnimationAdapter,
    private readonly listener?: CharacterStateListener,
  ) {
    this.animationAdapter.reset();
    this.emit();
  }

  getSnapshot(): CharacterStateSnapshot {
    return {
      state: this.state,
      animation: this.animationAdapter.currentAnimation,
    };
  }

  /**
   * 唯一合法的主状态入口：取消旧恢复任务、停止旧动画、播放新动画，再安全恢复。
   */
  setCharacterState(nextState: CharacterState, transition: CharacterStateTransition): void {
    if (this.destroyed) {
      return;
    }

    this.transitionRevision += 1;
    const revision = this.transitionRevision;
    this.clearRecoveryTimer();
    this.animationAdapter.stop();
    this.state = nextState;
    this.animationAdapter.play(transition.animation);
    this.emit();

    if (!transition.durationMs || transition.durationMs <= 0) {
      return;
    }

    this.recoveryTimer = window.setTimeout(() => {
      this.recoveryTimer = null;
      if (this.destroyed || revision !== this.transitionRevision) {
        return;
      }

      this.setCharacterState(transition.recoverTo ?? 'IDLE', {
        animation: transition.recoverAnimation ?? 'idle_base',
      });
    }, transition.durationMs);
  }

  cancelToIdle(): void {
    this.setCharacterState('IDLE', { animation: 'idle_base' });
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.transitionRevision += 1;
    this.clearRecoveryTimer();
    this.animationAdapter.destroy();
  }

  private clearRecoveryTimer(): void {
    if (this.recoveryTimer !== null) {
      window.clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }

  private emit(): void {
    this.listener?.(this.getSnapshot());
  }
}
