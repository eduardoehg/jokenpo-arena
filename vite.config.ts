import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Necessário para o deploy em https://<user>.github.io/jokenpo-arena/
  base: '/jokenpo-arena/',
  test: {
    // `core/` é lógica pura: rodar em Node (sem jsdom) faz qualquer uso
    // acidental de API de browser quebrar o teste.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
