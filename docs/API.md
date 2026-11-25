# API e Swagger

Lido no PR #3, commit `af64bab`, e conferido no documento servido em `/api/docs-json`. Prefixo das rotas: `/api/v1`. Swagger UI: `http://localhost:3000/api/docs`. O documento JSON do Nest fica em `http://localhost:3000/api/docs-json` com a API no ar. Não há `docs/openapi.yaml` versionado; o gerador é o Swagger em memória, e a UI não sobe com `NODE_ENV=test`.

Bearer no documento: esquema `access-token` (HTTP bearer, JWT).

## Auth

Rotas em `auth.controller.ts`. Os DTOs em `dto/auth.dto.ts` têm `ApiProperty` com `example`. Não há decorator `ApiBody` em nenhum controller do pacote. O Swagger monta o corpo a partir do DTO.

| Método e rota | Exemplo de resposta | Exemplo de corpo |
| --- | --- | --- |
| `POST /api/v1/auth/login` | `ApiOkResponse` com `example` (tokens, user, companies) e `ApiUnauthorizedResponse` com `example` | `LoginDto`: e-mail `admin.pizzaria@pedeai.local`, senha `PizzariaAdmin1` |
| `POST /api/v1/auth/refresh` | `ApiOkResponse` com access e refresh novos | `RefreshDto`: `refresh-opaco` |
| `POST /api/v1/auth/logout` | `ApiNoContentResponse` sem corpo de exemplo | `RefreshDto` |
| `POST /api/v1/auth/forgot-password` | 204 sem exemplo de erro | `EsqueciSenhaDto` |
| `POST /api/v1/auth/reset-password` | 204 sem exemplo de erro | token e `NovaSenha1` |
| `PATCH /api/v1/auth/change-password` | 204 sem exemplo de erro | senha atual e nova |
| `POST /api/v1/auth/switch-company` | `example` com tokens, `activeCompanyId` e `role` | UUID da lanchonete do seed |
| `GET /api/v1/me` | `example` com user, companies, role e permissions | não tem corpo |

## Empresas

`GET /api/v1/companies/current` tem `ApiOkResponse` com `example` (id, nome fantasia, slug, logo e, para Admin/Gerente, razão social, CNPJ, telefone, e-mail e endereço).

`PATCH /api/v1/companies/current` documenta a operação e o DTO `AtualizarEmpresaDto` com `ApiPropertyOptional` e `example` em cada campo. O `ApiOkResponse` só tem descrição (`Cadastro atualizado.`), sem `example`.

## Usuários

`ApiBearerAuth` na classe. Corpos de `CriarUsuarioDto`, `AtualizarUsuarioDto`, `StatusUsuarioDto` e da query de listagem têm `example`.

| Método e rota | Exemplos no Swagger |
| --- | --- |
| `GET /api/v1/users` | dois exemplos de resposta: lista com um usuário e lista vazia (`totalPages` 0). A query tem `example` no schema: `page` 1, `pageSize` 20, `search` maria, `role` CAIXA, `active` true |
| `POST /api/v1/users` | `ApiCreatedResponse` com o usuário de exemplo |
| `GET /api/v1/users/:id` | `ApiOkResponse` com o mesmo exemplo |
| `PATCH /api/v1/users/:id` | resposta de sucesso, 403 e 409 com `example` |
| `PATCH /api/v1/users/:id/status` | resposta com `active: false`, 403 e 409 com `example` |

## O que falta no Swagger

- Nenhum endpoint usa `ApiBody`. O exemplo do request depende do `example` do `ApiProperty`.
- `PATCH /api/v1/companies/current` não tem exemplo de resposta.
- Logout, esqueci senha, redefinição e troca de senha não têm exemplo de erro (401/400).
- Não há classe de resposta com `ApiProperty` para login, empresa ou usuário. Os exemplos de saída estão no `schema.example` do controller, soltos do tipo TypeScript.
