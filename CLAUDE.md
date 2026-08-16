# Jokenpo Arena

Simulação web: papel, pedra e tesoura são disparados de três lados de uma arena quadrada, se movem em linha reta com direção aleatória, e ao colidir o perdedor é convertido no tipo do vencedor. A partida acaba quando resta um único tipo.

## Regras do jogo
- pedra vence tesoura
- tesoura vence papel
- papel vence pedra
- Colisão entre iguais: apenas resolução física (se afastam), sem conversão.

## Stack
- Vite + TypeScript, sem framework e sem engine de jogo
- Renderização em Canvas 2D
- Vitest para a lógica pura
- Deploy estático no GitHub Pages

## Arquitetura
```
src/
  core/        lógica pura, sem DOM e sem Canvas — 100% testável
    rules.ts       quem vence quem
    entity.ts      tipo Entity (posição, velocidade, tipo, raio)
    spawn.ts       geração inicial nas três bordas
    physics.ts     movimento, reflexão nas paredes
    collision.ts   spatial hash grid + resolução de colisões
    simulation.ts  orquestra um tick; recebe dt, devolve novo estado
  render/      desenho no canvas, só lê o estado
  ui/          HUD, controles, telas
  main.ts      game loop com requestAnimationFrame
```

## Regras de implementação
- `core/` nunca importa nada de `render/`, `ui/` ou de APIs do browser.
- O loop usa delta time: o resultado não pode depender do FPS da máquina.
- Colisão via spatial hash grid, nunca O(n²) ingênuo — precisa aguentar 300
  entidades a 60fps.
- Todo módulo em `core/` tem teste em Vitest antes de ser considerado pronto.
- Sem dependências novas em runtime sem me perguntar antes.

## Comandos
- `npm run dev` — servidor local
- `npm run build` — build de produção
- `npm run test` — testes