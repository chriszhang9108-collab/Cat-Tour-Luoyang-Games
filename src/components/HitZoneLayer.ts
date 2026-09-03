import type { HitZoneDefinition, HitZoneId } from '../data/interactions';

export class HitZoneLayer {
  readonly element: HTMLElement;

  constructor(hitZones: readonly HitZoneDefinition[], debugVisible: boolean) {
    this.element = document.createElement('div');
    this.element.className = 'hit-zone-layer';
    this.element.classList.toggle('is-debug', debugVisible);
    this.element.setAttribute('aria-hidden', 'true');

    hitZones.forEach((hitZone) => {
      const marker = document.createElement('span');
      const { cx, cy, rx, ry } = hitZone.shape;

      marker.className = 'hit-zone';
      marker.dataset.zone = hitZone.id;
      marker.textContent = hitZone.label;
      marker.style.left = `${(cx - rx) * 100}%`;
      marker.style.top = `${(cy - ry) * 100}%`;
      marker.style.width = `${rx * 2 * 100}%`;
      marker.style.height = `${ry * 2 * 100}%`;
      this.element.append(marker);
    });
  }

  setActive(hitZoneId: HitZoneId | null): void {
    this.element.querySelectorAll<HTMLElement>('.hit-zone').forEach((marker) => {
      marker.classList.toggle('is-active', marker.dataset.zone === hitZoneId);
    });
  }
}
