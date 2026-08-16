import { describe, expect, it } from 'vitest';
import {
  CHART_COLUMNS,
  createTimeline,
  resample,
  SAMPLE_INTERVAL,
  sampleTimeline,
  type Sample,
} from './timeline';

const sample = (paper: number, rock: number, scissors: number): Sample => ({
  paper,
  rock,
  scissors,
});

describe('createTimeline', () => {
  it('já nasce com a amostra do instante zero', () => {
    const timeline = createTimeline(sample(30, 30, 30));

    expect(timeline.samples).toEqual([{ paper: 30, rock: 30, scissors: 30 }]);
    expect(timeline.nextAt).toBe(SAMPLE_INTERVAL);
  });

  it('copia a amostra em vez de guardar a referência', () => {
    const counts = sample(30, 30, 30);
    const timeline = createTimeline(counts);

    counts.paper = 99;
    expect(timeline.samples[0].paper).toBe(30);
  });
});

describe('sampleTimeline', () => {
  it('não registra antes do intervalo', () => {
    const timeline = createTimeline(sample(30, 30, 30));

    sampleTimeline(timeline, 0.1, sample(29, 31, 30));

    expect(timeline.samples).toHaveLength(1);
  });

  it('registra ao completar o intervalo', () => {
    const timeline = createTimeline(sample(30, 30, 30));

    sampleTimeline(timeline, 0.2, sample(29, 31, 30));

    expect(timeline.samples).toHaveLength(2);
    expect(timeline.samples[1]).toEqual({ paper: 29, rock: 31, scissors: 30 });
  });

  it('agenda a próxima a partir do instante registrado', () => {
    const timeline = createTimeline(sample(30, 30, 30));

    sampleTimeline(timeline, 0.35, sample(29, 31, 30));

    expect(timeline.nextAt).toBeCloseTo(0.55);
  });

  it('não duplica amostra dentro do mesmo intervalo', () => {
    const timeline = createTimeline(sample(30, 30, 30));

    sampleTimeline(timeline, 0.25, sample(29, 31, 30));
    sampleTimeline(timeline, 0.3, sample(28, 32, 30));
    sampleTimeline(timeline, 0.4, sample(27, 33, 30));

    expect(timeline.samples).toHaveLength(2);
  });

  it('acompanha uma partida inteira em cadência constante', () => {
    const timeline = createTimeline(sample(30, 30, 30));

    // 10 segundos simulados em passos de 1/60.
    for (let step = 1; step <= 600; step++) {
      sampleTimeline(timeline, step / 60, sample(30, 30, 30));
    }

    // 1 inicial + uma a cada 0,2s.
    expect(timeline.samples.length).toBeGreaterThanOrEqual(50);
    expect(timeline.samples.length).toBeLessThanOrEqual(52);
  });

  it('copia a amostra recebida', () => {
    const timeline = createTimeline(sample(30, 30, 30));
    const counts = sample(29, 31, 30);

    sampleTimeline(timeline, 0.2, counts);
    counts.paper = 99;

    expect(timeline.samples[1].paper).toBe(29);
  });
});

describe('resample', () => {
  it('devolve exatamente o número de colunas pedido', () => {
    expect(resample([1, 2, 3], CHART_COLUMNS)).toHaveLength(CHART_COLUMNS);
    expect(resample(Array.from({ length: 900 }, (_, i) => i), 64)).toHaveLength(64);
  });

  it('preserva o primeiro e o último ponto da série', () => {
    const series = Array.from({ length: 500 }, (_, i) => i);
    const columns = resample(series, 64);

    expect(columns[0]).toBe(0);
    expect(columns[63]).toBe(series[Math.floor((63 * 500) / 64)]);
  });

  it('estica uma série curta sem estourar o índice', () => {
    const columns = resample([10, 20], 64);

    expect(columns).toHaveLength(64);
    expect(new Set(columns)).toEqual(new Set([10, 20]));
  });

  it('funciona com uma amostra só', () => {
    expect(resample([7], 64)).toEqual(new Array(64).fill(7));
  });

  it('preserva a ordem cronológica', () => {
    const columns = resample([1, 2, 3, 4, 5, 6, 7, 8], 8);

    expect(columns).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('devolve vazio para série vazia ou zero colunas', () => {
    expect(resample([], 64)).toEqual([]);
    expect(resample([1, 2, 3], 0)).toEqual([]);
  });
});
