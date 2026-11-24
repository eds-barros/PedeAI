# PedeAI

SaaS multi-empresa para lanchonetes e restaurantes (PDV, KDS e painel).

Monorepo pnpm:

- `apps/web` — frontend Next.js desta sprint. Veja [apps/web/README.md](apps/web/README.md).
- `backend` — API NestJS, em outro fluxo de trabalho. A pasta entra no `pnpm-workspace.yaml` e ainda não existe neste checkout. Não há `apps/api`.

Contrato que o frontend usa: [docs/api-contract-frontend.md](docs/api-contract-frontend.md). Tokens visuais (Praça): [docs/design-system-praca.md](docs/design-system-praca.md).

```bash
pnpm install
pnpm --filter web dev
```

O `dev` sobe o web em modo mock, sem o backend.
