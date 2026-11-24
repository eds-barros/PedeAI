# PedeAI Web

Frontend da Sprint 1 (Next.js App Router, TypeScript, Tailwind CSS). A interface está em português do Brasil.

O backend NestJS fica em `/backend` e **não** faz parte deste app. O workspace pnpm já inclui `apps/*` e `backend` para ele entrar depois sem mudar este pacote.

## Rodar em modo mock

Na raiz do repositório:

```bash
pnpm install
pnpm --filter web dev
```

O arquivo `apps/web/.env.development` já liga o mock. Abra [http://localhost:3000](http://localhost:3000).

| Variável | Exemplo | Função |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3333/api/v1` | Base da API **com** o prefixo `/api/v1`, sem barra no final. |
| `NEXT_PUBLIC_API_MOCK` | `true` | `true` inicia o MSW no navegador e dispensa o backend. |

Para apontar ao backend real, copie `.env.example` para `.env.local` e defina `NEXT_PUBLIC_API_MOCK=false`. O backend precisa aceitar a origem do web em `CORS_ORIGIN` (por exemplo `http://localhost:3000`). A autenticação desta sprint vai no header `Authorization`, não em cookie. O Swagger do backend fica em `/api/docs`.

## Contas de demonstração

Senha de todas: `senha1234`.

| E-mail | O que mostra |
| --- | --- |
| `ana.silva@pedeai.dev` | Duas empresas. Administradora na Padaria da Praça, gerente na Lanchonete Central. |
| `bruno.costa@pedeai.dev` | Uma empresa. Caixa: menu sem usuários, KDS, cardápio e relatórios. |
| `elisa.rocha@pedeai.dev` | Cozinha. |

O link de redefinição, no mock, aceita o token `demo-reset` (senha da Ana): [http://localhost:3000/redefinir-senha?token=demo-reset](http://localhost:3000/redefinir-senha?token=demo-reset). O “esqueci minha senha” sempre responde com a mesma frase, tenha o e-mail cadastro ou não.

## Scripts

```bash
pnpm --filter web dev
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

## Onde mexer

- Tokens e tema: `src/app/globals.css` e `docs/design-system-praca.md`.
- Permissões (menu e proxy): `src/lib/permissions.ts`.
- Cliente HTTP, guarda de tokens e refresh único em voo: `src/lib/api`.
- Mock: `src/mocks`.
- Contrato combinado com o backend: `docs/api-contract-frontend.md`.

Os tokens de acesso ficam só em memória. O refresh fica em `sessionStorage` porque o contrato desta sprint manda o refresh no corpo, sem cookie `HttpOnly`. O cookie `pedeai_session` guarda só o papel e a empresa para o `src/proxy.ts` proteger a rota; ele não autoriza a API.
