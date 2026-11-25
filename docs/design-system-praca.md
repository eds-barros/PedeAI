# Praça — Design System v1

Nome provisório dos tokens do PedeAI. A implementação está em `apps/web/src/app/globals.css`: variáveis CSS no `:root` e em `.dark`, ligadas ao Tailwind 4 por `@theme inline` (`bg-primary`, `text-muted`, `border-border-strong`, e assim por diante).

A fonte é Inter (`next/font`), aplicada em `--font-inter`.

## Tema sem flash

Um script bloqueante (`themeBootScript`) roda antes de pintar o corpo. Ele lê `localStorage["pedeai-theme"]` (`light` ou `dark`). Sem valor salvo, usa `prefers-color-scheme`. O botão do header grava a escolha e passa a ignorar a mudança do sistema até a chave ser apagada. `color-scheme` acompanha o tema para os controles nativos.

## Claro

| Token | Valor | Uso | Contraste |
| --- | --- | --- | --- |
| `--background` | `#F4EFE6` | Papel quente da página | — |
| `--surface` | `#FFFCF8` | Cartões, campos, header | — |
| `--surface-muted` | `#EFE8DC` | Faixas e filtros | — |
| `--sidebar` | `#E9E2D4` | Menu lateral | — |
| `--foreground` | `#1F1A14` | Texto | 15,08:1 no papel; 16,88:1 na superfície |
| `--muted` | `#5C554A` | Texto secundário | 6,43:1 no papel; 7,20:1 na superfície |
| `--border` | `#D9D0C2` | Divisores | decorativo |
| `--border-strong` | `#8A8175` | Borda de campo | 3,75:1 na superfície (mínimo de componente, 3:1) |
| `--primary` | `#0D6E56` | Botão, marca, foco | 6,21:1 com branco |
| `--primary-hover` | `#0A5B47` | Hover do botão | 8,08:1 com branco |
| `--ring` / `--accent` | `#0D6E56` | Foco e links | 6,21:1 com branco |
| `--danger` | `#9E2A2A` | Erro e botão destrutivo | 7,45:1 com branco; 7,28:1 como texto na superfície |
| `--nav-active` | `#E7F4EF` / texto `#0D6E56` | Item ativo | 5,50:1 |

## Escuro

| Token | Valor | Uso | Contraste |
| --- | --- | --- | --- |
| `--background` | `#141210` | Fundo quente | — |
| `--surface` | `#1F1C18` | Cartões | — |
| `--surface-muted` | `#2A261F` | Faixas | — |
| `--sidebar` | `#1A1815` | Menu | — |
| `--foreground` | `#F7F2EA` | Texto | 16,77:1 no fundo; 15,23:1 na superfície |
| `--muted` | `#C4B6A6` | Texto secundário | 9,42:1 no fundo; 8,56:1 na superfície |
| `--border-strong` | `#8A8176` | Borda de campo | 4,43:1 na superfície |
| `--primary` | `#157A64` | Botão | 5,25:1 com branco; 3,23:1 contra a superfície |
| `--primary-hover` | `#0F6A58` | Hover | 6,52:1 com branco |
| `--accent` / `--ring` | `#5EC8A6` | Foco, link, item ativo | 8,31:1 na superfície; 6,51:1 sobre `#16352C` |
| `--accent-foreground` | `#10241C` | Texto sobre o acento | 7,97:1 |
| `--danger` | `#F0B4B4` | Texto de erro | 9,61:1 na superfície |
| `--danger-solid` | `#9E2A2A` | Botão destrutivo | 7,45:1 com branco |

Badges de papel usam pares próprios (fundo e texto) acima de 7:1 nos dois temas. Situação de usuário é texto (“Ativo” / “Inativo”), não só cor.

## Foco, teclado e componentes

- Anel de foco de 2px na cor `--ring`, com offset, em `:focus-visible`.
- Botão: `primary`, `secondary`, `ghost`, `danger`; tamanhos `sm`, `md`, `lg`; `loading` desabilita, expõe `aria-busy` e um ícone decorativo. O texto visível continua na legenda (“Entrando…”).
- Input, select nativo e checkbox têm `label`, `aria-invalid` e `aria-describedby` apontando para o erro (`role="alert"`). Senha pode ser revelada por um botão com `aria-pressed`.
- Tabela vira cartão abaixo de `md`. Os dois layouts não ficam os dois no fluxo: um usa `display: none`.
- Diálogo (Radix) prende o foco e fecha por Escape e pelo botão “Fechar”. O menu mobile é um diálogo.
- Toast (Radix) anuncia título e descrição e tem “Fechar aviso”.
- Dropdown (Radix) cobre o menu da conta e a troca de empresa.
- Há um link “Ir para o conteúdo” no início da página.

`prefers-reduced-motion: reduce` encurta animações.
