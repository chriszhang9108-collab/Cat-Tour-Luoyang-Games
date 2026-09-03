import peonyBackgroundUrl from '../assets/backgrounds/peony-sea.jpg';
import { CharacterView } from '../components/CharacterView';
import { SettingsPanel } from '../components/SettingsPanel';
import { AnimationController } from '../core/AnimationController';
import {
  CharacterStateMachine,
  type CharacterStateSnapshot,
} from '../core/CharacterStateMachine';
import { IdleManager, type IdleLevel } from '../core/IdleManager';
import type { HapticsManager } from '../core/HapticsManager';
import { InteractionEngine } from '../core/InteractionEngine';
import { InteractionSession } from '../core/InteractionSession';
import { ReactionResolver } from '../core/ReactionResolver';
import type { SoundManager } from '../core/SoundManager';
import type { GameSettings, StorageManager } from '../core/StorageManager';
import {
  characters,
  getCharacter,
  type CharacterDefinition,
  type CharacterId,
  type EmotionValues,
} from '../data/characters';
import {
  gestureLabels,
  hitZoneLabels,
  type InteractionDebugSnapshot,
  type InteractionEvent,
} from '../data/interactions';
import { idleTable } from '../data/reactions';
import type { Screen } from './Screen';

interface PetScreenOptions {
  readonly characterId: CharacterId | null;
  readonly storageManager: StorageManager;
  readonly soundManager: SoundManager;
  readonly hapticsManager: HapticsManager;
  readonly onChangeCharacter: () => void;
}

const EMPTY_INTERACTION_DEBUG: InteractionDebugSnapshot = {
  gesture: 'NONE',
  zone: null,
  durationMs: 0,
  distancePx: 0,
  velocityPxPerMs: 0,
};

export class PetScreen implements Screen {
  readonly element: HTMLElement;
  private readonly abortController = new AbortController();
  private readonly character: CharacterDefinition;
  private readonly storageManager: StorageManager;
  private readonly characterView: CharacterView;
  private readonly interactionSession: InteractionSession;
  private readonly reactionResolver = new ReactionResolver();
  private readonly stateMachine: CharacterStateMachine;
  private readonly idleManager: IdleManager;
  private readonly interactionEngine: InteractionEngine;
  private readonly settingsPanel: SettingsPanel;
  private interactionDebug = EMPTY_INTERACTION_DEBUG;
  private feedbackTimer: number | null = null;

  constructor({
    characterId,
    storageManager,
    soundManager,
    hapticsManager,
    onChangeCharacter,
  }: PetScreenOptions) {
    this.character = getCharacter(characterId ?? characters[0].id);
    this.storageManager = storageManager;
    const initialEmotion = storageManager.getCharacterEmotion(
      this.character.id,
      this.character.initialEmotion,
    );
    const debugEnabled = new URLSearchParams(window.location.search).get('debug') === 'true';

    this.element = document.createElement('section');
    this.element.className = 'screen pet-screen';
    this.element.style.setProperty('--pet-background-image', `url("${peonyBackgroundUrl}")`);
    this.element.innerHTML = `
      <header class="pet-header">
        <div>
          <p class="eyebrow">今天陪伴</p>
          <h1>${this.character.name}</h1>
          <p data-pet-mood>${moodCopy(this.character, initialEmotion)}</p>
        </div>
        <button class="icon-button pet-screen__settings" type="button" aria-label="打开设置">⚙</button>
      </header>
      <div class="pet-stage">
        <div class="interaction-feedback" aria-live="polite">
          <strong>轻轻摸摸它</strong>
          <span>试试轻点、慢慢滑动、长按或连续点击。</span>
        </div>
        <aside class="debug-panel${debugEnabled ? ' is-visible' : ''}" aria-hidden="${String(!debugEnabled)}">
          <strong>PHASE 5 DEBUG</strong>
          <span data-debug="character">Character: ${this.character.id}</span>
          <span data-debug="instances">CharacterView: 1</span>
          <span data-debug="state">State: IDLE</span>
          <span data-debug="animation">Animation: idle_base</span>
          <span data-debug="affection">Affection: ${initialEmotion.affection}</span>
          <span data-debug="mood">Mood: ${initialEmotion.mood}</span>
          <span data-debug="stimulation">Stimulation: ${initialEmotion.stimulation}</span>
          <span data-debug="daily">Daily: ${storageManager.getDailyCompanion().dailyInteractions}</span>
          <span data-debug="storage">Storage: ${storageManager.isAvailable() ? 'LOCAL' : 'MEMORY'}</span>
          <span data-debug="gesture">Gesture: NONE</span>
          <span data-debug="zone">HitZone: NONE</span>
          <span data-debug="idle">Idle: 0.0s</span>
          <span data-debug="timers">IdleTimer: 1</span>
          <span data-debug="metrics">0ms · 0px · 0px/ms</span>
        </aside>
      </div>
      <p class="pet-hint">先观察它的反应，慢一点会发现更多。</p>
    `;

    const stage = this.requireElement<HTMLElement>('.pet-stage');
    const settingsButton = this.requireElement<HTMLButtonElement>('.pet-screen__settings');

    this.characterView = new CharacterView(this.character, debugEnabled);
    stage.prepend(this.characterView.element);
    this.characterView.fitWithin(stage);

    this.interactionSession = new InteractionSession(initialEmotion);
    this.stateMachine = new CharacterStateMachine(
      new AnimationController(this.characterView.getAnimationTarget()),
      (snapshot) => this.updateStateDebug(snapshot),
    );

    this.idleManager = new IdleManager({
      onCancel: () => this.stateMachine.cancelToIdle(),
      onIdle: (level) => this.handleIdle(level),
      onTick: (elapsedMs, deltaMs) => {
        const emotion = this.interactionSession.decayStimulation(deltaMs);
        this.updateEmotionDebug(emotion);
        this.updateTextDebug('idle', `Idle: ${(elapsedMs / 1000).toFixed(1)}s`);
      },
    });

    this.settingsPanel = new SettingsPanel({
      initialSettings: storageManager.getSettings(),
      vibrationSupported: hapticsManager.isSupported(),
      storageAvailable: storageManager.isAvailable(),
      onSettingsChange: (settings) => {
        this.applySettings(settings, storageManager, soundManager, hapticsManager);
        return storageManager.isAvailable();
      },
      onChangeCharacter,
    });
    this.element.append(this.settingsPanel.element);

    this.interactionEngine = new InteractionEngine(
      this.characterView.element,
      this.character.hitZones,
      {
        onActivity: () => {
          this.idleManager.recordActivity();
          void soundManager.unlock();
        },
        onEvent: (event) => this.handleInteraction(
          event,
          storageManager,
          soundManager,
          hapticsManager,
        ),
        onZoneChange: (hitZoneId) => this.characterView.setActiveZone(hitZoneId),
        onDebugChange: (snapshot) => this.updateInteractionDebug(snapshot),
      },
    );

    settingsButton.addEventListener('click', () => this.settingsPanel.open(settingsButton), {
      signal: this.abortController.signal,
    });

    this.updateInteractionDebug(this.interactionDebug);
  }

  destroy(): void {
    this.abortController.abort();
    this.settingsPanel.destroy();
    // Idle 衰减后的最新值也要在离开页面时落盘。
    // 存档服务由 App 持有，因此切换页面不会丢失。
    this.storageManager.saveCharacterEmotion(
      this.character.id,
      this.interactionSession.getSnapshot(),
    );
    this.interactionEngine.destroy();
    this.idleManager.destroy();
    this.stateMachine.destroy();
    this.characterView.destroy();

    if (this.feedbackTimer !== null) {
      window.clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private handleInteraction(
    event: InteractionEvent,
    storageManager: StorageManager,
    soundManager: SoundManager,
    hapticsManager: HapticsManager,
  ): void {
    const rule = this.reactionResolver.resolve(
      this.character.id,
      event,
      this.interactionSession.getSnapshot(),
    );
    const emotion = this.interactionSession.apply(rule.delta);
    storageManager.recordInteraction(this.character.id, emotion);

    if (rule.sound) soundManager.play(rule.sound);
    if (rule.haptic) hapticsManager.play(rule.haptic);

    this.stateMachine.setCharacterState(rule.state, {
      animation: rule.animation,
      durationMs: rule.durationMs,
      recoverTo: 'IDLE',
      recoverAnimation: 'idle_base',
    });

    this.showFeedback(
      rule.feedback,
      `${gestureLabels[event.gesture]} · ${hitZoneLabels[event.zone]}`,
      rule.durationMs + 500,
    );
    this.updateEmotionDebug(emotion);
    this.updateMoodCopy(emotion);
    this.updateStorageDebug(storageManager);
  }

  private handleIdle(level: IdleLevel): void {
    const action = idleTable[this.character.id][level];
    this.stateMachine.setCharacterState(action.state, {
      animation: action.animation,
      durationMs: action.durationMs,
      recoverTo: 'IDLE',
      recoverAnimation: 'idle_base',
    });
    this.showFeedback(action.feedback, `${level} 秒闲置动作`, action.durationMs + 300);
  }

  private showFeedback(titleText: string, detailText: string, durationMs: number): void {
    const feedback = this.requireElement<HTMLElement>('.interaction-feedback');
    const title = feedback.querySelector<HTMLElement>('strong');
    const detail = feedback.querySelector<HTMLElement>('span');

    if (title) title.textContent = titleText;
    if (detail) detail.textContent = detailText;
    feedback.classList.add('is-active');

    if (this.feedbackTimer !== null) {
      window.clearTimeout(this.feedbackTimer);
    }

    this.feedbackTimer = window.setTimeout(() => {
      feedback.classList.remove('is-active');
      this.feedbackTimer = null;
    }, durationMs);
  }

  private updateStateDebug(snapshot: CharacterStateSnapshot): void {
    this.updateTextDebug('state', `State: ${snapshot.state}`);
    this.updateTextDebug('animation', `Animation: ${snapshot.animation}`);
  }

  private updateEmotionDebug(emotion: EmotionValues): void {
    this.updateTextDebug('affection', `Affection: ${emotion.affection.toFixed(1)}`);
    this.updateTextDebug('mood', `Mood: ${emotion.mood.toFixed(1)}`);
    this.updateTextDebug('stimulation', `Stimulation: ${emotion.stimulation.toFixed(1)}`);
  }

  private updateInteractionDebug(snapshot: InteractionDebugSnapshot): void {
    this.interactionDebug = snapshot;
    this.updateTextDebug('gesture', `Gesture: ${snapshot.gesture}`);
    this.updateTextDebug('zone', `HitZone: ${snapshot.zone ?? 'NONE'}`);
    this.updateTextDebug(
      'metrics',
      `${Math.round(snapshot.durationMs)}ms · ${Math.round(snapshot.distancePx)}px · ${snapshot.velocityPxPerMs.toFixed(2)}px/ms`,
    );
    this.updateSystemCounts();
  }

  private updateSystemCounts(): void {
    this.updateTextDebug('instances', `CharacterView: ${CharacterView.activeInstanceCount}`);
    this.updateTextDebug('timers', `IdleTimer: ${IdleManager.activeInstanceCount}`);
  }

  private updateStorageDebug(storageManager: StorageManager): void {
    this.updateTextDebug(
      'daily',
      `Daily: ${storageManager.getDailyCompanion().dailyInteractions}`,
    );
    this.updateTextDebug(
      'storage',
      `Storage: ${storageManager.isAvailable() ? 'LOCAL' : 'MEMORY'}`,
    );
  }

  private applySettings(
    settings: GameSettings,
    storageManager: StorageManager,
    soundManager: SoundManager,
    hapticsManager: HapticsManager,
  ): void {
    storageManager.updateSettings(settings);
    soundManager.setMusicMuted(!settings.musicEnabled);
    soundManager.setEffectsMuted(!settings.soundEffectsEnabled);
    hapticsManager.setEnabled(settings.vibrationEnabled);

    if (settings.musicEnabled || settings.soundEffectsEnabled) {
      void soundManager.unlock();
    }
    this.updateStorageDebug(storageManager);
  }

  private updateMoodCopy(emotion: EmotionValues): void {
    const moodElement = this.element.querySelector<HTMLElement>('[data-pet-mood]');
    if (!moodElement) {
      return;
    }

    if (emotion.stimulation >= 64) {
      moodElement.textContent = '现在需要安静地缓一缓。';
    } else if (emotion.affection >= 60) {
      moodElement.textContent = '已经开始期待你的靠近。';
    } else if (this.character.temperament === 'guarded' && emotion.affection < 30) {
      moodElement.textContent = '正在认真观察你的动作。';
    } else {
      moodElement.textContent = '今天看起来心情不错。';
    }
  }

  private updateTextDebug(key: string, text: string): void {
    const element = this.element.querySelector<HTMLElement>(`[data-debug="${key}"]`);
    if (element) element.textContent = text;
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.element.querySelector<T>(selector);
    if (!element) {
      throw new Error(`撸猫页缺少元素：${selector}`);
    }
    return element;
  }
}

function moodCopy(character: CharacterDefinition, emotion: EmotionValues): string {
  if (emotion.stimulation >= 64) return '现在需要安静地缓一缓。';
  if (emotion.affection >= 60) return '已经开始期待你的靠近。';
  return character.temperament === 'gentle'
    ? '今天看起来心情不错。'
    : '正在认真观察你的动作。';
}
