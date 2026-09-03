import juXiaoluoSelectionUrl from '../assets/characters/ju-xiaoluo-selection.jpg';
import juXiaoluoPetSourceUrl from '../assets/characters/ju-xiaoluo-idle-source.jpg';
import juXiaoluoTurnaroundUrl from '../assets/characters/ju-xiaoluo-turnaround.png';
import xiaoHuiSelectionUrl from '../assets/characters/xiao-hui-selection.png';
import xiaoHuiPetSourceUrl from '../assets/characters/xiao-hui-idle-source.jpg';
import xiaoHuiTurnaroundUrl from '../assets/characters/xiao-hui-turnaround.png';
import type { HitZoneDefinition } from './interactions';

export type CharacterId = 'ju-xiaoluo' | 'xiao-hui';

export type CharacterTemperament = 'gentle' | 'guarded';

export interface EmotionValues {
  readonly affection: number;
  readonly mood: number;
  readonly stimulation: number;
}

export interface CharacterDefinition {
  readonly id: CharacterId;
  readonly name: string;
  readonly englishName: string;
  readonly tagline: string;
  readonly selectionFeedback: string;
  readonly temperament: CharacterTemperament;
  readonly initialEmotion: EmotionValues;
  readonly palette: {
    readonly accent: string;
    readonly soft: string;
  };
  readonly assets: {
    readonly turnaround: string;
    readonly pet: {
      readonly source: string;
      readonly backgroundTreatment: 'none' | 'connected-neutral';
    };
    readonly selectionCard: {
      readonly source: string;
      readonly xPercent: number;
      readonly yPercent: number;
    };
    /** 临时从三视图裁出正面展示；正式透明 PNG 到位后只需替换配置。 */
    readonly selectionCrop: {
      readonly sizePercent: number;
      readonly xPercent: number;
      readonly yPercent: number;
    };
  };
  readonly hitZones: readonly HitZoneDefinition[];
}

export const characters: readonly CharacterDefinition[] = [
  {
    id: 'ju-xiaoluo',
    name: '橘小洛',
    englishName: 'Ju Xiaoluo',
    tagline: '温柔、慢热、治愈系的小橘猫',
    selectionFeedback: '橘小洛眨眨眼，轻轻笑了。',
    temperament: 'gentle',
    initialEmotion: {
      affection: 42,
      mood: 38,
      stimulation: 0,
    },
    palette: {
      accent: '#f6a23a',
      soft: '#fff1d5',
    },
    assets: {
      turnaround: juXiaoluoTurnaroundUrl,
      pet: {
        source: juXiaoluoPetSourceUrl,
        backgroundTreatment: 'connected-neutral',
      },
      selectionCard: {
        source: juXiaoluoSelectionUrl,
        xPercent: 47,
        yPercent: 50,
      },
      selectionCrop: {
        sizePercent: 300,
        xPercent: 0,
        yPercent: 35,
      },
    },
    hitZones: createHitZones({
      headY: 0.29,
      cheekY: 0.41,
      chinY: 0.48,
      bellyY: 0.68,
      backX: 0.72,
      backY: 0.62,
    }),
  },
  {
    id: 'xiao-hui',
    name: '小灰',
    englishName: 'Xiao Hui',
    tagline: '敏感、傲娇、嘴硬心软的小灰猫',
    selectionFeedback: '小灰耳朵一动，飞快地看了你一眼。',
    temperament: 'guarded',
    initialEmotion: {
      affection: 12,
      mood: 8,
      stimulation: 0,
    },
    palette: {
      accent: '#72594c',
      soft: '#efe2cf',
    },
    assets: {
      turnaround: xiaoHuiTurnaroundUrl,
      pet: {
        source: xiaoHuiPetSourceUrl,
        backgroundTreatment: 'connected-neutral',
      },
      selectionCard: {
        source: xiaoHuiSelectionUrl,
        xPercent: 48,
        yPercent: 50,
      },
      selectionCrop: {
        sizePercent: 300,
        xPercent: 0,
        yPercent: 35,
      },
    },
    hitZones: createHitZones({
      headY: 0.3,
      cheekY: 0.42,
      chinY: 0.49,
      bellyY: 0.69,
      backX: 0.72,
      backY: 0.63,
    }),
  },
] as const;

export function getCharacter(characterId: CharacterId): CharacterDefinition {
  const character = characters.find(({ id }) => id === characterId);

  if (!character) {
    throw new Error(`未知角色：${characterId}`);
  }

  return character;
}

interface HitZoneLayout {
  readonly headY: number;
  readonly cheekY: number;
  readonly chinY: number;
  readonly bellyY: number;
  readonly backX: number;
  readonly backY: number;
  readonly tailX?: number;
}

function createHitZones(layout: HitZoneLayout): readonly HitZoneDefinition[] {
  const hitZones: HitZoneDefinition[] = [
    {
      id: 'chin',
      label: '下巴',
      priority: 5,
      shape: { kind: 'ellipse', cx: 0.51, cy: layout.chinY, rx: 0.15, ry: 0.055 },
    },
    {
      id: 'cheek_left',
      label: '左脸颊',
      priority: 4,
      shape: { kind: 'ellipse', cx: 0.35, cy: layout.cheekY, rx: 0.13, ry: 0.085 },
    },
    {
      id: 'cheek_right',
      label: '右脸颊',
      priority: 4,
      shape: { kind: 'ellipse', cx: 0.65, cy: layout.cheekY, rx: 0.13, ry: 0.085 },
    },
    {
      id: 'belly',
      label: '肚子',
      priority: 3,
      shape: { kind: 'ellipse', cx: 0.5, cy: layout.bellyY, rx: 0.22, ry: 0.19 },
    },
    {
      id: 'back',
      label: '后背',
      priority: 2,
      shape: { kind: 'ellipse', cx: layout.backX, cy: layout.backY, rx: 0.16, ry: 0.17 },
    },
    {
      id: 'head',
      label: '头部',
      priority: 1,
      shape: { kind: 'ellipse', cx: 0.51, cy: layout.headY, rx: 0.29, ry: 0.17 },
    },
  ];

  // TODO_ASSET: 新正面素材没有可见尾巴；收到含尾巴素材后传入 tailX 即可启用。
  if (layout.tailX !== undefined) {
    hitZones.splice(3, 0, {
      id: 'tail',
      label: '尾巴',
      priority: 4,
      shape: { kind: 'ellipse', cx: layout.tailX, cy: 0.69, rx: 0.13, ry: 0.18 },
    });
  }

  return hitZones;
}
