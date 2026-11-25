# PedeAI

Repositório: [eds-barros/PedeAI](https://github.com/eds-barros/PedeAI). A descrição cadastrada no GitHub é «Sistema de Restaurantee em Geral».

A Sprint 1 (autenticação, multiempresa, usuários e seed) está na API NestJS em `apps/api`, no [PR #3](https://github.com/eds-barros/PedeAI/pull/3), commit `af64bab`. Este README foi conferido nessa árvore.

## Como subir, semear, entrar e testar

Na raiz do repositório, o arquivo é `docker-compose.yml`. O serviço `api` faz build de `./apps/api`.

```bash
docker compose up --build
```

O Compose sobe:

| Serviço | O que faz |
| --- | --- |
| `postgres` | Postgres 16. Usuário, senha e banco `pedeai`. Porta 5432. |
| `api` | Na subida: `prisma migrate deploy`, depois `prisma db seed` porque `SEED_ON_START=true`, depois a API na porta 3000. |

Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

Saúde: `GET http://localhost:3000/api/v1/health` devolve `{"status":"ok"}`.

O frontend só entra com o profile `web` (`apps/web`, porta 3001). Essa pasta não está no commit conferido.

```bash
docker compose --profile web up --build
```

### Sem o container da API

Com o Postgres no ar:

```bash
cd apps/api
cp .env.example .env
```

Aponte `DATABASE_URL` para o banco. Contra o Postgres do Compose, na máquina host:

```text
postgresql://pedeai:pedeai@localhost:5432/pedeai?schema=public
```

`JWT_ACCESS_SECRET` precisa ter pelo menos 16 caracteres. `CORS_ORIGIN` não pode ficar vazio.

```bash
npm ci
npx prisma migrate deploy
npm run seed
npm run start:dev
```

O seed recusa `NODE_ENV=production`. É idempotente (upsert por slug, e-mail e vínculo).

### Credenciais do seed

Copiadas de `apps/api/prisma/seed.ts`. Cada papel existe nas duas empresas. O usuário `multi@pedeai.local` tem um vínculo a mais: garçom na pizzaria (empresa ativa) e gerente na lanchonete.

| Empresa | Papel | E-mail | Senha |
| --- | --- | --- | --- |
| Pizzaria Bella Napoli | ADMIN | admin.pizzaria@pedeai.local | PizzariaAdmin1 |
| Pizzaria Bella Napoli | GERENTE | gerente.pizzaria@pedeai.local | PizzariaGerente1 |
| Pizzaria Bella Napoli | CAIXA | caixa.pizzaria@pedeai.local | PizzariaCaixa1 |
| Pizzaria Bella Napoli | GARCOM | garcom.pizzaria@pedeai.local | PizzariaGarcom1 |
| Pizzaria Bella Napoli | COZINHA | cozinha.pizzaria@pedeai.local | PizzariaCozinha1 |
| Lanchonete do Zé | ADMIN | admin.lanchonete@pedeai.local | LanchoneteAdmin1 |
| Lanchonete do Zé | GERENTE | gerente.lanchonete@pedeai.local | LanchoneteGerente1 |
| Lanchonete do Zé | CAIXA | caixa.lanchonete@pedeai.local | LanchoneteCaixa1 |
| Lanchonete do Zé | GARCOM | garcom.lanchonete@pedeai.local | LanchoneteGarcom1 |
| Lanchonete do Zé | COZINHA | cozinha.lanchonete@pedeai.local | LanchoneteCozinha1 |
| Pizzaria (GARCOM) e Lanchonete (GERENTE) | os dois | multi@pedeai.local | MultiEmpresa1 |

Na conferência de 25/11/2026, os onze logins responderam HTTP 200 no commit `af64bab`.

### Login

```bash
curl -sS -X POST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin.pizzaria@pedeai.local","password":"PizzariaAdmin1"}'
```

A resposta traz `accessToken`, `refreshToken`, `user`, `companies` e `activeCompanyId`. Senha errada devolve 401 com a mensagem «E-mail ou senha inválidos.»

### Testes

```bash
cd apps/api
npm test
npm run test:cov
npm run test:e2e
npm run build
```

`npm test` roda os unitários. `test:cov` exige 70% de branches, funções, linhas e statements em `src/modules/auth`, `empresas`, `usuarios`, `papeis` e `src/common/tenant`.

O e2e lê `apps/api/.env.test` (banco `pedeai_test` em `127.0.0.1:5432`, usuário e senha `pedeai`). O `globalSetup` cria esse banco se faltar e executa `npx prisma migrate reset --force`. Cada arquivo trunca as tabelas antes de rodar. Esse reset apaga os dados de `pedeai_test`. Não aponta para o banco `pedeai` do Compose.

Conferência neste ambiente: `npm test` passou (11 suítes, 62 testes) e `npm run build` passou. O e2e parou no `globalSetup`: o Prisma recusou o `migrate reset` porque o comando partiu de um agente, antes de apagar qualquer dado. A suíte em si não chegou a rodar aqui.

## Visão geral

A API usa prefixo `/api/v1`. O login devolve JWT de acesso (15 minutos) e um refresh opaco (7 dias, só o hash no banco). O access carrega `sub`, `empresaId`, `papel`, `jti` e `sid`. Consultas de empresa e de usuário filtram pela empresa do token.

Papéis: `ADMIN`, `GERENTE`, `CAIXA`, `GARCOM`, `COZINHA`. Admin gerencia usuários. Gerente lista e consulta.

Há tabelas de categoria, produto, pedido e caixa. O seed grava cardápio. Essas áreas não têm rota HTTP nesta sprint.

## Stack

NestJS 11, Fastify, Prisma 6.19, PostgreSQL 16, `@nestjs/swagger` 11, JWT, bcrypt. Pacote npm: `@pedeai/api`.

## Estrutura de pastas

No commit `af64bab` do PR #3, mais os arquivos deste PR de documentação:

```
.
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── README.md
├── docker-compose.yml          # PR #3
├── pnpm-workspace.yaml         # apps/*
├── apps/api/                   # Nest, Prisma, seed, Dockerfile
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    └── STATUS.md
```

`docker-compose.yml` e `apps/api` entram pelo PR #3. Este PR não copia esse código.

## Pré-requisitos

Docker com Compose, para o caminho `docker compose up --build`. Node.js 22 para rodar a API ou os testes na máquina (a imagem do Dockerfile é `node:22-alpine`).

## Instalação

```bash
git clone https://github.com/eds-barros/PedeAI.git
cd PedeAI
```

O `npm ci` fica dentro de `apps/api`, no passo sem Docker. O container instala as dependências sozinho.

## Configuração do ambiente

Lista comentada, uma variável por linha: [`.env.example`](.env.example) na raiz.

Para subir sem o container da API, o arquivo que o processo lê é `apps/api/.env`, copiado de `apps/api/.env.example`. Esse arquivo do pacote prevalece. A raiz repete as chaves e acrescenta `SEED_ON_START`, que só o CMD do Dockerfile lê. O Compose não usa nenhum dos dois arquivos: ele injeta as variáveis do serviço `api`.

Obrigatórias para o Nest: `DATABASE_URL`, `JWT_ACCESS_SECRET` (16 caracteres ou mais) e `CORS_ORIGIN`.

## Banco

A migration versionada é `apps/api/prisma/migrations/20261124210000_init`. No container ela roda sozinha. Na máquina: `npx prisma migrate deploy` dentro de `apps/api`.

## Como executar

| Modo | Comando |
| --- | --- |
| Compose (API + Postgres) | `docker compose up --build` na raiz |
| Desenvolvimento na máquina | `cd apps/api && npm run start:dev` |
| Produção no pacote | `npm run start:prod` depois do `npm run build`. O seed não roda com `NODE_ENV=production` |

## Documentação da API

[docs/API.md](docs/API.md). Swagger em `/api/docs`.

## Arquitetura e status

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/STATUS.md](docs/STATUS.md).

## Contribuição

[CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Não há arquivo `LICENSE`.
