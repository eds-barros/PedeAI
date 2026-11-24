# Testes de integração do QA (Sprint 1)

Suíte adicional, alinhada a `casos-de-teste-sprint1.md` v1.2 e à revisão do contrato em `docs/decisoes-sprint1.md` (commit `052fa2e` e posteriores). Não substitui `npm test` nem `npm run test:e2e`.

```bash
cd backend
# Postgres de teste: DATABASE_URL de .env.test (banco pedeai_test)
npm run test:qa
```

O `globalSetup` é o oficial (`test/global-setup.ts`): cria o banco se faltar e roda `prisma migrate reset --force` uma vez. Cada arquivo trunca as tabelas com `test/truncate.ts`. O atalho `migrate deploy` do QA ficou redundante e não entra no repositório.

`test/qa/fixar-limites.ts` fixa, no processo de teste:

- `LOGIN_MAX_FALHAS_EMAIL=5`
- `LOGIN_MAX_FALHAS_IP=20`
- `LOGIN_JANELA_MIN=15`

Esses valores vencem um `.env.test` ou um ambiente de desenvolvimento com tetos mais folgados. O rate limit conta só falhas.

Contrato do último Admin coberto aqui: quem tenta rebaixar ou desativar a si mesmo recebe **403** (`Você não pode alterar o próprio papel ou status.`), mesmo sendo o único Admin. O **409** (`A empresa precisa ter ao menos um administrador ativo.`) continua valendo quando outro ator faria essa operação.
