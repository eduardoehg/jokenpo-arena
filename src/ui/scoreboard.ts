import type { EntityType } from '../core/rules';
import { byId } from './dom';
import { pad } from './format';

/**
 * Abaixo desta participação o segmento fica estreito demais para conter o
 * número, que então salta para fora e assume a cor do tipo.
 */
export const NARROW_THRESHOLD = 0.13;

/** Ordem visual da barra, da esquerda para a direita. */
export const DISPLAY_ORDER: readonly EntityType[] = [
  'paper',
  'rock',
  'scissors',
];

export interface Segment {
  type: EntityType;
  /** Participação viva, de 0 a 1. */
  share: number;
  narrow: boolean;
  label: string;
}

/**
 * Traduz a população em larguras de segmento.
 *
 * Separado do DOM de propósito: é aqui que mora a regra do salto para fora, a
 * parte que dá errado em silêncio, e assim ela fica testável sem browser.
 */
export function segmentLayout(
  counts: Record<EntityType, number>,
): Segment[] {
  const alive = (type: EntityType): number => Math.max(0, counts[type]);
  const total = DISPLAY_ORDER.reduce((sum, type) => sum + alive(type), 0);

  return DISPLAY_ORDER.map((type) => {
    const share = total === 0 ? 0 : alive(type) / total;

    return {
      type,
      share,
      narrow: share < NARROW_THRESHOLD,
      label: pad(alive(type)),
    };
  });
}

export interface Scoreboard {
  sync(counts: Record<EntityType, number>): void;
}

/**
 * Placar Trinário: a marquise do gabinete **é** a barra de proporção.
 *
 * Cada segmento tem a largura da participação viva do seu tipo, com o número
 * correndo dentro dele. Quando um tipo definha, seu número descola da barra e
 * fica flutuando acima — a população moribunda nunca some da leitura.
 *
 * A cor do número estreito vem do CSS (`--seg-color`), não daqui: a `ui/` não
 * precisa conhecer a paleta do canvas.
 */
export function createScoreboard(): Scoreboard {
  const nodes = DISPLAY_ORDER.map((type) => ({
    type,
    bar: byId(`seg-${type}`),
    label: byId(`segn-${type}`),
  }));

  return {
    sync(counts) {
      const layout = segmentLayout(counts);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const segment = layout[i];

        node.bar.style.width = `${segment.share * 100}%`;
        node.bar.classList.toggle('narrow', segment.narrow);

        if (node.label.textContent !== segment.label) {
          node.label.textContent = segment.label;
        }
      }
    },
  };
}
