import {
  characters,
  type CharacterDefinition,
  type CharacterId,
} from '../data/characters';
import type { Screen } from './Screen';

interface CharacterSelectScreenOptions {
  readonly initialCharacterId: CharacterId | null;
  readonly onBack: () => void;
  readonly onConfirm: (characterId: CharacterId) => void;
}

export class CharacterSelectScreen implements Screen {
  readonly element: HTMLElement;
  private readonly abortController = new AbortController();
  private selectedCharacterId: CharacterId | null;

  constructor({
    initialCharacterId,
    onBack,
    onConfirm,
  }: CharacterSelectScreenOptions) {
    this.selectedCharacterId = initialCharacterId;
    this.element = document.createElement('section');
    this.element.className = 'screen select-screen';
    this.element.innerHTML = `
      <header class="screen-header">
        <button class="icon-button select-screen__back" type="button" aria-label="返回启动页">←</button>
        <div>
          <p class="eyebrow">今日陪伴</p>
          <h1>今天想陪谁一会儿？</h1>
        </div>
        <span class="screen-header__spacer" aria-hidden="true"></span>
      </header>
      <div class="character-grid" role="group" aria-label="选择一只猫"></div>
      <div class="selection-feedback" aria-live="polite"></div>
      <p class="selection-note">今天选谁都可以，明天还能换。</p>
    `;

    const grid = this.requireElement<HTMLElement>('.character-grid');
    const backButton = this.requireElement<HTMLButtonElement>('.select-screen__back');

    characters.forEach((character) => {
      grid.append(this.createCharacterCard(character, onConfirm));
    });

    backButton.addEventListener('click', onBack, {
      signal: this.abortController.signal,
    });

    this.updateSelection(false);
  }

  destroy(): void {
    this.abortController.abort();
  }

  private createCharacterCard(
    character: CharacterDefinition,
    onConfirm: (characterId: CharacterId) => void,
  ): HTMLButtonElement {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'character-card';
    card.dataset.characterId = character.id;
    card.dataset.temperament = character.temperament;
    card.style.setProperty('--character-accent', character.palette.accent);
    card.style.setProperty('--character-soft', character.palette.soft);
    card.setAttribute('aria-pressed', 'false');
    card.innerHTML = `
      <span class="character-card__portrait" role="img" aria-label="${character.name}在洛阳牡丹花园"></span>
      <span class="character-card__body">
        <strong>${character.name}</strong>
        <small>${character.englishName}</small>
        <span>${character.tagline}</span>
        <em>点一下打招呼</em>
      </span>
    `;

    const portrait = card.querySelector<HTMLElement>('.character-card__portrait');

    if (!portrait) {
      throw new Error(`角色卡缺少图像区域：${character.id}`);
    }

    portrait.style.backgroundImage = `url("${character.assets.selectionCard.source}")`;
    portrait.style.backgroundSize = 'cover';
    portrait.style.backgroundPosition = `${character.assets.selectionCard.xPercent}% ${character.assets.selectionCard.yPercent}%`;

    card.addEventListener(
      'click',
      () => {
        if (this.selectedCharacterId === character.id) {
          onConfirm(character.id);
          return;
        }

        this.selectedCharacterId = character.id;
        this.updateSelection(true);
      },
      { signal: this.abortController.signal },
    );

    return card;
  }

  private updateSelection(announce: boolean): void {
    const cards = this.element.querySelectorAll<HTMLButtonElement>('.character-card');
    const feedback = this.requireElement<HTMLElement>('.selection-feedback');

    cards.forEach((card) => {
      const isSelected = card.dataset.characterId === this.selectedCharacterId;
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));

      const hint = card.querySelector<HTMLElement>('em');
      if (hint) {
        hint.textContent = isSelected ? '再点一次，去陪它' : '点一下打招呼';
      }
    });

    if (!this.selectedCharacterId) {
      feedback.textContent = '先和它们打个招呼吧。';
      return;
    }

    const character = characters.find(({ id }) => id === this.selectedCharacterId);
    feedback.textContent = announce && character
      ? character.selectionFeedback
      : `已经选中${character?.name ?? '这只猫'}，再点一次确认。`;
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.element.querySelector<T>(selector);
    if (!element) {
      throw new Error(`选猫页缺少元素：${selector}`);
    }
    return element;
  }
}
