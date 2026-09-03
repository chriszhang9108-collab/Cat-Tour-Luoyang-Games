import logoUrl from '../assets/brand/cat-tour-luoyang-logo.png';
import type { Screen } from './Screen';

interface StartScreenOptions {
  readonly onStart: () => void;
}

export class StartScreen implements Screen {
  readonly element: HTMLElement;
  private readonly abortController = new AbortController();

  constructor({ onStart }: StartScreenOptions) {
    this.element = document.createElement('section');
    this.element.className = 'screen start-screen';
    this.element.innerHTML = `
      <div class="start-screen__halo" aria-hidden="true"></div>
      <div class="start-screen__content">
        <img class="brand-logo" src="${logoUrl}" alt="猫游洛阳" />
        <div class="start-screen__copy">
          <p class="eyebrow">CAT TOUR LUOYANG</p>
          <h1>猫游洛阳 <span aria-hidden="true">·</span> 撸猫</h1>
          <p class="start-screen__subtitle">选一只今天陪你的猫。</p>
        </div>
        <button class="primary-button start-screen__button" type="button">开始</button>
        <p class="start-screen__aside">慢一点，它们会用自己的方式回应你。</p>
      </div>
    `;

    const startButton = this.element.querySelector<HTMLButtonElement>('.start-screen__button');

    if (!startButton) {
      throw new Error('启动页缺少开始按钮。');
    }

    startButton.addEventListener('click', onStart, {
      signal: this.abortController.signal,
    });
  }

  destroy(): void {
    this.abortController.abort();
  }
}
