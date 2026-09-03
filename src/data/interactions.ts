export type GestureType = 'TAP' | 'PET' | 'LONG_PRESS' | 'RAPID_TAP';

export type HitZoneId =
  | 'head'
  | 'cheek_left'
  | 'cheek_right'
  | 'chin'
  | 'back'
  | 'belly'
  | 'tail';

export interface HitZoneDefinition {
  readonly id: HitZoneId;
  readonly label: string;
  readonly priority: number;
  readonly shape: {
    readonly kind: 'ellipse';
    readonly cx: number;
    readonly cy: number;
    readonly rx: number;
    readonly ry: number;
  };
}

export interface InteractionEvent {
  readonly gesture: GestureType;
  readonly zone: HitZoneId;
  readonly durationMs: number;
  readonly distancePx: number;
  readonly velocityPxPerMs: number;
  readonly pointerType: string;
}

export interface InteractionDebugSnapshot {
  readonly gesture: GestureType | 'TRACKING' | 'NONE';
  readonly zone: HitZoneId | null;
  readonly durationMs: number;
  readonly distancePx: number;
  readonly velocityPxPerMs: number;
}

export interface GestureThresholds {
  readonly tapMaxDurationMs: number;
  readonly tapMaxDistancePx: number;
  readonly longPressMs: number;
  readonly strokeMinDurationMs: number;
  readonly strokeMinDistancePx: number;
  readonly strokeMaxVelocityPxPerMs: number;
  readonly rapidTapWindowMs: number;
  readonly rapidTapCount: number;
  readonly rapidTapCooldownMs: number;
}

export const DEFAULT_GESTURE_THRESHOLDS: GestureThresholds = {
  tapMaxDurationMs: 280,
  tapMaxDistancePx: 12,
  longPressMs: 600,
  strokeMinDurationMs: 180,
  strokeMinDistancePx: 24,
  strokeMaxVelocityPxPerMs: 0.55,
  rapidTapWindowMs: 900,
  rapidTapCount: 4,
  rapidTapCooldownMs: 520,
};

export const gestureLabels: Readonly<Record<GestureType, string>> = {
  TAP: '轻点',
  PET: '缓慢撸动',
  LONG_PRESS: '长按',
  RAPID_TAP: '连续快速点击',
};

export const hitZoneLabels: Readonly<Record<HitZoneId, string>> = {
  head: '头部',
  cheek_left: '左脸颊',
  cheek_right: '右脸颊',
  chin: '下巴',
  back: '后背',
  belly: '肚子',
  tail: '尾巴',
};
