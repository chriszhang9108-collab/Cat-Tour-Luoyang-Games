import {
  characters,
  type CharacterId,
  type EmotionValues,
} from '../data/characters';

const STORAGE_KEY = 'cat-tour-luoyang.pet.save';
const SCHEMA_VERSION = 1;

export interface GameSettings {
  readonly musicEnabled: boolean;
  readonly soundEffectsEnabled: boolean;
  readonly vibrationEnabled: boolean;
}

export interface DailyCompanionData {
  readonly lastPlayedDate: string | null;
  readonly selectedCat: CharacterId | null;
  readonly dailyInteractions: number;
  /** 为连续陪伴、节气事件等后续能力预留。 */
  readonly companionStreak: number;
}

interface StoredCharacterData {
  readonly emotion: EmotionValues;
  readonly totalInteractions: number;
}

interface GameSaveData {
  readonly schemaVersion: number;
  settings: GameSettings;
  daily: DailyCompanionData;
  characters: Record<CharacterId, StoredCharacterData>;
}

export class StorageManager {
  private data: GameSaveData;
  private storageAvailable = true;

  constructor() {
    this.data = this.load();
    this.resetExpiredDailyData();
  }

  isAvailable(): boolean {
    return this.storageAvailable;
  }

  getSettings(): GameSettings {
    return { ...this.data.settings };
  }

  updateSettings(patch: Partial<GameSettings>): GameSettings {
    this.data.settings = { ...this.data.settings, ...patch };
    this.commit();
    return this.getSettings();
  }

  getSelectedCharacterForToday(): CharacterId | null {
    return this.data.daily.lastPlayedDate === getLocalDateKey()
      ? this.data.daily.selectedCat
      : null;
  }

  selectCharacter(characterId: CharacterId): void {
    const today = getLocalDateKey();
    const isNewDay = this.data.daily.lastPlayedDate !== today;

    this.data.daily = {
      ...this.data.daily,
      lastPlayedDate: today,
      selectedCat: characterId,
      dailyInteractions: isNewDay ? 0 : this.data.daily.dailyInteractions,
    };
    this.commit();
  }

  getDailyCompanion(): DailyCompanionData {
    return { ...this.data.daily };
  }

  getCharacterEmotion(characterId: CharacterId, fallback: EmotionValues): EmotionValues {
    const saved = this.data.characters[characterId]?.emotion;
    return saved ? { ...saved } : { ...fallback };
  }

  saveCharacterEmotion(characterId: CharacterId, emotion: EmotionValues): void {
    const current = this.data.characters[characterId];
    this.data.characters[characterId] = {
      emotion: sanitizeEmotion(emotion),
      totalInteractions: current?.totalInteractions ?? 0,
    };
    this.commit();
  }

  recordInteraction(characterId: CharacterId, emotion: EmotionValues): void {
    const today = getLocalDateKey();
    const isNewDay = this.data.daily.lastPlayedDate !== today;
    const current = this.data.characters[characterId];

    this.data.daily = {
      ...this.data.daily,
      lastPlayedDate: today,
      selectedCat: characterId,
      dailyInteractions: (isNewDay ? 0 : this.data.daily.dailyInteractions) + 1,
    };
    this.data.characters[characterId] = {
      emotion: sanitizeEmotion(emotion),
      totalInteractions: (current?.totalInteractions ?? 0) + 1,
    };
    this.commit();
  }

  private load(): GameSaveData {
    const defaults = createDefaultSave();

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults;
      }

      const parsed: unknown = JSON.parse(raw);
      return normalizeSave(parsed, defaults);
    } catch {
      this.storageAvailable = false;
      return defaults;
    }
  }

  private commit(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.storageAvailable = true;
    } catch {
      // 隐私模式或存储额度受限时继续使用内存数据，不阻断游戏。
      this.storageAvailable = false;
    }
  }

  private resetExpiredDailyData(): void {
    const today = getLocalDateKey();
    const lastPlayedDate = this.data.daily.lastPlayedDate;

    if (!lastPlayedDate || lastPlayedDate === today) {
      return;
    }

    this.data.daily = {
      ...this.data.daily,
      selectedCat: null,
      dailyInteractions: 0,
    };

    characters.forEach((character) => {
      const current = this.data.characters[character.id];
      this.data.characters[character.id] = {
        ...current,
        emotion: {
          ...current.emotion,
          stimulation: 0,
        },
      };
    });
    this.commit();
  }
}

function createDefaultSave(): GameSaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      musicEnabled: true,
      soundEffectsEnabled: true,
      vibrationEnabled: true,
    },
    daily: {
      lastPlayedDate: null,
      selectedCat: null,
      dailyInteractions: 0,
      companionStreak: 0,
    },
    characters: {
      'ju-xiaoluo': {
        emotion: { ...characters[0].initialEmotion },
        totalInteractions: 0,
      },
      'xiao-hui': {
        emotion: { ...characters[1].initialEmotion },
        totalInteractions: 0,
      },
    },
  };
}

function normalizeSave(value: unknown, defaults: GameSaveData): GameSaveData {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION) {
    return defaults;
  }

  const settings = isRecord(value.settings) ? value.settings : {};
  const daily = isRecord(value.daily) ? value.daily : {};
  const storedCharacters = isRecord(value.characters) ? value.characters : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      musicEnabled: readBoolean(settings.musicEnabled, defaults.settings.musicEnabled),
      soundEffectsEnabled: readBoolean(
        settings.soundEffectsEnabled,
        defaults.settings.soundEffectsEnabled,
      ),
      vibrationEnabled: readBoolean(
        settings.vibrationEnabled,
        defaults.settings.vibrationEnabled,
      ),
    },
    daily: {
      lastPlayedDate: typeof daily.lastPlayedDate === 'string' ? daily.lastPlayedDate : null,
      selectedCat: isCharacterId(daily.selectedCat) ? daily.selectedCat : null,
      dailyInteractions: readNumber(daily.dailyInteractions, 0, 0, Number.MAX_SAFE_INTEGER),
      companionStreak: readNumber(daily.companionStreak, 0, 0, Number.MAX_SAFE_INTEGER),
    },
    characters: {
      'ju-xiaoluo': normalizeCharacterData(
        storedCharacters['ju-xiaoluo'],
        defaults.characters['ju-xiaoluo'],
      ),
      'xiao-hui': normalizeCharacterData(
        storedCharacters['xiao-hui'],
        defaults.characters['xiao-hui'],
      ),
    },
  };
}

function normalizeCharacterData(
  value: unknown,
  fallback: StoredCharacterData,
): StoredCharacterData {
  if (!isRecord(value)) {
    return fallback;
  }

  const emotion = isRecord(value.emotion) ? value.emotion : {};
  return {
    emotion: sanitizeEmotion({
      affection: readNumber(emotion.affection, fallback.emotion.affection, 0, 100),
      mood: readNumber(emotion.mood, fallback.emotion.mood, -50, 100),
      stimulation: readNumber(emotion.stimulation, fallback.emotion.stimulation, 0, 100),
    }),
    totalInteractions: readNumber(
      value.totalInteractions,
      fallback.totalInteractions,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}

function sanitizeEmotion(emotion: EmotionValues): EmotionValues {
  return {
    affection: clamp(emotion.affection, 0, 100),
    mood: clamp(emotion.mood, -50, 100),
    stimulation: clamp(emotion.stimulation, 0, 100),
  };
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCharacterId(value: unknown): value is CharacterId {
  return value === 'ju-xiaoluo' || value === 'xiao-hui';
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, minimum, maximum)
    : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
