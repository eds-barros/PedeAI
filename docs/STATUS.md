# Status de implementação

Inventário do código versionado em 24 de novembro de 2026 (commit base `7b1775e`). A Sprint 1 pedida — auth, multi-empresa, usuários e seed — foi procurada no repositório e não está presente. Não há mock no lugar dessas partes.

| Capacidade | No código | Sobe na máquina local | Serviço ou credencial externa | Mock ou simulação |
| --- | --- | --- | --- | --- |
| Aplicação HTTP (NestJS, Fastify ou outra) | Ausente | Não | — | Não |
| Docker Compose | Ausente | `docker compose up` (Compose 2.40.3, engine 29.1.4) → `no configuration file provided: not found` | — | Não |
| PostgreSQL, Prisma, migrations | Ausente | Não (`psql` ausente na conferência; sem schema) | — | Não |
| Seed com duas empresas e um usuário por papel | Ausente | Não | — | Não |
| Autenticação (login, JWT, refresh, logout) | Ausente | Não | — | Não |
| Cadastro e consulta de empresas | Ausente | Não | — | Não |
| Cadastro e consulta de usuários | Ausente | Não | — | Não |
| Isolamento por empresa | Ausente | Não | — | Não |
| Swagger / OpenAPI em `/docs` | Ausente | Não | — | Não |
| Testes (unitário, integração, e2e, cobertura) | Ausente | `npm test` não encontra `package.json` | — | Não |
| Frontend | Ausente | Não | — | Não |
| KDS | Ausente | Não | — | Não |
| NFC-e / SEFAZ | Ausente | Não | — | Não |
| SAT | Ausente | Não | — | Não |
| TEF | Ausente | Não | — | Não |
| Gateway de pagamento | Ausente | Não | — | Não |
| Impressora | Ausente | Não | — | Não |
| E-mail | Ausente | Não | — | Não |

Nada nesta tabela depende de credencial externa, porque nada disso está implementado. Quando uma integração real entrar (SEFAZ, SAT, TEF, pagamento, impressora, e-mail), a linha deve dizer se o código chama o serviço de verdade ou se há modo de simulação, e qual variável liga um e outro.
