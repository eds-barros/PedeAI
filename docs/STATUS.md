# Status de implementação

Inventário do código do PR #3 (`feature/sprint1-backend`, commit `af64bab`) em 25 de novembro de 2026. A API está em `apps/api`.

| Capacidade | No código | Sobe na máquina local | Serviço ou credencial externa | Mock ou simulação |
| --- | --- | --- | --- | --- |
| API HTTP NestJS 11 + Fastify | Sim, pacote `@pedeai/api` em `apps/api` | Sim, com Docker Compose na raiz | Não | Não |
| Docker Compose (`docker-compose.yml` na raiz) | Sim. Serviços `postgres` e `api`. `web` só no profile `web` | Conferido: `docker compose up --build` | Imagem `postgres:16-alpine` e `node:22-alpine` | Não |
| PostgreSQL, Prisma 6, migration `20261124210000_init` | Sim | O container da API roda `prisma migrate deploy` | Banco do Compose (usuário, senha e banco `pedeai`) | Não |
| Seed com duas empresas e um usuário por papel | Sim, `prisma/seed.ts` | Roda no container quando `SEED_ON_START=true` | Não | Não |
| Autenticação (login, refresh, logout, senha, troca de empresa) | Sim, prefixo `/api/v1/auth` e `GET /api/v1/me` | Local, segredo JWT do Compose | Não | Não |
| Empresa ativa (`GET` e `PATCH /api/v1/companies/current`) | Sim | Local | Não | Não |
| Usuários da empresa (`/api/v1/users`) | Sim. Admin escreve; Gerente lista e consulta | Local | Não | Não |
| Papéis (`GET /api/v1/roles`) | Sim | Local | Não | Não |
| Isolamento por empresa | Sim. Consultas usam o `empresaId` do token | Coberto por testes do pacote | Não | Não |
| Swagger em `/api/docs` | Sim (`@nestjs/swagger`) | UI ligada fora de `NODE_ENV=test` | Não | Não |
| Testes unitários | Sim, `npm test` no pacote | 11 suítes, 62 testes, na conferência | Não | Não |
| Testes e2e | Sim, `npm run test:e2e`. O `globalSetup` roda `prisma migrate reset --force` no banco `pedeai_test` de `.env.test` | Na conferência o Prisma interrompeu o reset antes de apagar dados (comando disparado por agente, sem consentimento explícito). A suíte não chegou a executar aqui | Não | Não |
| Cobertura | Script `npm run test:cov` | Não faz parte do fluxo mínimo | Não | Não |
| Frontend `apps/web` | Ausente neste commit. O Compose só tenta subir com `--profile web` | Não | Não | Não |
| KDS | Ausente | Não | — | Não |
| NFC-e / SEFAZ | Ausente | Não | — | Não |
| SAT | Ausente | Não | — | Não |
| TEF | Ausente | Não | — | Não |
| Gateway de pagamento | Ausente. O enum `FormaPagamento` existe no schema, sem cliente de pagamento | Não | — | Não |
| Impressora | Ausente | Não | — | Não |
| E-mail | Código sim. `development` grava no log. `test` guarda em memória. `production` usa SMTP | Log local, sem servidor SMTP | `SMTP_HOST` e credenciais só em production | Log em development; memória em test |
| Pedido, caixa, produto, categoria | Tabelas e seed de cardápio. Sem rotas HTTP nesta sprint | Dados entram pelo seed | Não | Não |
