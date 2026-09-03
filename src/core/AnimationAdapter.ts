export interface AnimationAdapter {
  readonly currentAnimation: string;
  play(animationName: string): void;
  stop(): void;
  reset(): void;
  destroy(): void;
}
