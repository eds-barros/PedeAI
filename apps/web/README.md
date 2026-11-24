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
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Base da API **com** o prefixo `/api/v1`, sem barra no final. |
| `NEXT_PUBLIC_API_MOCK` | `false` | `true` inicia o MSW no navegador e dispensa o backend. O padrão é a API real. |

O `pnpm --filter web dev` sobe na porta **3001**. A API ocupa a 3000 e o `CORS_ORIGIN` do backend é `http://localhost:3001`. Swagger: `http://localhost:3000/api/docs`. A autenticação vai no header `Authorization`, não em cookie.

## Contas

São as do seed do backend. A API real escuta em `http://localhost:3000` e o CORS dela libera `http://localhost:3001`, então o web sobe nessa porta:

```bash
pnpm --filter web dev
```

`NEXT_PUBLIC_API_MOCK` fica `false` por padrão. Para o modo sem backend, use `NEXT_PUBLIC_API_MOCK=true`.

| E-mail | Senha | Papel |
| --- | --- | --- |
| `admin.pizzaria@pedeai.local` | `PizzariaAdmin1` | Admin da Pizzaria Bella Napoli |
| `gerente.pizzaria@pedeai.local` | `PizzariaGerente1` | Gerente da pizzaria |
| `caixa.pizzaria@pedeai.local` | `PizzariaCaixa1` | Caixa da pizzaria |
| `garcom.pizzaria@pedeai.local` | `PizzariaGarcom1` | Garçom da pizzaria |
| `cozinha.pizzaria@pedeai.local` | `PizzariaCozinha1` | Cozinha da pizzaria |
| `multi@pedeai.local` | `MultiEmpresa1` | Garçom na pizzaria e gerente na Lanchonete do Zé |

A lanchonete tem o mesmo conjunto (`admin.lanchonete@pedeai.local` / `LanchoneteAdmin1`, e os outros papéis no mesmo formato).

A senha precisa ter de 8 a 72 caracteres, com letra e número (só ASCII, como a API).

PDV, KDS, cardápio, pedidos e relatórios existem no catálogo, mas ficam fora do menu enquanto `UNRELEASED_MODULES_VISIBLE` em `src/lib/permissions.ts` for `false`.

No mock, o token `demo-reset` redefine a senha do admin da pizzaria: [http://localhost:3001/redefinir-senha?token=demo-reset](http://localhost:3001/redefinir-senha?token=demo-reset). Na API real o link sai no log do backend (`APP_URL` + `/redefinir-senha?token=`). O “esqueci minha senha” sempre mostra a mesma frase.

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
