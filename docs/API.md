# API e Swagger

Estado em 24 de novembro de 2026.

## Rota `/docs`

Não está publicada. Não há processo HTTP no repositório, nem dependência `@nestjs/swagger`, nem registro de Swagger para Fastify. Nada escuta uma porta para servir `/docs`.

Decorators `ApiTags`, `ApiOperation`, `ApiResponse`, `ApiBearerAuth`, `ApiBody` e `ApiProperty` não aparecem, porque não há controllers nem DTOs.

## Endpoints de auth, empresas e usuários

Busca no código por controllers, rotas e DTOs: nenhum arquivo.

| Grupo da Sprint 1 | No repositório | Swagger com exemplos |
| --- | --- | --- |
| Auth (login e fluxos associados) | Ausente | Falta a rota, o DTO com `ApiProperty` `example`, `ApiBody` e `ApiResponse` com exemplo |
| Empresas | Ausente | Falta a rota, os DTOs com exemplo e `ApiBearerAuth` nas rotas protegidas |
| Usuários | Ausente | Falta a rota, os DTOs com exemplo e `ApiBearerAuth` nas rotas protegidas |

Não há outro endpoint documentável.

## `docs/openapi.json` ou `docs/openapi.yaml`

O arquivo não foi gerado. Produzi-lo sem banco só é viável quando existe um gerador que inspeciona a aplicação (por exemplo o documento que o Swagger do Nest monta em memória e um script grava em `docs/`). Esse gerador não está no repositório. Criar um YAML com paths de login, empresas e usuários seria descrever rotas que o código não tem.

Quando o gerador existir, o comando exato entra nesta seção e o artefato fica em `docs/openapi.yaml` ou `docs/openapi.json`, no mesmo PR que publica `/docs`.
