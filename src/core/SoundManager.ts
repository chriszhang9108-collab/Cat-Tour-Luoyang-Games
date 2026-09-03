import type { SoundEffectId } from '../data/audio';

type AudioContextConstructor = new () => AudioContext;

interface WebkitAudioWindow extends Window {
  readonly webkitAudioContext?: AudioContextConstructor;
}

/**
 * Web Audio 占位实现：无需外部素材即可验证音量、静音和播放生命周期。
 * TODO_ASSET: 收到正式 purr.mp3 与庭院音乐后，只替换本类内部实现。
 */
export class SoundManager {
  private readonly abortController = new AbortController();
  private context: AudioContext | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private activeEffectSources: AudioScheduledSourceNode[] = [];
  private activeMusicSources = new Set<AudioScheduledSourceNode>();
  private effectCleanupTimer: number | null = null;
  private musicTimer: number | null = null;
  private musicMuted = false;
  private effectsMuted = false;
  private destroyed = false;

  constructor() {
    document.addEventListener('visibilitychange', this.onVisibilityChange, {
      signal: this.abortController.signal,
    });
  }

  async unlock(): Promise<boolean> {
    if (this.destroyed) {
      return false;
    }

    if (!this.context) {
      const Context = window.AudioContext
        ?? (window as WebkitAudioWindow).webkitAudioContext;
      if (!Context) {
        return false;
      }

      this.context = new Context();
      this.effectsGain = this.context.createGain();
      this.effectsGain.gain.value = 0.12;
      this.effectsGain.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.028;
      this.musicGain.connect(this.context.destination);
    }

    try {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch {
      return false;
    }

    if (!this.musicMuted) {
      this.startMusic();
    }
    return this.context.state === 'running';
  }

  setMuted(muted: boolean): void {
    this.setMusicMuted(muted);
    this.setEffectsMuted(muted);
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    if (muted) {
      this.stopMusic();
    } else if (this.context?.state === 'running') {
      this.startMusic();
    }
  }

  setEffectsMuted(muted: boolean): void {
    this.effectsMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  play(effect: SoundEffectId): void {
    if (this.effectsMuted || this.destroyed) {
      return;
    }

    void this.unlock().then((ready) => {
      if (!ready || this.effectsMuted || !this.context || !this.effectsGain) {
        return;
      }

      this.stop();
      switch (effect) {
        case 'soft_touch':
          this.playSoftTouch();
          break;
        case 'purr':
          this.playPurr();
          break;
        case 'surprised':
          this.playSurprised();
          break;
        case 'annoyed':
          this.playAnnoyed();
          break;
      }
    });
  }

  stop(): void {
    if (this.effectCleanupTimer !== null) {
      window.clearTimeout(this.effectCleanupTimer);
      this.effectCleanupTimer = null;
    }

    this.activeEffectSources.forEach((source) => safeStop(source));
    this.activeEffectSources = [];
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.abortController.abort();
    this.stop();
    this.stopMusic();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }

  private playSoftTouch(): void {
    const context = this.requireContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(430, now);
    oscillator.frequency.exponentialRampToValueAtTime(540, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    oscillator.connect(gain).connect(this.requireEffectsGain());
    oscillator.start(now);
    oscillator.stop(now + 0.21);
    this.trackEffects([oscillator], 240);
  }

  private playPurr(): void {
    const context = this.requireContext();
    const carrier = context.createOscillator();
    const tremolo = context.createOscillator();
    const tremoloGain = context.createGain();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;

    carrier.type = 'sawtooth';
    carrier.frequency.value = 54;
    tremolo.type = 'sine';
    tremolo.frequency.value = 23;
    tremoloGain.gain.value = 0.035;
    filter.type = 'lowpass';
    filter.frequency.value = 190;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.12);
    gain.gain.setValueAtTime(0.16, now + 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

    tremolo.connect(tremoloGain).connect(gain.gain);
    carrier.connect(filter).connect(gain).connect(this.requireEffectsGain());
    carrier.start(now);
    tremolo.start(now);
    carrier.stop(now + 1.08);
    tremolo.stop(now + 1.08);
    this.trackEffects([carrier, tremolo], 1120);
  }

  private playSurprised(): void {
    const context = this.requireContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(620, now);
    oscillator.frequency.exponentialRampToValueAtTime(820, now + 0.09);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    oscillator.connect(gain).connect(this.requireEffectsGain());
    oscillator.start(now);
    oscillator.stop(now + 0.15);
    this.trackEffects([oscillator], 180);
  }

  private playAnnoyed(): void {
    const context = this.requireContext();
    const now = context.currentTime;
    const first = this.createMutedTick(now, 165);
    const second = this.createMutedTick(now + 0.16, 135);
    this.trackEffects([first, second], 360);
  }

  private createMutedTick(startAt: number, frequency: number): OscillatorNode {
    const context = this.requireContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.07, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.1);
    oscillator.connect(gain).connect(this.requireEffectsGain());
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.11);
    return oscillator;
  }

  private trackEffects(sources: AudioScheduledSourceNode[], durationMs: number): void {
    this.activeEffectSources = sources;
    this.effectCleanupTimer = window.setTimeout(() => {
      this.activeEffectSources = [];
      this.effectCleanupTimer = null;
    }, durationMs);
  }

  private startMusic(): void {
    if (this.musicMuted || this.musicTimer !== null || !this.context || !this.musicGain) {
      return;
    }

    this.playGardenPhrase();
    this.musicTimer = window.setInterval(() => this.playGardenPhrase(), 5200);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    this.activeMusicSources.forEach((source) => safeStop(source));
    this.activeMusicSources.clear();
  }

  private playGardenPhrase(): void {
    if (!this.context || !this.musicGain || this.musicMuted) {
      return;
    }

    const now = this.context.currentTime;
    const notes = [392, 493.88, 587.33];
    notes.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const startsAt = now + index * 0.72;
      const endsAt = startsAt + 1.35;

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.exponentialRampToValueAtTime(0.09, startsAt + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
      oscillator.connect(gain).connect(this.musicGain!);
      oscillator.addEventListener('ended', () => this.activeMusicSources.delete(oscillator), {
        once: true,
      });
      this.activeMusicSources.add(oscillator);
      oscillator.start(startsAt);
      oscillator.stop(endsAt + 0.02);
    });
  }

  private requireContext(): AudioContext {
    if (!this.context) throw new Error('AudioContext 尚未初始化。');
    return this.context;
  }

  private requireEffectsGain(): GainNode {
    if (!this.effectsGain) throw new Error('音效输出尚未初始化。');
    return this.effectsGain;
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stop();
      this.stopMusic();
      return;
    }

    if (!this.musicMuted && this.context?.state === 'running') {
      this.startMusic();
    }
  };
}

function safeStop(source: AudioScheduledSourceNode): void {
  try {
    source.stop();
  } catch {
    // 已自然结束的节点无需再次处理。
  }
}
