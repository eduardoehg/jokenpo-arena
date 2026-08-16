import { byId } from './dom';

export type ScreenName = 'config' | 'arena' | 'end';

const SCREENS: readonly ScreenName[] = ['config', 'arena', 'end'];

export interface Screens {
  show(name: ScreenName): void;
  current(): ScreenName;
}

/**
 * Alterna as três telas do gabinete.
 *
 * Esconde por classe em vez de remover do DOM: a tela de arena guarda o canvas,
 * e recriá-lo perderia o contexto 2D e o tamanho já calculado.
 *
 * O seletor de idioma existe uma vez só e é **movido** para o cabeçalho da tela
 * ativa. Duplicá-lo nas três exigiria manter três cópias em sincronia; deixá-lo
 * flutuando sobre o gabinete exigiria calibrar a altura à mão para cada título.
 * Movido, o flexbox do cabeçalho alinha os dois sozinho — e mover um nó
 * preserva os listeners já registrados nele.
 */
export function createScreens(initial: ScreenName): Screens {
  const languageSwitch = byId('lang-switch');

  const sections = SCREENS.map((name) => ({
    name,
    element: byId(`screen-${name}`),
  }));

  let active = initial;

  const apply = (): void => {
    for (const section of sections) {
      const visible = section.name === active;
      section.element.classList.toggle('hidden', !visible);

      if (!visible) continue;

      const slot = section.element.querySelector('[data-lang-slot]');
      slot?.append(languageSwitch);
    }
  };

  apply();

  return {
    show(name) {
      active = name;
      apply();
    },
    current: () => active,
  };
}
