import type { CharacterDefinition } from '../data/characters';
import type { HitZoneId } from '../data/interactions';
import { HitZoneLayer } from './HitZoneLayer';

export class CharacterView {
  static activeInstanceCount = 0;

  readonly element: HTMLElement;
  readonly ready: Promise<void>;

  private readonly visual: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hitZoneLayer: HitZoneLayer;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor(
    private readonly character: CharacterDefinition,
    debugVisible: boolean,
  ) {
    CharacterView.activeInstanceCount += 1;

    this.element = document.createElement('div');
    this.element.className = 'character-view is-loading';
    this.element.dataset.characterView = 'main';
    this.element.dataset.characterId = character.id;
    this.element.setAttribute('role', 'img');
    this.element.setAttribute('aria-label', `${character.name}，可以轻点、缓慢撸动、长按或连续点击`);

    this.visual = document.createElement('div');
    this.visual.className = 'character-view__visual';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'character-view__canvas';

    const loadingLabel = document.createElement('span');
    loadingLabel.className = 'character-view__loading-label';
    loadingLabel.textContent = `${character.name}正在走近……`;

    this.hitZoneLayer = new HitZoneLayer(character.hitZones, debugVisible);
    this.visual.append(this.canvas);
    this.element.append(this.visual, this.hitZoneLayer.element, loadingLabel);
    this.ready = this.renderCharacter();
  }

  setActiveZone(hitZoneId: HitZoneId | null): void {
    this.hitZoneLayer.setActive(hitZoneId);
  }

  getAnimationTarget(): HTMLElement {
    return this.visual;
  }

  fitWithin(container: HTMLElement): void {
    const resize = (): void => {
      const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
      if (containerWidth <= 0 || containerHeight <= 0) {
        return;
      }

      const width = Math.min(containerWidth, 430, containerHeight * (2 / 3));
      this.element.style.width = `${width}px`;
      this.element.style.height = `${width * 1.5}px`;
    };

    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(container);
    resize();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    CharacterView.activeInstanceCount -= 1;
  }

  private async renderCharacter(): Promise<void> {
    try {
      const image = await loadImage(this.character.assets.pet.source);

      if (this.destroyed) {
        return;
      }

      this.canvas.width = image.naturalWidth;
      this.canvas.height = image.naturalHeight;

      const context = this.canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('当前浏览器不支持 Canvas 2D。');
      }

      context.drawImage(image, 0, 0);

      if (this.character.assets.pet.backgroundTreatment === 'connected-neutral') {
        const imageData = context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        removeConnectedNeutralBackground(imageData);
        context.putImageData(imageData, 0, 0);
      }

      this.element.classList.remove('is-loading');
      this.element.classList.add('is-ready');
    } catch (error) {
      this.element.classList.remove('is-loading');
      this.element.classList.add('has-error');
      const message = error instanceof Error ? error.message : '角色素材载入失败。';
      const label = this.element.querySelector<HTMLElement>('.character-view__loading-label');
      if (label) {
        label.textContent = message;
      }
    }
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('角色素材载入失败。'));
    image.src = source;
  });
}

/**
 * 只清除从画布边缘能够连通到的浅色中性像素。
 * 角色内部的奶白色脸颊、肚子和眼睛高光被深色轮廓包围，因此不会被误删。
 */
function removeConnectedNeutralBackground(imageData: ImageData): void {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex: number): void => {
    if (visited[pixelIndex] === 1 || !isLightNeutralPixel(data, pixelIndex)) {
      return;
    }

    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    data[pixelIndex * 4 + 3] = 0;

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }
}

function isLightNeutralPixel(data: Uint8ClampedArray, pixelIndex: number): boolean {
  const offset = pixelIndex * 4;
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);

  return minimum >= 168 && maximum - minimum <= 19;
}
