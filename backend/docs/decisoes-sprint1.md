# Decisões do backend — Sprint 1 (Hulk)

Respostas à seção 8 do plano de testes da Vision. Valem como especificação para a implementação.
Prefixo da API: `/api/v1`. Swagger: `/api/docs`. Pasta do backend: `/backend` (pode mudar para `apps/api`, decisão pendente com o Edson; caminhos abaixo são relativos à pasta do backend).

## 8.1 Contratos e convenções

1. Endpoints (todos JSON; erros sempre `{statusCode, message, errors?}`, message em pt-BR, `errors=[{field,message}]` em validação → 400):
   - `POST /auth/login` {email,password} → 200 {accessToken, refreshToken, user:{id,name,email}, companies:[{id,name,role}], activeCompanyId}. 401 "E-mail ou senha inválidos." (mesma mensagem para e-mail inexistente, senha errada, usuário desativado ou sem vínculo ativo). 429 no bloqueio.
   - `POST /auth/refresh` {refreshToken} → 200 {accessToken, refreshToken}. 401 se inválido/expirado/revogado/reusado ou usuário desativado.
   - `POST /auth/logout` {refreshToken} (Bearer) → 204.
   - `POST /auth/forgot-password` {email} → 204 sempre.
   - `POST /auth/reset-password` {token,newPassword} → 204; 400 token inválido/expirado (TTL 1h, uso único). Revoga todos os refresh do usuário.
   - `PATCH /auth/change-password` {currentPassword,newPassword} (Bearer) → 204; 400 senha atual incorreta. Revoga os demais refresh.
   - `POST /auth/switch-company` {companyId} (Bearer) → 200 {accessToken, refreshToken, activeCompanyId, role}; 404 se não tem vínculo ativo com a empresa.
   - `GET /me` → 200 {user, companies, activeCompanyId, role, permissions:[string]} (permissions serve de fonte para o menu).
   - `GET /companies/current` → 200; `PATCH /companies/current` (ADMIN) → 200.
   - `GET /roles` → 200 lista dos papéis e permissões.
   - `GET /users?page=1&pageSize=20&search=&role=&active=` (ADMIN, GERENTE) → {data, meta:{page,pageSize,total,totalPages}}; pageSize máx. 100.
   - `POST /users` (ADMIN) {name,email,password,role} → 201; 409 se o e-mail já tem vínculo nesta empresa. Se o e-mail já existe em outra empresa, cria só o vínculo (senha informada é ignorada).
   - `GET /users/:id` (ADMIN, GERENTE) → 200; 404 se não pertence à empresa ativa.
   - `PATCH /users/:id` (ADMIN) {name?, role?} → 200.
   - `PATCH /users/:id/status` (ADMIN) {active} → 200; 409 se for desativar/rebaixar o último Admin ativo.
2. JWT: `sub` = usuarioId, `empresaId` = empresa ativa, `papel` = papel na empresa ativa, `jti`. Empresa ativa só no token, sem header. Access TTL 15 min; refresh TTL 7 dias, opaco, armazenado como hash, rotação a cada uso com detecção de reúso (reúso revoga a família inteira).
3. A empresa ativa vem só da claim `empresaId`. Header de empresa não é lido; trocar empresa só via `/auth/switch-company`.
4. Convenção confirmada: outra empresa = 404 genérico; papel insuficiente = 403; sem token/expirado/revogado/usuário desativado = 401; login inválido = 401 mensagem única; rate limit = 429; regra do último Admin = 409.
5. Rate limit do login: chave IP+e-mail, 5 tentativas falhas em 15 min → bloqueio de 15 min; e 20 req/15 min por IP. Durante o bloqueio, até credenciais corretas recebem 429. Envia `Retry-After`. forgot-password: 5/h por IP.
6. bcrypt, custo 12 (prefixo `$2b$12$`).
7. Várias sessões simultâneas (uma família de refresh por login/dispositivo). O guard revalida a cada request que o usuário e o vínculo com a empresa ativa estão ativos (desativado → 401 imediato), além do refresh.
8. IDs UUID v4 em todas as entidades.

## 8.2 Regras de negócio

9. Gerente não cria nem promove Admin. Na Sprint 1 só Admin cria/edita/desativa/reativa usuários; Gerente só lista e consulta.
10. Gerente não edita nem desativa Admin (403).
11. A empresa nunca fica sem Admin ativo: desativar, rebaixar ou remover o último Admin → 409.
12. Sim, papel é por vínculo usuário-empresa (Garçom em A e Gerente em B).
13. E-mail único global (usuário é global; vínculos por empresa).
14. Admin define senha temporária na criação. Convite por e-mail fora do escopo.
15. Soft delete: `ativo=false` no vínculo da empresa (e no usuário para bloqueio global). Sem hard delete. Isolamento vale para desativados.
16. Sem super-admin na Sprint 1.

## 8.3 Automação, seed e CI

17. Scripts: `npm run test` (unit), `npm run test:e2e` (Jest + Supertest contra Postgres real), `npm run test:cov`. Banco de teste via `DATABASE_URL` em `.env.test` (CI sobe service postgres).
18. Pastas: `src/modules/auth/`, `src/modules/empresas/`, `src/modules/usuarios/`, `src/modules/papeis/`, `src/common/tenant/` (guards, decorators de empresa/papel).
19. coverageThreshold 70% nas quatro métricas nessas pastas. Exclusões: `main.ts`, `*.module.ts`, `*.dto.ts`, client Prisma gerado, `prisma/seed.ts`.
20. e2e: `prisma migrate reset --force` uma vez no globalSetup + `TRUNCATE ... CASCADE` antes de cada arquivo; e2e roda com `--runInBand`.
21. Seed: `npx prisma db seed` (alias `npm run seed`), idempotente via upsert por e-mail (Usuario), slug/CNPJ (Empresa) e chave composta (vínculo). Aborta se `NODE_ENV=production`. 2 empresas demo (Pizzaria e Lanchonete), 1 usuário por papel em cada, mais um usuário multiempresa (Garçom em A e Gerente em B). Credenciais documentadas no README do backend.
22. Compose: `postgres` (healthcheck pg_isready), `api` (depende de postgres saudável; roda `prisma migrate deploy` no start; seed só se `SEED_ON_START=true`; healthcheck `GET /api/v1/health`), `web` em apps/web quando existir. `.env.example` do backend sem segredos reais.
23. Logger pino com redact de `password`, `newPassword`, `currentPassword`, `refreshToken`, `accessToken`, `authorization`. Nos testes, logger injetável permite capturar a saída em memória.
24. Menu: `GET /me` devolve `permissions`; o E2E pode validar pelo payload.

## Revisão 1.1 (riscos de isolamento levantados pela QA) — estas regras substituem as anteriores onde divergirem

- C1: `POST /users` com e-mail que já existe em qualquer lugar (outra empresa, mesma empresa, ou vínculo desativado) → 409 com mensagem genérica "Não foi possível cadastrar este e-mail." Nunca cria vínculo com usuário existente nem revela UUID. Vínculo de usuário existente a outra empresa só via convite com aceite, fora da Sprint 1 (no seed, o usuário multiempresa é criado diretamente).
- C2: `PATCH /users/:id/status` altera só o vínculo usuário-empresa da empresa ativa. `usuario.ativo` global não é exposto pela API na Sprint 1.
- C3: o JWT ganha a claim `sid` (id da sessão/família de refresh). A sessão guarda `empresaAtivaId`. `switch-company` rotaciona o refresh dentro da mesma família (o anterior fica inválido, reúso dispara a detecção) e atualiza `empresaAtivaId` da sessão. O guard rejeita com 401 todo access cujo `empresaId` não bate com `empresaAtivaId` da sessão ou cuja sessão está revogada, ou seja, o access antigo morre na hora.
- `GET /companies/current`: todos os papéis recebem {id, nomeFantasia, slug, logoUrl}; ADMIN e GERENTE recebem o cadastro completo (razaoSocial, cnpj, telefone, email, endereço). `PATCH /companies/current` (ADMIN): nomeFantasia, razaoSocial, telefone, email, endereco, logoUrl; cnpj e slug imutáveis.
- Catálogo de permissions (src/modules/papeis/permissoes.ts): `empresa:ler`, `empresa:editar`, `usuarios:ler`, `usuarios:gerenciar`, `papeis:ler`, `produtos:ler`, `produtos:gerenciar`, `pedidos:ler`, `pedidos:gerenciar`, `pdv:operar`, `caixa:operar`, `cozinha:operar`, `relatorios:ler`. ADMIN = todas; GERENTE = todas exceto `empresa:editar` e `usuarios:gerenciar`; CAIXA = empresa:ler, produtos:ler, pedidos:ler, pedidos:gerenciar, pdv:operar, caixa:operar; GARCOM = empresa:ler, produtos:ler, pedidos:ler, pedidos:gerenciar; COZINHA = empresa:ler, produtos:ler, pedidos:ler, cozinha:operar.
- `GET /roles`: ADMIN e GERENTE (alimenta o formulário de usuário).
- `GET /users/:id` de vínculo desativado na própria empresa → 200 com `active:false`. Listagem traz todos por padrão; filtro `active`.
- E-mail de vínculo soft-deletado na mesma empresa: `POST /users` → 409 genérico; o Admin reativa via `PATCH /users/:id/status`.
- Token de reset em teste: envio de e-mail atrás de um port `MailPort`; em `NODE_ENV=test` usa `InMemoryMailAdapter` (outbox em memória) exportado pelo módulo; o e2e obtém o token via `app.get(MAIL_PORT).ultimaMensagemPara(email)`. Sem endpoint HTTP de teste.
- Empresa ativa padrão no login: `usuario.ultimaEmpresaId` se o vínculo estiver ativo; senão o primeiro vínculo ativo por nomeFantasia (ordem alfabética).
- Política de senha: 8 a 72 caracteres, ao menos uma letra e um número.
- forgot-password em conta/vínculos desativados: 204 genérico e nenhum e-mail enviado. reset-password com token de usuário desativado: 400 "Token inválido ou expirado." Nunca reativa.

## Contratos internos (módulo de integrações e HTTP)

Estes nomes são estáveis para o PR de integrações. Caminhos relativos a `/backend`.

- Decorators em `src/common/tenant` (reexportados por `src/common/tenant/index.ts`):
  - `@UsuarioAtual()` devolve `UsuarioAutenticado = { id: string; email: string; empresaId: string; papel: Papel; jti: string; sid: string }` em `request.user`. `sid` entrou na revisão 1.1 (id da sessão).
  - `@EmpresaAtual()` devolve só `empresaId: string`.
  - `@Papeis(...papeis)` marca os papéis aceitos. O guard é a classe `RolesGuard`.
  - `@Public()` isenta a rota do JWT. Usar em login, refresh, forgot/reset, health e, no futuro, webhooks. Logout exige Bearer.
- `PrismaModule` global exporta `PrismaService` em `src/common/prisma`.
- Correlação: o adaptador Fastify lê `X-Request-Id` ou gera um UUID (`genReqId`), grava em `request.id` e devolve o mesmo valor no header `X-Request-Id`. `CorrelationIdInterceptor` inclui `requestId` nos logs.
- `NestFactory.create` usa `FastifyAdapter` e `{ rawBody: true }` para a futura validação de assinatura de webhooks (`request.rawBody`).
- Prefixo global `/api/v1` sem exclusões. Swagger em `/api/docs` (fora do prefixo, registrado à parte).
- `POST /auth/login`, `GET /me` e `POST /auth/switch-company` mantêm o contrato do frontend (`user.name`, `companies[].name` = `nomeFantasia`). `GET/PATCH /companies/current` usa os campos em português da revisão 1.1.
- O schema Prisma vive em `backend/prisma/schema.prisma` (não havia `prisma/schema.prisma` na raiz). O pacote não usa caminho absoluto, para poder ir para `apps/api` depois.

## Revisão 1.2

- Enum `Papel { ADMIN, GERENTE, CAIXA, GARCOM, COZINHA }`. Chaves de metadata: `IS_PUBLIC_KEY = 'isPublic'` (@Public) e `PAPEIS_KEY = 'papeis'` (@Papeis), exportadas de src/common/tenant.
- `POST /users`: custo de tempo igual nos caminhos 201 e 409 (sempre roda bcrypt.hash da senha antes de checar e-mail; resposta 409 só após o hash).
- `InMemoryMailAdapter` só pode ser registrado com `NODE_ENV=test`; a factory lança erro se for selecionado em outro ambiente. Fora de teste: adapter de log (dev) ou SMTP (prod, configurável).
- Ninguém altera o próprio papel nem desativa o próprio vínculo (403 "Você não pode alterar o próprio papel ou status."), mesmo havendo outro Admin.
- Sprint 1: Gerente só lista/consulta usuários (sem criar/editar ninguém).
- Respostas: `POST /users` 201 e `PATCH /users/:id` 200 e `PATCH /users/:id/status` 200 devolvem `{id, name, email, role, active, createdAt, updatedAt}`; `POST /auth/reset-password` 204.
- Permissions de módulos ainda sem API (produtos, pedidos, pdv, caixa, cozinha, relatorios) existem no catálogo, mas o front esconde esses itens nesta sprint.
