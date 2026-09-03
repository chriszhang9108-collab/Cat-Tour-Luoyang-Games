import { GameState, type AppState } from '../core/GameState';
import { HapticsManager } from '../core/HapticsManager';
import { SoundManager } from '../core/SoundManager';
import { StorageManager } from '../core/StorageManager';
import { CharacterSelectScreen } from '../screens/CharacterSelectScreen';
import { PetScreen } from '../screens/PetScreen';
import type { Screen } from '../screens/Screen';
import { StartScreen } from '../screens/StartScreen';

export class App {
  private readonly storageManager: StorageManager;
  private readonly soundManager: SoundManager;
  private readonly hapticsManager: HapticsManager;
  private readonly gameState: GameState;
  private currentScreen: Screen | null = null;

  constructor(private readonly root: HTMLElement) {
    this.storageManager = new StorageManager();
    this.soundManager = new SoundManager();
    this.hapticsManager = new HapticsManager();
    const settings = this.storageManager.getSettings();
    this.soundManager.setMusicMuted(!settings.musicEnabled);
    this.soundManager.setEffectsMuted(!settings.soundEffectsEnabled);
    this.hapticsManager.setEnabled(settings.vibrationEnabled);
    this.gameState = new GameState(this.storageManager);
    this.gameState.subscribe((state) => this.render(state));
    this.render(this.gameState.getSnapshot());
  }

  private render(state: Readonly<AppState>): void {
    this.currentScreen?.destroy();
    this.root.replaceChildren();

    switch (state.screen) {
      case 'start':
        this.currentScreen = new StartScreen({
          onStart: () => this.gameState.goToCharacterSelect(),
        });
        break;
      case 'character-select':
        this.currentScreen = new CharacterSelectScreen({
          initialCharacterId: state.selectedCharacterId,
          onBack: () => this.gameState.goToStart(),
          onConfirm: (characterId) => this.gameState.confirmCharacter(characterId),
        });
        break;
      case 'pet':
        this.currentScreen = new PetScreen({
          characterId: state.selectedCharacterId,
          storageManager: this.storageManager,
          soundManager: this.soundManager,
          hapticsManager: this.hapticsManager,
          onChangeCharacter: () => this.gameState.goToCharacterSelect(),
        });
        break;
    }

    this.root.append(this.currentScreen.element);
  }
}
