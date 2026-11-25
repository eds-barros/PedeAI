# PedeAI

SaaS multi-empresa para lanchonetes e restaurantes (PDV, KDS e painel).

Monorepo pnpm:

- `apps/web` — frontend Next.js desta sprint. Veja [apps/web/README.md](apps/web/README.md).
- `apps/api` — API NestJS. O glob `apps/*` do pnpm já inclui esse pacote. A mudança de pasta sai no PR da API.

Contrato que o frontend usa: [docs/api-contract-frontend.md](docs/api-contract-frontend.md). Tokens visuais (Praça): [docs/design-system-praca.md](docs/design-system-praca.md).

```bash
pnpm install
pnpm --filter web dev
```

O `dev` sobe o web em `http://localhost:3001` falando com a API em `http://localhost:3000/api/v1`. Para rodar sem a API, defina `NEXT_PUBLIC_API_MOCK=true`.
