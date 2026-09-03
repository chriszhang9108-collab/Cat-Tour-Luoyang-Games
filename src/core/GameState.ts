import type { CharacterId } from '../data/characters';
import type { StorageManager } from './StorageManager';

export type ScreenId = 'start' | 'character-select' | 'pet';

export interface AppState {
  readonly screen: ScreenId;
  readonly selectedCharacterId: CharacterId | null;
}

type StateListener = (state: Readonly<AppState>) => void;

export class GameState {
  private state: AppState;

  private readonly listeners = new Set<StateListener>();

  constructor(private readonly storageManager: StorageManager) {
    this.state = {
      screen: 'start',
      selectedCharacterId: storageManager.getSelectedCharacterForToday(),
    };
  }

  getSnapshot(): Readonly<AppState> {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  goToStart(): void {
    this.update({ screen: 'start' });
  }

  goToCharacterSelect(): void {
    this.update({ screen: 'character-select' });
  }

  confirmCharacter(characterId: CharacterId): void {
    this.storageManager.selectCharacter(characterId);
    this.update({
      screen: 'pet',
      selectedCharacterId: characterId,
    });
  }

  private update(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }
}
