import { describe, expect, it } from 'vitest';
import type { EntityType } from '../core/rules';
import {
  DISPLAY_ORDER,
  NARROW_THRESHOLD,
  segmentLayout,
} from './scoreboard';

const counts = (
  paper: number,
  rock: number,
  scissors: number,
): Record<EntityType, number> => ({ paper, rock, scissors });

const shareOf = (
  layout: ReturnType<typeof segmentLayout>,
  type: EntityType,
): number => layout.find((segment) => segment.type === type)!.share;

describe('segmentLayout — proporções', () => {
  it('divide a barra pela participação viva', () => {
    const layout = segmentLayout(counts(30, 30, 30));

    for (const segment of layout) expect(segment.share).toBeCloseTo(1 / 3);
  });

  it('soma sempre 100% da barra', () => {
    for (const sample of [
      counts(8, 33, 49),
      counts(1, 1, 88),
      counts(45, 45, 0),
    ]) {
      const total = segmentLayout(sample).reduce((sum, s) => sum + s.share, 0);
      expect(total).toBeCloseTo(1);
    }
  });

  it('mantém a ordem visual papel, pedra, tesoura', () => {
    expect(segmentLayout(counts(1, 2, 3)).map((s) => s.type)).toEqual([
      'paper',
      'rock',
      'scissors',
    ]);
    expect(DISPLAY_ORDER).toEqual(['paper', 'rock', 'scissors']);
  });

  it('reflete populações desiguais', () => {
    const layout = segmentLayout(counts(8, 33, 49));

    expect(shareOf(layout, 'paper')).toBeCloseTo(8 / 90);
    expect(shareOf(layout, 'rock')).toBeCloseTo(33 / 90);
    expect(shareOf(layout, 'scissors')).toBeCloseTo(49 / 90);
  });
});

describe('segmentLayout — salto para fora', () => {
  it('marca como estreito quem está abaixo do limiar', () => {
    // 8 de 90 ≈ 8,9%, abaixo dos 13%.
    const layout = segmentLayout(counts(8, 33, 49));

    expect(layout[0].narrow).toBe(true);
    expect(layout[1].narrow).toBe(false);
    expect(layout[2].narrow).toBe(false);
  });

  it('não marca quem está exatamente no limiar', () => {
    const layout = segmentLayout(counts(13, 87, 0));

    expect(shareOf(layout, 'paper')).toBeCloseTo(NARROW_THRESHOLD);
    expect(layout[0].narrow).toBe(false);
  });

  it('marca o tipo extinto', () => {
    const layout = segmentLayout(counts(0, 38, 52));

    expect(layout[0].share).toBe(0);
    expect(layout[0].narrow).toBe(true);
  });
});

describe('segmentLayout — rótulos', () => {
  it('formata com três dígitos', () => {
    expect(segmentLayout(counts(8, 33, 49)).map((s) => s.label)).toEqual([
      '008',
      '033',
      '049',
    ]);
  });

  it('mostra 000 no tipo extinto em vez de sumir com a leitura', () => {
    expect(segmentLayout(counts(0, 38, 52))[0].label).toBe('000');
  });
});

describe('segmentLayout — casos degenerados', () => {
  it('não divide por zero com a arena vazia', () => {
    const layout = segmentLayout(counts(0, 0, 0));

    for (const segment of layout) {
      expect(segment.share).toBe(0);
      expect(Number.isNaN(segment.share)).toBe(false);
      expect(segment.label).toBe('000');
    }
  });

  it('trata contagem negativa como zero', () => {
    const layout = segmentLayout(counts(-5, 50, 50));

    expect(layout[0].share).toBe(0);
    expect(layout[0].label).toBe('000');
    expect(shareOf(layout, 'rock')).toBeCloseTo(0.5);
  });

  it('dá a barra inteira ao único sobrevivente', () => {
    const layout = segmentLayout(counts(0, 90, 0));

    expect(shareOf(layout, 'rock')).toBe(1);
    expect(layout[1].narrow).toBe(false);
  });
});
