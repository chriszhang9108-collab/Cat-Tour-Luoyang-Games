import type { CharacterState } from '../core/CharacterStateMachine';
import type { HapticCueId, SoundEffectId } from './audio';
import type { CharacterId } from './characters';
import type { GestureType, HitZoneId } from './interactions';

export interface EmotionDelta {
  readonly affection?: number;
  readonly mood?: number;
  readonly stimulation?: number;
}

export interface ReactionRule {
  readonly id: string;
  readonly priority: number;
  readonly gestures?: readonly GestureType[];
  readonly zones?: readonly HitZoneId[];
  readonly minAffection?: number;
  readonly maxAffection?: number;
  readonly minStimulation?: number;
  readonly state: CharacterState;
  readonly animation: string;
  readonly durationMs: number;
  readonly feedback: string;
  readonly delta: EmotionDelta;
  readonly sound?: SoundEffectId;
  readonly haptic?: HapticCueId;
}

export interface IdleActionDefinition {
  readonly state: CharacterState;
  readonly animation: string;
  readonly durationMs: number;
  readonly feedback: string;
}

const juXiaoluoRules: readonly ReactionRule[] = [
  {
    id: 'ju-rapid-soft-surprise',
    priority: 200,
    gestures: ['RAPID_TAP'],
    state: 'SURPRISED',
    animation: 'ju_surprised_soft',
    durationMs: 720,
    feedback: '橘小洛吓了一小跳，又温柔地看向你。',
    delta: { mood: -3, stimulation: 22 },
    sound: 'surprised',
    haptic: 'surprised',
  },
  {
    id: 'ju-overstimulated',
    priority: 190,
    minStimulation: 74,
    state: 'ANNOYED',
    animation: 'ju_overstimulated',
    durationMs: 860,
    feedback: '橘小洛轻轻缩了缩：慢一点点，好吗？',
    delta: { mood: -4, stimulation: 8 },
    sound: 'surprised',
  },
  {
    id: 'ju-chin-purr',
    priority: 180,
    gestures: ['LONG_PRESS', 'PET'],
    zones: ['chin'],
    state: 'VERY_HAPPY',
    animation: 'ju_purr',
    durationMs: 1300,
    feedback: '呼噜……橘小洛最喜欢轻轻挠下巴。',
    delta: { affection: 4, mood: 5, stimulation: 3 },
    sound: 'purr',
    haptic: 'purr',
  },
  {
    id: 'ju-long-gentle',
    priority: 170,
    gestures: ['LONG_PRESS'],
    zones: ['head', 'cheek_left', 'cheek_right', 'belly'],
    state: 'RELAXED',
    animation: 'ju_relaxed_hold',
    durationMs: 1080,
    feedback: '橘小洛安静地贴近你的手心。',
    delta: { affection: 3, mood: 3, stimulation: 1 },
    sound: 'soft_touch',
    haptic: 'soft_touch',
  },
  {
    id: 'ju-slow-stroke',
    priority: 160,
    gestures: ['PET'],
    zones: ['head', 'back', 'belly'],
    state: 'RELAXED',
    animation: 'ju_relaxed_stroke',
    durationMs: 920,
    feedback: '橘小洛闭上眼，顺着你的手轻轻蹭过来。',
    delta: { affection: 3, mood: 4, stimulation: 2 },
    sound: 'soft_touch',
    haptic: 'soft_touch',
  },
  {
    id: 'ju-cheek-shy',
    priority: 155,
    gestures: ['TAP', 'PET'],
    zones: ['cheek_left', 'cheek_right'],
    state: 'HAPPY',
    animation: 'ju_cheek_happy',
    durationMs: 760,
    feedback: '橘小洛的脸颊软软的，笑得有点害羞。',
    delta: { affection: 2, mood: 3, stimulation: 3 },
    sound: 'soft_touch',
  },
  {
    id: 'ju-head-smile',
    priority: 150,
    gestures: ['TAP'],
    zones: ['head'],
    state: 'HAPPY',
    animation: 'ju_head_happy',
    durationMs: 680,
    feedback: '橘小洛眨眨眼，慢慢露出笑意。',
    delta: { affection: 1.5, mood: 2, stimulation: 4 },
    sound: 'soft_touch',
  },
  {
    id: 'ju-tail-look-back',
    priority: 145,
    zones: ['tail'],
    state: 'CURIOUS',
    animation: 'ju_tail_curious',
    durationMs: 760,
    feedback: '橘小洛回头看了看你，没有生气。',
    delta: { affection: 0.5, stimulation: 8 },
    sound: 'surprised',
  },
  {
    id: 'ju-pet-fallback',
    priority: 100,
    gestures: ['PET', 'LONG_PRESS'],
    state: 'PETTING',
    animation: 'ju_gentle_touch',
    durationMs: 760,
    feedback: '橘小洛放松下来，耐心地陪着你。',
    delta: { affection: 1.5, mood: 2, stimulation: 2 },
    sound: 'soft_touch',
  },
  {
    id: 'ju-tap-fallback',
    priority: 10,
    state: 'CURIOUS',
    animation: 'ju_curious',
    durationMs: 620,
    feedback: '橘小洛好奇地看了看你的手。',
    delta: { affection: 0.5, stimulation: 4 },
    sound: 'soft_touch',
  },
];

const xiaoHuiRules: readonly ReactionRule[] = [
  {
    id: 'hui-rapid-annoyed',
    priority: 200,
    gestures: ['RAPID_TAP'],
    state: 'ANNOYED',
    animation: 'hui_annoyed_tail',
    durationMs: 980,
    feedback: '小灰耳朵一压，露出小虎牙：你干嘛？',
    delta: { mood: -8, stimulation: 28 },
    sound: 'annoyed',
    haptic: 'annoyed',
  },
  {
    id: 'hui-overstimulated',
    priority: 195,
    minStimulation: 64,
    state: 'ANNOYED',
    animation: 'hui_overstimulated',
    durationMs: 1050,
    feedback: '小灰往后躲了半步：先让我缓一缓。',
    delta: { mood: -6, stimulation: 10 },
    sound: 'annoyed',
    haptic: 'annoyed',
  },
  {
    id: 'hui-tail-warning',
    priority: 190,
    zones: ['tail'],
    state: 'ANNOYED',
    animation: 'hui_tail_warning',
    durationMs: 920,
    feedback: '小灰飞快回头：尾巴不许乱碰。',
    delta: { mood: -5, stimulation: 16 },
    sound: 'annoyed',
    haptic: 'annoyed',
  },
  {
    id: 'hui-chin-purr',
    priority: 185,
    gestures: ['LONG_PRESS', 'PET'],
    zones: ['chin'],
    minAffection: 20,
    state: 'VERY_HAPPY',
    animation: 'hui_purr_serious',
    durationMs: 1250,
    feedback: '小灰抬高下巴，明明很喜欢还努力板着脸。',
    delta: { affection: 4, mood: 5, stimulation: 3 },
    sound: 'purr',
    haptic: 'purr',
  },
  {
    id: 'hui-chin-guarded',
    priority: 180,
    gestures: ['LONG_PRESS', 'PET'],
    zones: ['chin'],
    maxAffection: 19.99,
    state: 'CURIOUS',
    animation: 'hui_guarded_lean',
    durationMs: 820,
    feedback: '小灰抬了一点下巴，又装作若无其事。',
    delta: { affection: 2, mood: 1, stimulation: 5 },
    sound: 'soft_touch',
  },
  {
    id: 'hui-head-trusting',
    priority: 175,
    gestures: ['PET', 'LONG_PRESS'],
    zones: ['head'],
    minAffection: 30,
    state: 'RELAXED',
    animation: 'hui_secretly_relaxed',
    durationMs: 980,
    feedback: '小灰没有躲开，开始偷偷享受。',
    delta: { affection: 3, mood: 3, stimulation: 2 },
    sound: 'purr',
    haptic: 'soft_touch',
  },
  {
    id: 'hui-head-guarded',
    priority: 170,
    gestures: ['PET', 'LONG_PRESS'],
    zones: ['head'],
    maxAffection: 29.99,
    state: 'CURIOUS',
    animation: 'hui_guarded_lean',
    durationMs: 820,
    feedback: '小灰稍微后仰，警惕地确认你的动作。',
    delta: { affection: 2, mood: 1, stimulation: 5 },
    sound: 'surprised',
  },
  {
    id: 'hui-head-tap-trusting',
    priority: 165,
    gestures: ['TAP'],
    zones: ['head'],
    minAffection: 30,
    state: 'HAPPY',
    animation: 'hui_head_accept',
    durationMs: 720,
    feedback: '小灰只轻轻哼了一声，这次没有后退。',
    delta: { affection: 1.5, mood: 2, stimulation: 4 },
    sound: 'soft_touch',
  },
  {
    id: 'hui-head-tap-guarded',
    priority: 160,
    gestures: ['TAP'],
    zones: ['head'],
    maxAffection: 29.99,
    state: 'CURIOUS',
    animation: 'hui_head_guarded',
    durationMs: 720,
    feedback: '小灰警觉地看了你一眼：先慢慢来。',
    delta: { affection: 1, stimulation: 7 },
    sound: 'surprised',
  },
  {
    id: 'hui-cheek-blush',
    priority: 155,
    gestures: ['TAP', 'PET'],
    zones: ['cheek_left', 'cheek_right'],
    state: 'HAPPY',
    animation: 'hui_cheek_blush',
    durationMs: 820,
    feedback: '小灰脸颊微微发热，立刻假装什么都没发生。',
    delta: { affection: 2, mood: 2, stimulation: 5 },
    sound: 'soft_touch',
  },
  {
    id: 'hui-slow-fallback',
    priority: 100,
    gestures: ['PET', 'LONG_PRESS'],
    state: 'PETTING',
    animation: 'hui_cautious_touch',
    durationMs: 820,
    feedback: '小灰盯着你的手，但没有离开。',
    delta: { affection: 1.5, mood: 1, stimulation: 4 },
    sound: 'soft_touch',
  },
  {
    id: 'hui-tap-fallback',
    priority: 10,
    state: 'CURIOUS',
    animation: 'hui_curious',
    durationMs: 680,
    feedback: '小灰抬起眼睛，像是在判断你的意思。',
    delta: { affection: 0.5, stimulation: 6 },
    sound: 'soft_touch',
  },
];

export const reactionTable: Readonly<Record<CharacterId, readonly ReactionRule[]>> = {
  'ju-xiaoluo': juXiaoluoRules,
  'xiao-hui': xiaoHuiRules,
};

export const idleTable: Readonly<
  Record<CharacterId, Readonly<Record<3 | 8 | 15, IdleActionDefinition>>>
> = {
  'ju-xiaoluo': {
    3: {
      state: 'IDLE',
      animation: 'ju_idle_blink',
      durationMs: 520,
      feedback: '橘小洛安静地眨了眨眼。',
    },
    8: {
      state: 'CURIOUS',
      animation: 'ju_idle_window',
      durationMs: 900,
      feedback: '橘小洛耳朵轻动，望向远处的牡丹花。',
    },
    15: {
      state: 'SLEEPY',
      animation: 'ju_idle_yawn',
      durationMs: 1250,
      feedback: '橘小洛小小地打了个哈欠。',
    },
  },
  'xiao-hui': {
    3: {
      state: 'IDLE',
      animation: 'hui_idle_shift',
      durationMs: 560,
      feedback: '小灰轻轻动了一下耳朵。',
    },
    8: {
      state: 'CURIOUS',
      animation: 'hui_idle_look_away',
      durationMs: 940,
      feedback: '小灰看了你一眼，又故意望向别处。',
    },
    15: {
      state: 'SLEEPY',
      animation: 'hui_idle_yawn',
      durationMs: 1320,
      feedback: '小灰打完哈欠，又偷偷确认你还在不在。',
    },
  },
};
