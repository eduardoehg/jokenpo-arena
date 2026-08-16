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
 */
export function createScreens(initial: ScreenName): Screens {
  const sections = SCREENS.map((name) => ({
    name,
    element: byId(`screen-${name}`),
  }));

  let active = initial;

  const apply = (): void => {
    for (const section of sections) {
      section.element.classList.toggle('hidden', section.name !== active);
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
