import type { EmotionValues } from '../data/characters';
import type { EmotionDelta } from '../data/reactions';

export class InteractionSession {
  private affection: number;
  private mood: number;
  private stimulation: number;

  constructor(initialEmotion: EmotionValues) {
    this.affection = initialEmotion.affection;
    this.mood = initialEmotion.mood;
    this.stimulation = initialEmotion.stimulation;
  }

  getSnapshot(): EmotionValues {
    return {
      affection: this.affection,
      mood: this.mood,
      stimulation: this.stimulation,
    };
  }

  apply(delta: EmotionDelta): EmotionValues {
    this.affection = clamp(this.affection + (delta.affection ?? 0), 0, 100);
    this.mood = clamp(this.mood + (delta.mood ?? 0), -50, 100);
    this.stimulation = clamp(this.stimulation + (delta.stimulation ?? 0), 0, 100);
    return this.getSnapshot();
  }

  decayStimulation(deltaMs: number): EmotionValues {
    // 无操作时每秒下降约 4 点，不鼓励用快速点击刷反馈。
    this.stimulation = clamp(this.stimulation - (deltaMs / 1000) * 4, 0, 100);
    return this.getSnapshot();
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
