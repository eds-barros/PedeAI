# PedeAI — backend

API NestJS (Fastify) da Sprint 1: autenticação, multiempresa, usuários e papéis. O contrato fechado está em [docs/decisoes-sprint1.md](docs/decisoes-sprint1.md). A documentação geral do repositório (README da raiz, `.env.example` da raiz e `CONTRIBUTING`) fica no [PR #1](https://github.com/eds-barros/PedeAI/pull/1); este pacote não duplica esses arquivos.

Não havia `prisma/schema.prisma` na raiz. O schema foi criado em `backend/prisma/schema.prisma`, junto do pacote, sem caminho absoluto, para poder ir para `apps/api` depois.

## Stack

NestJS 11, Fastify, Prisma 6.19, PostgreSQL, JWT de acesso (15 min) e refresh opaco (7 dias, hash SHA-256). Nest 12 é só ESM e o Jest deste repositório carrega CommonJS.

## Subir

Postgres e API (o serviço `web` está comentado: `apps/web` ainda não está na main):

```bash
docker compose up --build
```

O frontend em `apps/web` só entra com o profile `web` (não quebra o `up` enquanto essa pasta não está na main):

```bash
docker compose --profile web up --build
```

A API sobe em `http://localhost:3000`. Swagger: `http://localhost:3000/api/docs`. Saúde: `GET /api/v1/health`. Com o profile, o web fica em `http://localhost:3001` e chama a API em `http://localhost:3000/api/v1`.

O container da API roda `prisma migrate deploy`. O seed só roda se `SEED_ON_START=true` (já está assim no Compose) e recusa `NODE_ENV=production`.

Sem Docker, só o banco e a API na máquina:

```bash
cd backend
cp .env.example .env
# aponte DATABASE_URL para o Postgres e preencha JWT_ACCESS_SECRET (16+ caracteres)
npm ci
npx prisma migrate deploy
npm run seed
npm run start:dev
```

## Testes

```bash
cd backend
npm run lint
npm test
npm run test:cov
npm run test:e2e
npm run test:qa
npm run build
```

O e2e e a suíte de QA usam `DATABASE_URL` de `.env.test` (Postgres local `pedeai` / `pedeai` / banco `pedeai_test`). O `globalSetup` executa `prisma migrate reset --force` uma vez; cada arquivo trunca as tabelas antes de rodar. A CI sobe o Postgres como service.

`npm run test:qa` roda a suíte de integração da Sprint 1 em `test/qa` (auth, isolamento, permissões e seed) com o mesmo Postgres. O processo de teste fixa `LOGIN_MAX_FALHAS_EMAIL=5`, `LOGIN_MAX_FALHAS_IP=20` e `LOGIN_JANELA_MIN=15`, para o 429 não depender dos tetos folgados de desenvolvimento.

## Credenciais do seed

Senhas com letra e número. A empresa ativa inicial do usuário multiempresa é a pizzaria (`ultimaEmpresaId`).

| E-mail | Senha | Empresa | Papel |
| --- | --- | --- | --- |
| admin.pizzaria@pedeai.local | PizzariaAdmin1 | Pizzaria Bella Napoli | ADMIN |
| gerente.pizzaria@pedeai.local | PizzariaGerente1 | Pizzaria Bella Napoli | GERENTE |
| caixa.pizzaria@pedeai.local | PizzariaCaixa1 | Pizzaria Bella Napoli | CAIXA |
| garcom.pizzaria@pedeai.local | PizzariaGarcom1 | Pizzaria Bella Napoli | GARCOM |
| cozinha.pizzaria@pedeai.local | PizzariaCozinha1 | Pizzaria Bella Napoli | COZINHA |
| admin.lanchonete@pedeai.local | LanchoneteAdmin1 | Lanchonete do Zé | ADMIN |
| gerente.lanchonete@pedeai.local | LanchoneteGerente1 | Lanchonete do Zé | GERENTE |
| caixa.lanchonete@pedeai.local | LanchoneteCaixa1 | Lanchonete do Zé | CAIXA |
| garcom.lanchonete@pedeai.local | LanchoneteGarcom1 | Lanchonete do Zé | GARCOM |
| cozinha.lanchonete@pedeai.local | LanchoneteCozinha1 | Lanchonete do Zé | COZINHA |
| multi@pedeai.local | MultiEmpresa1 | Pizzaria (garçom) e Lanchonete (gerente) | os dois |

O seed também grava pizzas, lanches e bebidas. Ele é idempotente (upsert por slug/CNPJ, e-mail e vínculo).

Quem tenta mudar o próprio papel ou desativar o próprio vínculo recebe 403, inclusive o último Admin. Essa checagem vem antes da regra do último Admin. O 409 fica como defesa: só quando outro ator fosse desativar ou rebaixar o último Admin ativo.

O rate limit do login conta só falhas (`LOGIN_MAX_FALHAS_EMAIL`, `LOGIN_MAX_FALHAS_IP`, `LOGIN_JANELA_MIN`). O contador fica em memória nesta instância; Redis fica para depois. Em desenvolvimento os tetos do `.env.example` e do Compose são mais folgados.

## Ajustes de modelo

Como o schema citado não existia, estas tabelas foram criadas aqui: `Empresa`, `Usuario` (com `senhaHash`, `ativo` global e `ultimaEmpresaId`), `UsuarioEmpresa` (papel por empresa), `Sessao` (`empresaAtivaId`, revogação; o `sid` do JWT), `RefreshToken` (hash), `TokenRedefinicaoSenha`, `Categoria`, `Produto`, `Pedido`, `ItemPedido`, `Caixa`, `MovimentoCaixa`. Papéis: `ADMIN`, `GERENTE`, `CAIXA`, `GARCOM`, `COZINHA`.
