import type { AnimationAdapter } from './AnimationAdapter';

/**
 * 第一阶段的 CSS 动画适配器。
 * 视觉节点始终只有一个 data-animation，因此不可能叠加两个主动画。
 */
export class AnimationController implements AnimationAdapter {
  currentAnimation = 'NONE';
  private destroyed = false;

  constructor(private readonly target: HTMLElement) {}

  play(animationName: string): void {
    if (this.destroyed) {
      return;
    }

    this.stop();
    // 触发一次布局，使连续播放同名动画时也能从第 0 帧重新开始。
    this.target.getBoundingClientRect();
    this.target.dataset.animation = animationName;
    this.currentAnimation = animationName;
  }

  stop(): void {
    delete this.target.dataset.animation;
    this.currentAnimation = 'NONE';
  }

  reset(): void {
    this.play('idle_base');
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.stop();
    this.destroyed = true;
  }
}
