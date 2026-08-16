import type { EntityType } from '../core/rules';

/** Intervalo de amostragem, em segundos de **tempo simulado**. */
export const SAMPLE_INTERVAL = 0.2;

/** Colunas do gráfico de evolução na tela de fim. */
export const CHART_COLUMNS = 64;

export type Sample = Record<EntityType, number>;

export interface Timeline {
  samples: Sample[];
  /** Instante simulado da próxima amostra. */
  nextAt: number;
}

/** Linha do tempo já com a amostra do instante zero. */
export function createTimeline(counts: Sample): Timeline {
  return { samples: [{ ...counts }], nextAt: SAMPLE_INTERVAL };
}

/**
 * Registra uma amostra se já passou o intervalo.
 *
 * Anda pelo tempo **simulado**, não pelo real: em 2× ou 4× o gráfico continua
 * com a mesma resolução por segundo de partida.
 *
 * Muta de propósito — é chamada a cada quadro e não vale realocar o histórico.
 */
export function sampleTimeline(
  timeline: Timeline,
  elapsed: number,
  counts: Sample,
): void {
  if (elapsed < timeline.nextAt) return;

  timeline.samples.push({ ...counts });
  timeline.nextAt = elapsed + SAMPLE_INTERVAL;
}

/**
 * Reamostra a série para um número fixo de colunas.
 *
 * Uma partida de 20s e outra de 4min precisam caber no mesmo gráfico. Amostra
 * por vizinho mais próximo: preserva os degraus da conversão em vez de
 * suavizá-los, que é o que a estética 8-bit pede.
 */
export function resample<T>(samples: readonly T[], columns: number): T[] {
  if (samples.length === 0 || columns <= 0) return [];

  return Array.from({ length: columns }, (_, i) => {
    const index = Math.floor((i * samples.length) / columns);
    return samples[Math.min(samples.length - 1, index)];
  });
}
