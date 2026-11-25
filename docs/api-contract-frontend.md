# Contrato de API esperado pelo frontend

Fonte: decisões do backend da Sprint 1 (revisões 1.1 e 1.2). Cliente em `apps/web/src/lib/api`. Mock em `apps/web/src/mocks`.

A API fica em `apps/api`. O app web fica em `apps/web`. O `pnpm-workspace.yaml` só lista `apps/*`, então o pacote da API entra sem uma entrada extra.

## Base

- Prefixo `/api/v1`. `NEXT_PUBLIC_API_URL` já inclui esse prefixo, sem barra no final.
- Swagger: `/api/docs` na origem do servidor.
- CORS via `CORS_ORIGIN` (exemplo `http://localhost:3000`). Auth no header `Authorization: Bearer`. Sem cookie de sessão na API.
- Erros: `{statusCode, message, errors?: [{field, message}]}`. `message` em pt-BR. `errors` em validação (400) vai para os campos. Sem `errors`, a UI mostra `message` (é o caso do 403 e do 409).
- Papéis: `ADMIN`, `GERENTE`, `CAIXA`, `GARCOM`, `COZINHA`. O papel é do vínculo com a empresa ativa.
- IDs: UUID v4. O mock de demonstração ainda usa ids legíveis (`usr_ana`, `cmp_praca`) para as contas fixas; usuários criados na tela recebem UUID.
- Access token: 15 min, só em memória. Refresh: 7 dias, opaco, em `sessionStorage`, rotação a cada uso, uma renovação em voo. Reúso do refresh revoga a sessão. 401 de sessão: `Sessão inválida ou expirada.` Cookie `pedeai_session` guarda `userId`, `companyId`, `role` e `permissions` só para o proxy do Next. Não autoriza a API.
- Empresa ativa vem do token (`empresaId` / sessão). Troca só por `POST /auth/switch-company`. O access anterior passa a receber 401.
- Login inválido, usuário sem vínculo ativo ou desativado: 401 `E-mail ou senha inválidos.`
- Outra empresa: 404. Sem permissão: 403. Sem token, expirado, revogado ou vínculo inativo: 401. Último admin: 409. Rate limit: 429 com `Retry-After`.

## Permissões

`GET /me` devolve `permissions: string[]`. O menu e as ações usam essa lista. Se ela não vier, o frontend cai na matriz de `src/lib/permissions.ts`.

| Papel | Permissions |
| --- | --- |
| ADMIN | todas |
| GERENTE | todas, exceto `empresa:editar` e `usuarios:gerenciar` |
| CAIXA | `empresa:ler`, `produtos:ler`, `pedidos:ler`, `pedidos:gerenciar`, `pdv:operar`, `caixa:operar` |
| GARCOM | `empresa:ler`, `produtos:ler`, `pedidos:ler`, `pedidos:gerenciar` |
| COZINHA | `empresa:ler`, `produtos:ler`, `pedidos:ler`, `cozinha:operar` |

Catálogo: `empresa:ler`, `empresa:editar`, `usuarios:ler`, `usuarios:gerenciar`, `papeis:ler`, `produtos:ler`, `produtos:gerenciar`, `pedidos:ler`, `pedidos:gerenciar`, `pdv:operar`, `caixa:operar`, `cozinha:operar`, `relatorios:ler`.

Nesta sprint o menu esconde produtos, pedidos, pdv, caixa, cozinha e relatórios (`UNRELEASED_MODULES_VISIBLE = false`). Usuários aparece para quem tem `usuarios:ler`. Criar, editar e ativar/desativar exigem `usuarios:gerenciar` (só Admin).

## Auth

### `POST /auth/login`

`{email, password}` → 200 `{accessToken, refreshToken, user:{id,name,email}, companies:[{id,name,role}], activeCompanyId}`.

Empresa ativa: `ultimaEmpresaId` se o vínculo estiver ativo; senão o primeiro vínculo ativo em ordem alfabética do nome. Várias empresas: o frontend ainda abre a tela de escolha.

401 `E-mail ou senha inválidos.` 429 depois de 5 falhas em 15 min para o par IP+e-mail (bloqueio de 15 min) ou 20 req/15 min por IP. O mock cobre o par IP+e-mail.

### `POST /auth/refresh`

`{refreshToken}` → 200 `{accessToken, refreshToken}`. 401 se inválido, expirado, revogado ou reusado.

### `POST /auth/logout`

Bearer + `{refreshToken}` → 204.

### `POST /auth/forgot-password`

`{email}` → 204 sempre, inclusive conta inexistente ou sem vínculo ativo. O mock responde 429 depois de 5 pedidos por hora no mesmo IP.

### `POST /auth/reset-password`

`{token, newPassword}` → 204. Token ruim, expirado (1 h, uso único) ou de usuário sem acesso: 400 `Token inválido ou expirado.` Revoga os refresh do usuário. Senha: 8 a 72 caracteres, com letra e número.

No mock, o token fixo `demo-reset` redefine a senha de `admin.pizzaria@pedeai.local`. Na API real o link sai no log do processo (não há endpoint HTTP de teste).

### `PATCH /auth/change-password`

Bearer `{currentPassword, newPassword}` → 204. Senha atual errada: 400 com `errors` em `currentPassword`. Mesma política de senha. Revoga os outros refresh; a sessão atual continua.

### `POST /auth/switch-company`

Bearer `{companyId}` → 200 `{accessToken, refreshToken, activeCompanyId, role}`. Sem vínculo ativo: 404 `Empresa não encontrada.` O frontend em seguida chama `GET /me` para pegar as permissions do novo papel.

## Sessão e empresa

### `GET /me`

`{user, companies, activeCompanyId, role, permissions}`. `companies` só traz vínculos ativos.

### `GET /companies/current`

Todo papel: `{id, nomeFantasia, slug, logoUrl}`. ADMIN e GERENTE também recebem `razaoSocial`, `cnpj`, `telefone`, `email`, `endereco`.

### `PATCH /companies/current`

ADMIN (`empresa:editar`). Corpo: `nomeFantasia`, `razaoSocial`, `telefone`, `email`, `endereco`, `logoUrl`. `cnpj` e `slug` não mudam.

### `GET /roles`

ADMIN e GERENTE (`papeis:ler`).

A resposta é um array, não um objeto `{ data }`:

```json
[{ "role": "ADMIN", "label": "Administrador", "permissions": ["empresa:ler", "usuarios:gerenciar"] }]
```

O formulário de usuário usa essa lista e, se a chamada falhar, os cinco papéis locais.

## Usuários

Resposta de usuário: `{id, name, email, role, active, createdAt, updatedAt}`.

### `GET /users`

`usuarios:ler` (Admin e Gerente). Query `page`, `pageSize` (máx. 100), `search`, `role`, `active`. Sem `active`, lista todos, inclusive desativados.

`{data, meta:{page, pageSize, total, totalPages}}`. Com `total` 0, `totalPages` é 0.

### `POST /users`

`usuarios:gerenciar` (só Admin). `{name, email, password, role}` → 201.

409 `Não foi possível cadastrar este e-mail.` se o e-mail já existe em qualquer empresa, inclusive vínculo desativado. Não cria vínculo com usuário existente e não devolve o id.

### `GET /users/:id`

`usuarios:ler`. 200 mesmo desativado (`active: false`). 404 se não pertence à empresa ativa.

### `PATCH /users/:id`

`usuarios:gerenciar`. `{name?, role?}` → 200. E-mail não entra neste corpo.

403 `Você não pode alterar o próprio papel ou status.` se o papel mudaria. 409 `A empresa precisa ter ao menos um administrador ativo.` ao rebaixar ou desativar o último admin.

### `PATCH /users/:id/status`

`usuarios:gerenciar`. `{active}` → 200. Desativar a si mesmo: 403 com a mesma frase. Desativar o último admin: 409 com a frase do último admin.

## O que o mock não reproduz por completo

- bcrypt custo 12 e o tempo igual do 409 (o mock não hasheia).
- 20 requisições de login por IP, além do par IP+e-mail.
- Envio real de e-mail. O token de reset de demonstração é fixo.
- Claim JWT `sid` assinada. O mock guarda a sessão em memória e recusa o access antigo depois do `switch-company`.
