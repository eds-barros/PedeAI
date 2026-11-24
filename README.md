# PedeAI

Repositório público: [eds-barros/PedeAI](https://github.com/eds-barros/PedeAI).

A descrição cadastrada no GitHub é «Sistema de Restaurantee em Geral» (grafia original do cadastro).

Este arquivo descreve o que está versionado no Git em 24 de novembro de 2026, a partir do commit `7b1775e` em `main`. O conteúdo executável da Sprint 1 (autenticação, multi-empresa, usuários e seed) ainda não faz parte do repositório. A seção seguinte é o caminho para subir o sistema e entrar; cada passo traz o comando e o resultado conferido.

## Como subir, semear, entrar e testar

O caminho pedido para uma pessoa nova é: `docker compose up`, migrations, seed, login com as credenciais do seed e testes.

Conferência feita ao escrever esta página, no mesmo ambiente em que o documento foi preparado:

| Passo | O que existe no repositório | Resultado da conferência |
| --- | --- | --- |
| `docker compose up` | Nenhum `docker-compose.yml`, `docker-compose.yaml` ou `compose.yaml` | Docker Compose 2.40.3 (engine 29.1.4) respondeu `no configuration file provided: not found` (exit 1). |
| Migrations | Nenhum schema Prisma e nenhuma pasta de migrations | Não há comando de migration versionado. |
| Seed | Nenhum arquivo de seed | Não há empresas nem senhas no código. |
| Login | Nenhum servidor HTTP e nenhum endpoint | `curl` para `/docs` e para um login em `127.0.0.1:3000`, `:3333` e `:8080` falhou com `Couldn't connect to server`. |
| Testes | Nenhum `package.json` e nenhuma suíte | `npm test` e `npm run build` falham ao abrir `package.json`. |

Com o que está no Git hoje, o README sozinho não leva ninguém a um login. Os bloqueios são o arquivo Compose, as migrations, o seed com duas empresas e os endpoints.

### 1. Infraestrutura

```bash
docker compose up
```

Saída observada na conferência (Docker Compose 2.40.3, engine 29.1.4):

```text
no configuration file provided: not found
```

O comando termina com exit 1. Não há serviço para subir. O cliente `psql` não está instalado; sem schema nem `DATABASE_URL` no código, não há banco da aplicação para migrar.

### 2. Migrations

Não há `package.json`, portanto não há script `prisma`, `migrate` ou equivalente. Não há diretório `prisma/`.

### 3. Seed e credenciais demo

Não há código de seed. A tabela abaixo é o lugar das credenciais, copiadas do seed quando ele existir. Nenhuma senha foi preenchida por suposição.

| Empresa | Papel | E-mail | Senha | Origem no código |
| --- | --- | --- | --- | --- |
| — | — | — | — | Arquivo de seed ausente |

A Sprint 1 pede um usuário de cada papel em duas empresas. Esse seed não está no repositório, então a lista tem zero linhas de acesso.

### 4. Login

Não há rota HTTP. Quando o endpoint de login existir, este passo deve mostrar um `curl` com a URL real, o corpo do DTO real e uma linha da tabela de credenciais. Exemplo do formato, ainda sem valores inventados:

```bash
# Substituir URL, campos e credencial pelos que estiverem no código.
# curl -sS -X POST "$BASE_URL/<rota-de-login>" \
#   -H 'content-type: application/json' \
#   -d '{"<campo-do-dto>":"<valor-do-seed>"}'
```

Nenhum login real foi feito nesta conferência. As tentativas abaixo só mostram que não há servidor nessas portas (não são rotas do projeto; o repositório não define porta):

```text
curl http://127.0.0.1:3000/docs          → Couldn't connect to server
curl http://127.0.0.1:3000/api/auth/login → Couldn't connect to server
curl http://127.0.0.1:3333/docs           → Couldn't connect to server
curl http://127.0.0.1:8080/docs           → Couldn't connect to server
```

### 5. Testes e build

```bash
npm test
npm run build
```

Os dois comandos terminam com erro `ENOENT` ao abrir `package.json` (Node.js v22.23.4, npm 10.9.9). Não há suíte unitária, de integração, e2e nem relatório de cobertura.

## Visão geral

O histórico do Git tem um commit, `7b1775e` («Initial commit»), que adicionava só o título `# PedeAI`. Não há módulos, controllers, DTOs, testes, schema Prisma, Compose nem leitura de ambiente no código da aplicação, porque essa aplicação não está versionada.

## Stack

Nenhum manifesto de dependências (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`). Nenhuma versão de NestJS, Fastify, Prisma, PostgreSQL ou frontend está declarada no repositório.

## Estrutura de pastas

```
.
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── README.md
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    └── STATUS.md
```

## Pré-requisitos

Para clonar e ler a documentação: Git.

Node.js, Docker e PostgreSQL passam a ser pré-requisito quando existirem `package.json`, arquivo Compose e schema. O repositório não declara versão de runtime, imagem nem URL de banco.

## Instalação

```bash
git clone https://github.com/eds-barros/PedeAI.git
cd PedeAI
```

Não há passo de instalação de dependências.

## Configuração do ambiente

As variáveis que o código lê estão em [`.env.example`](.env.example), uma a uma, com comentário. O inventário atual está vazio: não há fonte lendo `process.env`, `ConfigService` nem equivalente.

```bash
cp .env.example .env
```

O `.env` fica de fora do Git (veja `.gitignore`). Com a lista vazia, a cópia não configura serviço nenhum.

## Banco de dados

Não há migrations nem seed. Não há usuário demo para publicar aqui. O status de cada capacidade está em [`docs/STATUS.md`](docs/STATUS.md).

## Como executar

| Modo | Comando no repositório |
| --- | --- |
| Desenvolvimento | Nenhum script |
| Produção | Nenhum script |
| Docker | `docker compose up` não tem arquivo Compose |

## Testes

| Tipo | Situação |
| --- | --- |
| Unitários | Ausentes |
| Integração | Ausentes |
| e2e | Ausentes |
| Cobertura | Ausente |

`npm test` e `npm run build` foram executados; os dois não encontram `package.json`.

## Documentação da API

Não há especificação OpenAPI gerada a partir de código e a rota `/docs` não está publicada. O que foi procurado (auth, empresas, usuários) e o que falta no Swagger está em [`docs/API.md`](docs/API.md).

## Arquitetura

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Contribuição

[`CONTRIBUTING.md`](CONTRIBUTING.md)

## Licença

Não há arquivo `LICENSE`.
