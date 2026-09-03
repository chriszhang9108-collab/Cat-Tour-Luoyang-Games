import {
  DEFAULT_GESTURE_THRESHOLDS,
  type GestureThresholds,
  type GestureType,
  type HitZoneDefinition,
  type HitZoneId,
  type InteractionDebugSnapshot,
  type InteractionEvent,
} from '../data/interactions';

interface InteractionEngineCallbacks {
  readonly onEvent: (event: InteractionEvent) => void;
  readonly onActivity?: () => void;
  readonly onZoneChange?: (hitZoneId: HitZoneId | null) => void;
  readonly onDebugChange?: (snapshot: InteractionDebugSnapshot) => void;
}

interface PointerSession {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly startedAt: number;
  lastClientX: number;
  lastClientY: number;
  distancePx: number;
  longPressFired: boolean;
  readonly zoneSamples: Map<HitZoneId, number>;
}

export class InteractionEngine {
  private readonly abortController = new AbortController();
  private readonly sortedHitZones: readonly HitZoneDefinition[];
  private session: PointerSession | null = null;
  private longPressTimer: number | null = null;
  private tapHistory: number[] = [];
  private rapidTapCooldownUntil = 0;

  constructor(
    private readonly element: HTMLElement,
    hitZones: readonly HitZoneDefinition[],
    private readonly callbacks: InteractionEngineCallbacks,
    private readonly thresholds: GestureThresholds = DEFAULT_GESTURE_THRESHOLDS,
  ) {
    this.sortedHitZones = [...hitZones].sort((left, right) => right.priority - left.priority);

    const signal = this.abortController.signal;
    this.element.addEventListener('pointerdown', this.onPointerDown, { signal });
    this.element.addEventListener('pointermove', this.onPointerMove, { signal });
    this.element.addEventListener('pointerup', this.onPointerUp, { signal });
    this.element.addEventListener('pointercancel', this.onPointerCancel, { signal });
    this.element.addEventListener('lostpointercapture', this.onLostPointerCapture, { signal });
    document.addEventListener('visibilitychange', this.onVisibilityChange, { signal });
  }

  destroy(): void {
    this.cancelSession();
    this.abortController.abort();
    this.tapHistory = [];
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.session !== null || event.button !== 0) {
      return;
    }

    const zone = this.resolveHitZone(event.clientX, event.clientY);
    if (!zone) {
      return;
    }

    event.preventDefault();
    this.element.setPointerCapture(event.pointerId);

    this.session = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startedAt: performance.now(),
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      distancePx: 0,
      longPressFired: false,
      zoneSamples: new Map([[zone, 1]]),
    };

    this.callbacks.onActivity?.();
    this.callbacks.onZoneChange?.(zone);
    this.emitDebug('TRACKING', zone);
    this.longPressTimer = window.setTimeout(() => this.fireLongPress(), this.thresholds.longPressMs);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const session = this.session;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const stepDistance = Math.hypot(
      event.clientX - session.lastClientX,
      event.clientY - session.lastClientY,
    );
    session.distancePx += stepDistance;
    session.lastClientX = event.clientX;
    session.lastClientY = event.clientY;

    const zone = this.resolveHitZone(event.clientX, event.clientY);
    if (zone) {
      session.zoneSamples.set(zone, (session.zoneSamples.get(zone) ?? 0) + 1);
      this.callbacks.onActivity?.();
    }

    if (session.distancePx > this.thresholds.tapMaxDistancePx) {
      this.clearLongPressTimer();
    }

    this.callbacks.onZoneChange?.(zone);
    this.emitDebug('TRACKING', zone);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const session = this.session;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.clearLongPressTimer();

    if (!session.longPressFired) {
      const durationMs = performance.now() - session.startedAt;
      const velocityPxPerMs = durationMs > 0 ? session.distancePx / durationMs : 0;
      const zone = this.getDominantZone(session.zoneSamples);
      const gesture = this.classifyGesture(durationMs, session.distancePx, velocityPxPerMs);

      if (gesture && zone) {
        this.dispatchGesture(gesture, zone, durationMs, session.distancePx, velocityPxPerMs, session.pointerType);
      }
    }

    this.finishSession(event.pointerId);
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.session?.pointerId === event.pointerId) {
      this.cancelSession();
    }
  };

  private readonly onLostPointerCapture = (event: PointerEvent): void => {
    if (this.session?.pointerId === event.pointerId) {
      this.cancelSession();
    }
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.cancelSession();
    }
  };

  private fireLongPress(): void {
    const session = this.session;
    this.longPressTimer = null;

    if (!session || session.distancePx > this.thresholds.tapMaxDistancePx) {
      return;
    }

    const zone = this.getDominantZone(session.zoneSamples);
    if (!zone) {
      return;
    }

    session.longPressFired = true;
    const durationMs = performance.now() - session.startedAt;
    this.dispatchGesture('LONG_PRESS', zone, durationMs, session.distancePx, 0, session.pointerType);
  }

  private classifyGesture(
    durationMs: number,
    distancePx: number,
    velocityPxPerMs: number,
  ): GestureType | null {
    if (
      distancePx >= this.thresholds.strokeMinDistancePx &&
      durationMs >= this.thresholds.strokeMinDurationMs &&
      velocityPxPerMs <= this.thresholds.strokeMaxVelocityPxPerMs
    ) {
      return 'PET';
    }

    if (
      durationMs <= this.thresholds.tapMaxDurationMs &&
      distancePx <= this.thresholds.tapMaxDistancePx
    ) {
      const now = performance.now();
      this.tapHistory = this.tapHistory.filter(
        (timestamp) => now - timestamp <= this.thresholds.rapidTapWindowMs,
      );
      this.tapHistory.push(now);

      if (
        this.tapHistory.length >= this.thresholds.rapidTapCount &&
        now >= this.rapidTapCooldownUntil
      ) {
        this.tapHistory = [];
        this.rapidTapCooldownUntil = now + this.thresholds.rapidTapCooldownMs;
        return 'RAPID_TAP';
      }

      return 'TAP';
    }

    return null;
  }

  private dispatchGesture(
    gesture: GestureType,
    zone: HitZoneId,
    durationMs: number,
    distancePx: number,
    velocityPxPerMs: number,
    pointerType: string,
  ): void {
    const interactionEvent: InteractionEvent = {
      gesture,
      zone,
      durationMs,
      distancePx,
      velocityPxPerMs,
      pointerType,
    };

    this.callbacks.onActivity?.();
    this.callbacks.onEvent(interactionEvent);
    this.callbacks.onDebugChange?.({
      gesture,
      zone,
      durationMs,
      distancePx,
      velocityPxPerMs,
    });
  }

  private resolveHitZone(clientX: number, clientY: number): HitZoneId | null {
    const bounds = this.element.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return null;
    }

    const x = (clientX - bounds.left) / bounds.width;
    const y = (clientY - bounds.top) / bounds.height;

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }

    const matchingZone = this.sortedHitZones.find(({ shape }) => {
      const normalizedX = (x - shape.cx) / shape.rx;
      const normalizedY = (y - shape.cy) / shape.ry;
      return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
    });

    return matchingZone?.id ?? null;
  }

  private getDominantZone(samples: ReadonlyMap<HitZoneId, number>): HitZoneId | null {
    let dominantZone: HitZoneId | null = null;
    let highestCount = 0;

    samples.forEach((count, zone) => {
      if (count > highestCount) {
        dominantZone = zone;
        highestCount = count;
      }
    });

    return dominantZone;
  }

  private emitDebug(
    gesture: InteractionDebugSnapshot['gesture'],
    zone: HitZoneId | null,
  ): void {
    const session = this.session;
    const durationMs = session ? performance.now() - session.startedAt : 0;
    const distancePx = session?.distancePx ?? 0;

    this.callbacks.onDebugChange?.({
      gesture,
      zone,
      durationMs,
      distancePx,
      velocityPxPerMs: durationMs > 0 ? distancePx / durationMs : 0,
    });
  }

  private finishSession(pointerId: number): void {
    this.session = null;
    this.callbacks.onZoneChange?.(null);

    if (this.element.hasPointerCapture(pointerId)) {
      this.element.releasePointerCapture(pointerId);
    }
  }

  private cancelSession(): void {
    const pointerId = this.session?.pointerId;
    this.clearLongPressTimer();
    this.session = null;
    this.callbacks.onZoneChange?.(null);

    if (pointerId !== undefined && this.element.hasPointerCapture(pointerId)) {
      this.element.releasePointerCapture(pointerId);
    }
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
