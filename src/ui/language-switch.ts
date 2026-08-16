import { byClass } from './dom';
import {
  HTML_LANG,
  isLanguage,
  language,
  setLanguage,
  t,
  type Language,
  type MessageKey,
} from './i18n';
import { saveLanguage } from './preferences';

export interface LanguageSwitch {
  /** Reescreve todo texto estático e marca o botão ativo. */
  apply(): void;
}

/**
 * Reescreve os nós marcados com `data-i18n`.
 *
 * O texto estático mora no HTML com a chave no atributo, em vez de ser
 * construído em TypeScript: o markup continua legível, e trocar de idioma é
 * uma passada só sobre o documento.
 */
function translateStaticNodes(): void {
  for (const node of byClass<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n as MessageKey | undefined;
    if (key) node.textContent = t(key);
  }

  // Rótulos de acessibilidade que não são texto visível.
  for (const node of byClass<HTMLElement>('[data-i18n-aria]')) {
    const key = node.dataset.i18nAria as MessageKey | undefined;
    if (key) node.setAttribute('aria-label', t(key));
  }

  document.documentElement.lang = HTML_LANG[language()];
}

/**
 * Botões PT/EN do gabinete.
 *
 * `onChange` devolve o controle a quem sabe redesenhar o que é dinâmico — nome
 * do vencedor, botão de pausa, histórico. Este módulo só cuida do estático.
 */
export function createLanguageSwitch(
  onChange: (language: Language) => void,
): LanguageSwitch {
  const buttons = byClass<HTMLButtonElement>('.lang-btn');

  const markActive = (): void => {
    for (const button of buttons) {
      button.classList.toggle('active', button.dataset.lang === language());
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.lang === language()),
      );
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const next = button.dataset.lang;
      if (!isLanguage(next) || next === language()) return;

      setLanguage(next);
      saveLanguage(next);
      onChange(next);
    });
  }

  return {
    apply() {
      translateStaticNodes();
      markActive();
    },
  };
}
