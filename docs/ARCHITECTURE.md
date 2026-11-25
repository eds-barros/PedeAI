# Arquitetura

Estado lido no PR #3, commit `af64bab`. A API é o pacote `@pedeai/api` em `apps/api`. O Compose faz build de `./apps/api`.

## Processos

O Compose da raiz sobe dois serviços no fluxo padrão:

| Serviço | Imagem / build | Porta no host | Função |
| --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | 5432 | Banco `pedeai`, usuário e senha `pedeai` |
| `api` | `apps/api/Dockerfile`, Node 22 | 3000 | `prisma migrate deploy`, seed se `SEED_ON_START=true`, depois `node dist/main.js` |

O serviço `web` está no profile `web`, com build em `./apps/web` e `NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1`. Essa pasta não existe no commit conferido.

## API

NestJS 11 com adaptador Fastify. Prefixo global `api/v1`. Swagger montado em `api/docs` (a UI fica desligada quando `NODE_ENV=test`).

Módulos com rota:

| Módulo | Rotas |
| --- | --- |
| Saúde | `GET /api/v1/health` |
| Auth | `POST /api/v1/auth/login`, `refresh`, `logout`, `forgot-password`, `reset-password`; `PATCH /api/v1/auth/change-password`; `POST /api/v1/auth/switch-company` |
| Sessão atual | `GET /api/v1/me` |
| Empresas | `GET` e `PATCH /api/v1/companies/current` |
| Usuários | `GET` e `POST /api/v1/users`; `GET` e `PATCH /api/v1/users/:id`; `PATCH /api/v1/users/:id/status` |
| Papéis | `GET /api/v1/roles` |

O login devolve `accessToken`, `refreshToken`, `user`, `companies` e `activeCompanyId`. O access token carrega `sub`, `empresaId`, `papel`, `jti` e `sid`. O refresh é opaco; o banco guarda o hash. Logout e troca de senha revogam sessão. `switch-company` reemite os tokens da mesma sessão com outra empresa.

Toda consulta de empresa e de usuário usa o `empresaId` do token. O corpo não escolhe a empresa, exceto `switch-company`, que troca a empresa da sessão entre os vínculos do usuário.

Papéis no enum `Papel`: `ADMIN`, `GERENTE`, `CAIXA`, `GARCOM`, `COZINHA`. Admin gerencia usuários. Gerente lista e consulta. Quem altera o próprio papel ou o próprio vínculo recebe 403 antes da regra do último Admin.

E-mail de redefinição: log em `development`, memória em `test`, SMTP em `production`.

## Dados

Prisma em `apps/api/prisma/schema.prisma`. Modelos: `Empresa`, `Usuario`, `UsuarioEmpresa`, `Sessao`, `RefreshToken`, `TokenRedefinicaoSenha`, `Categoria`, `Produto`, `Pedido`, `ItemPedido`, `Caixa`, `MovimentoCaixa`.

O seed cria duas empresas, um usuário de cada papel em cada uma, um usuário com vínculo nas duas, e itens de cardápio. Pedido e caixa não têm controller nesta sprint.
