import type { EntityType } from '../core/rules';

/**
 * Bleeps 8-bit sintetizados na hora.
 *
 * Onda quadrada com envelope curto — o timbre de console de 8 bits. Nada de
 * arquivo de áudio: zero bytes no bundle e zero dependências, e o timbre é
 * exatamente o mesmo em qualquer navegador.
 */

/** Frequência base de cada tipo, em Hz. Grave para pedra, agudo para tesoura. */
const CONVERSION_PITCH: Record<EntityType, number> = {
  rock: 196,
  paper: 294,
  scissors: 440,
};

/** Arpejo de vitória, em semitons a partir da nota do vencedor. */
const VICTORY_STEPS = [0, 4, 7, 12];

const BLEEP_DURATION = 0.07;
const BLEEP_GAIN = 0.07;
const VICTORY_NOTE = 0.11;
const VICTORY_GAIN = 0.09;

export interface Audio {
  enabled(): boolean;
  setEnabled(enabled: boolean): void;
  /** Bleep curto do impacto que converteu uma peça. */
  conversion(winner: EntityType): void;
  /** Arpejo curto no fim da partida. */
  victory(winner: EntityType): void;
  /**
   * Destrava o áudio a partir de um gesto do usuário.
   *
   * A política de autoplay suspende qualquer contexto criado sem interação;
   * chamar isto no clique de um botão é o que o torna audível.
   */
  unlock(): void;
}

type AudioContextConstructor = typeof AudioContext;

function audioContextConstructor(): AudioContextConstructor | null {
  const scope = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };

  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function createAudio(initiallyEnabled: boolean): Audio {
  const Ctor = audioContextConstructor();

  let enabled = initiallyEnabled;
  let context: AudioContext | null = null;

  /** Cria o contexto só quando for tocar: nada é alocado se ninguém ouvir. */
  function ensureContext(): AudioContext | null {
    if (!Ctor) return null;
    context ??= new Ctor();

    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function bleep(
    frequency: number,
    duration: number,
    gainValue: number,
    startOffset = 0,
  ): void {
    const ctx = ensureContext();
    if (!ctx) return;

    const start = ctx.currentTime + startOffset;

    const oscillator = ctx.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, start);

    // Envelope: ataque instantâneo e queda exponencial. Sem ele, ligar e
    // desligar a onda produz um estalo em vez de uma nota.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  return {
    enabled: () => enabled,

    setEnabled(value) {
      enabled = value;
      if (value) ensureContext();
    },

    unlock() {
      if (enabled) ensureContext();
    },

    conversion(winner) {
      if (!enabled) return;
      bleep(CONVERSION_PITCH[winner], BLEEP_DURATION, BLEEP_GAIN);
    },

    victory(winner) {
      if (!enabled) return;

      const root = CONVERSION_PITCH[winner];
      VICTORY_STEPS.forEach((semitones, index) => {
        // Cada semitom multiplica a frequência pela raiz doze de dois.
        const frequency = root * 2 ** (semitones / 12);
        bleep(frequency, VICTORY_NOTE, VICTORY_GAIN, index * VICTORY_NOTE);
      });
    },
  };
}
