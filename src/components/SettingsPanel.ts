import type { GameSettings } from '../core/StorageManager';

interface SettingsPanelOptions {
  readonly initialSettings: GameSettings;
  readonly vibrationSupported: boolean;
  readonly storageAvailable: boolean;
  readonly onSettingsChange: (settings: GameSettings) => boolean;
  readonly onChangeCharacter: () => void;
}

export class SettingsPanel {
  readonly element: HTMLElement;
  private readonly abortController = new AbortController();
  private readonly closeButton: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;

  constructor(private readonly options: SettingsPanelOptions) {
    this.element = document.createElement('div');
    this.element.className = 'settings-panel';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'settings-title');
    this.element.innerHTML = `
      <div class="settings-panel__sheet">
        <header class="settings-panel__header">
          <div>
            <p class="eyebrow">游戏设置</p>
            <h2 id="settings-title">陪伴时的声音与触感</h2>
          </div>
          <button class="icon-button settings-panel__close" type="button" aria-label="关闭设置">×</button>
        </header>
        <div class="settings-list">
          ${createSettingRow(
            'musicEnabled',
            '庭院音乐',
            '很轻的古风占位旋律',
            options.initialSettings.musicEnabled,
          )}
          ${createSettingRow(
            'soundEffectsEnabled',
            '互动音效',
            '触摸、呼噜与情绪提示',
            options.initialSettings.soundEffectsEnabled,
          )}
          ${createSettingRow(
            'vibrationEnabled',
            '轻微震动',
            options.vibrationSupported ? '仅在呼噜等关键反馈时触发' : '当前设备或浏览器不支持',
            options.initialSettings.vibrationEnabled,
            !options.vibrationSupported,
          )}
        </div>
        <p class="settings-panel__storage" data-settings-storage>
          ${storageCopy(options.storageAvailable)}
        </p>
        <button class="secondary-button settings-panel__change" type="button">换一只猫陪伴</button>
      </div>
    `;

    this.closeButton = this.requireElement<HTMLButtonElement>('.settings-panel__close');
    const changeButton = this.requireElement<HTMLButtonElement>('.settings-panel__change');
    const signal = this.abortController.signal;

    this.closeButton.addEventListener('click', () => this.close(), { signal });
    changeButton.addEventListener('click', () => {
      this.close();
      this.options.onChangeCharacter();
    }, { signal });
    this.element.addEventListener('pointerdown', (event) => {
      if (event.target === this.element) this.close();
    }, { signal });
    this.element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => this.handleSettingsChange(), { signal });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.element.hidden) this.close();
    }, { signal });
  }

  open(trigger?: HTMLElement): void {
    this.previousFocus = trigger ?? document.activeElement as HTMLElement | null;
    this.element.hidden = false;
    this.element.classList.add('is-open');
    this.closeButton.focus();
  }

  close(): void {
    if (this.element.hidden) {
      return;
    }

    this.element.classList.remove('is-open');
    this.element.hidden = true;
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  destroy(): void {
    this.abortController.abort();
    this.previousFocus = null;
  }

  private handleSettingsChange(): void {
    const settings: GameSettings = {
      musicEnabled: this.getToggle('musicEnabled').checked,
      soundEffectsEnabled: this.getToggle('soundEffectsEnabled').checked,
      vibrationEnabled: this.getToggle('vibrationEnabled').checked,
    };
    const available = this.options.onSettingsChange(settings);
    const storageStatus = this.requireElement<HTMLElement>('[data-settings-storage]');
    storageStatus.textContent = storageCopy(available);
  }

  private getToggle(key: keyof GameSettings): HTMLInputElement {
    return this.requireElement<HTMLInputElement>(`[data-setting="${key}"]`);
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.element.querySelector<T>(selector);
    if (!element) {
      throw new Error(`设置面板缺少元素：${selector}`);
    }
    return element;
  }
}

function createSettingRow(
  key: keyof GameSettings,
  title: string,
  description: string,
  checked: boolean,
  disabled = false,
): string {
  return `
    <label class="setting-row${disabled ? ' is-disabled' : ''}">
      <span>
        <strong>${title}</strong>
        <small>${description}</small>
      </span>
      <input
        data-setting="${key}"
        type="checkbox"
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
      />
      <i aria-hidden="true"></i>
    </label>
  `;
}

function storageCopy(available: boolean): string {
  return available
    ? '设置与陪伴记录会保存在这台设备。'
    : '当前浏览器无法写入本地存储，本次打开期间仍可正常游玩。';
}
