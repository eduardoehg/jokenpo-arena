const QUERY = '(prefers-reduced-motion: reduce)';

export interface MotionPreference {
  /** `true` quando o sistema pede menos movimento. */
  reduced(): boolean;
}

/**
 * Preferência de movimento reduzido do sistema.
 *
 * Desliga o que é **ênfase** — flash branco, explosão, faíscas e o
 * congelamento do hit-stop. A simulação em si continua: ela é o conteúdo da
 * página, não um efeito decorativo, e removê-la deixaria a tela vazia.
 *
 * Reage à mudança em tempo real: quem ativa a preferência no sistema com a
 * página aberta vê o efeito na hora, sem recarregar.
 */
export function createMotionPreference(): MotionPreference {
  // `matchMedia` não existe em todo ambiente; sem ele, assume-se movimento
  // normal, que é o padrão da plataforma.
  const query =
    typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;

  let reduced = query?.matches ?? false;

  query?.addEventListener('change', (event) => {
    reduced = event.matches;
  });

  return { reduced: () => reduced };
}
