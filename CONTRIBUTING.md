# Contribuindo com o PedeAI

Documentação e mensagens voltadas a quem usa o produto ficam em português do Brasil.

O branch de integração que existe hoje é `main`. Não há `develop`. Abra o pull request contra `main`. Se o repositório ganhar um `develop` de integração, ramifique a partir dele e atualize este arquivo no mesmo PR.

## Branches

Crie o branch a partir do branch de integração atualizado (`main`):

| Prefixo | Uso |
| --- | --- |
| `feature/` | Capacidade nova (auth, empresas, usuários, seed) |
| `fix/` | Correção de comportamento |
| `chore/` | Manutenção que não muda o comportamento visível (ferramentas, dependências) |
| `docs/` | Só documentação |

Exemplos: `feature/auth-login`, `fix/isolamento-empresa`, `chore/prisma-migrate`, `docs/readme-seed`.

```bash
git checkout main
git pull origin main
git checkout -b docs/readme-seed
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<tipo>(<escopo opcional>): <resumo no imperativo>

[corpo opcional]
```

Tipos usados neste repositório:

| Tipo | Uso |
| --- | --- |
| `feat` | Capacidade nova |
| `fix` | Correção |
| `docs` | Documentação |
| `test` | Testes |
| `refactor` | Mudança interna sem alterar o comportamento externo |
| `chore` | Manutenção |
| `build` | Build ou dependências |
| `ci` | Integração contínua |

Exemplos:

```text
feat(auth): aceita login com e-mail e senha
fix(usuarios): restringe a listagem à empresa do token
docs: copia as senhas do seed para o README
test(auth): cobre refresh e revogação no logout
```

Um commit, um propósito. Não inclua segredos, `.env` nem dumps de banco.

## Fluxo de pull request

1. Atualize `main` e crie o branch com o prefixo da tabela.
2. Implemente a mudança. Se o código ler variável nova, acrescente a linha comentada em `.env.example`.
3. Rode os testes que já existirem no repositório. Hoje não há `package.json` nem suíte; quando houver, o PR precisa deixá-los passando, e o build também.
4. Abra o PR para `main` com:
   - o que mudou;
   - como testar (comandos);
   - credenciais só se forem as do seed versionado, com o caminho do arquivo;
   - endpoints novos ou alterados e se o Swagger em `/docs` foi atualizado.
5. Espere revisão. Ajuste no mesmo branch.

## Checklist do PR

- [ ] Branch sai de `main` (ou de `develop`, quando esse for o branch de integração) e usa `feature/`, `fix/`, `chore/` ou `docs/`.
- [ ] Commits seguem Conventional Commits.
- [ ] Build e testes existentes passam. Se ainda não existirem, o PR diz isso com o comando que foi tentado.
- [ ] `.env.example` lista cada variável que o código lê, com comentário e valor de exemplo seguro.
- [ ] README: passo de `docker compose up`, migrations, seed e login. Credenciais copiadas do arquivo de seed (cada papel, nas empresas que o seed cria).
- [ ] Endpoints de auth, empresas e usuários documentados no Swagger (`/docs`): `ApiTags`, `ApiOperation`, `ApiResponse`, `ApiBearerAuth` nas rotas protegidas, `ApiProperty` com `example`, exemplos de corpo e de resposta.
- [ ] `docs/STATUS.md` atualizado se alguma capacidade passou a existir ou a depender de serviço externo.
- [ ] Nenhum segredo real no diff.
- [ ] Textos de documentação em português do Brasil.
