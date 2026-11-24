# Contrato de API esperado pelo frontend

Base confirmada com o backend da Sprint 1. O cliente tipado está em `apps/web/src/lib/api` e o mock MSW em `apps/web/src/mocks`.

O backend vive em `/backend` (pasta do outro time; este repositório de frontend não cria arquivos lá). O app web fica em `apps/web`.

## Base, versão e CORS

- Prefixo global: `/api/v1`.
- `NEXT_PUBLIC_API_URL` aponta para a base **já com** `/api/v1`, sem barra no final. Exemplo: `http://localhost:3333/api/v1`.
- Swagger do backend: `/api/docs` na origem do servidor (não fica sob `/api/v1`).
- O backend libera o browser pela variável `CORS_ORIGIN` (a origem do web, por exemplo `http://localhost:3000`).
- Nesta sprint a API **não** usa cookie de autenticação. O header `Authorization: Bearer <accessToken>` vai nas rotas autenticadas. `Access-Control-Allow-Credentials` não é necessário. Liberar os headers `Authorization` e `Content-Type`, e os métodos `GET`, `POST`, `PATCH` e `OPTIONS`.

## Erros

```json
{
  "statusCode": 400,
  "message": "Revise os campos destacados.",
  "errors": [{ "field": "email", "message": "Este e-mail já está em uso." }]
}
```

- `message` em português do Brasil.
- `errors` é opcional. `field` usa o mesmo nome do corpo (`email`, `password`, `currentPassword`, `newPassword`, `name`, `role`, `companyId`, `token`, `active`).
- O frontend aplica `errors` nos campos do formulário (`react-hook-form`). Se não houver `errors`, mostra `message` num alerta.

## Papéis

`ADMIN`, `GERENTE`, `CAIXA`, `GARCOM`, `COZINHA`. O papel é o da empresa ativa e viaja no access token depois do login ou de `switch-company`.

## Onde ficam os tokens

Decisão da Sprint 1, já que o refresh vai no corpo e não em cookie:

| Dado | Onde | Por quê |
| --- | --- | --- |
| Access token | Só em memória (variável de módulo) | Some no reload e não fica em `localStorage`. |
| Refresh token | `sessionStorage` (`pedeai.refreshToken`) | Precisa sobreviver ao reload da aba. Morre quando a aba fecha e não é enviado sozinho em cada request. |
| Hint de rota | Cookie `pedeai_session` (`userId`, `companyId`, `role`) | O `proxy.ts` do Next não lê `sessionStorage`. O cookie **não** é credencial. `SameSite=Lax`, `Secure` em HTTPS, sem `HttpOnly` porque o browser o grava. |
| Escolha pendente | Cookie `pedeai_pick=1` | Depois do login com várias empresas, força a tela de escolha até a pessoa confirmar. |

Renovação concorrente: `refreshSession()` guarda uma única promise em voo. Quem receber 401 espera essa promise e repete a chamada uma vez. Cada refresh bem-sucedido **substitui** o refresh token (rotação). Refresh inválido (401/403) apaga access, refresh e os cookies de hint.

Logout envia `{ refreshToken }` e limpa o estado local mesmo se a rede falhar.

Evolução combinada para quando o backend puder: refresh em cookie `HttpOnly` + `Secure` + `SameSite`, e o frontend deixa de usar `sessionStorage`.

## Rotas confirmadas

### `POST /api/v1/auth/login`

```json
{ "email": "ana.silva@pedeai.dev", "password": "senha1234" }
```

`200`

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "usr_ana", "name": "Ana Silva", "email": "ana.silva@pedeai.dev" },
  "companies": [
    { "id": "cmp_praca", "name": "Padaria da Praça", "role": "ADMIN" },
    { "id": "cmp_central", "name": "Lanchonete Central", "role": "GERENTE" }
  ],
  "activeCompanyId": "cmp_praca"
}
```

`401` com `message` genérica (`E-mail ou senha inválidos.`) quando a credencial não confere. `403` quando a conta não tem empresa ativa.

O frontend, se `companies.length > 1`, ignora o `activeCompanyId` para a navegação e abre `/selecionar-empresa`. Com uma empresa, segue para o painel com o token já escopado.

### `POST /api/v1/auth/refresh`

```json
{ "refreshToken": "..." }
```

`200` `{ "accessToken", "refreshToken" }`. O refresh anterior deixa de valer. Sem cookie nesta sprint.

### `POST /api/v1/auth/logout`

```json
{ "refreshToken": "..." }
```

`204`. O mock também responde `204` se o token já foi usado.

### `POST /api/v1/auth/forgot-password`

```json
{ "email": "ana.silva@pedeai.dev" }
```

Sempre `204`. A tela mostra a frase neutra: “Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.”

### `PATCH /api/v1/auth/change-password`

Autenticado.

```json
{ "currentPassword": "senha1234", "newPassword": "outra-senha" }
```

`204`. Senha atual errada: `400` com `errors[{ field: "currentPassword" }]`.

### `POST /api/v1/auth/switch-company`

Autenticado.

```json
{ "companyId": "cmp_central" }
```

`200`

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "activeCompanyId": "cmp_central",
  "role": "GERENTE"
}
```

### `GET /api/v1/me`

Autenticado.

```json
{
  "user": { "id": "usr_ana", "name": "Ana Silva", "email": "ana.silva@pedeai.dev" },
  "companies": [{ "id": "cmp_praca", "name": "Padaria da Praça", "role": "ADMIN" }],
  "activeCompanyId": "cmp_praca",
  "role": "ADMIN"
}
```

`companies` lista só vínculos ativos. Se o vínculo do token foi desativado, `activeCompanyId` e `role` vêm `null`.

### `GET /api/v1/users`

Autenticado. Escopo: empresa do access token. Papéis `ADMIN` e `GERENTE`.

Query: `page` (default 1), `pageSize` (default 20, máximo 100), `search`, `role`, `active` (`true` ou `false`). Vazio significa “sem filtro”.

`200`

```json
{
  "data": [
    {
      "id": "usr_bruno",
      "name": "Bruno Costa",
      "email": "bruno.costa@pedeai.dev",
      "role": "CAIXA",
      "active": true
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 23, "totalPages": 2 }
}
```

`search` é substring, sem diferenciar maiúsculas, em nome ou e-mail. A ordenação do mock é por nome em `pt-BR`.

## Rotas que a tela usa e o backend ainda não listou

O mock implementa estas rotas para a Sprint 1 funcionar. Se o backend nomear diferente, o ajuste fica concentrado em `apps/web/src/lib/api` e `apps/web/src/mocks/handlers.ts`.

### `POST /api/v1/auth/reset-password`

```json
{ "token": "demo-reset", "newPassword": "novasenha1" }
```

`204`. Token inválido: `400` com `message` “Link inválido ou expirado.”

No modo mock, o token fixo `demo-reset` redefine a senha de `ana.silva@pedeai.dev`. O forgot-password não devolve o token.

### `POST /api/v1/users`

`201` com o usuário da empresa (`id`, `name`, `email`, `role`, `active`).

```json
{ "name": "Lia Prado", "email": "lia.prado@pedeai.dev", "password": "senha1234", "role": "CAIXA" }
```

E-mail já usado (em qualquer empresa, nesta sprint): `409` e `errors[{ field: "email" }]`.

### `GET /api/v1/users/:id`

`200` com o mesmo formato de item da lista, no escopo da empresa ativa. `404` se a pessoa não tem vínculo nessa empresa.

### `PATCH /api/v1/users/:id`

```json
{ "name": "Lia Prado", "email": "lia.prado@pedeai.dev", "role": "GARCOM" }
```

`200` com o usuário atualizado.

### `PATCH /api/v1/users/:id/status`

```json
{ "active": false }
```

`200` com o usuário atualizado.

Regra de produto do frontend (o mock também aplica; o backend precisa confirmar):

- `GERENTE` não cria, edita nem muda o status de um `ADMIN`, e não atribui o papel `ADMIN`.
- Ninguém desativa a própria conta (`400`, “Você não pode desativar a própria conta.”).

## Modo mock

`NEXT_PUBLIC_API_MOCK=true` sobe o service worker do MSW antes de qualquer chamada. Contas e senha estão no README de `apps/web`.
