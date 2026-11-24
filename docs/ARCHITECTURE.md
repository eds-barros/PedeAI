# Arquitetura

Estado em 24 de novembro de 2026.

O repositório não descreve um processo em execução. Não há módulos, camadas, fila, banco nem cliente. O que está versionado é documentação:

```
README.md            entrada: como subir, limites atuais, links
.env.example         variáveis que o código lê (lista vazia)
CONTRIBUTING.md      branches, Conventional Commits, PR
docs/STATUS.md       o que existe e o que falta
docs/API.md          Swagger e endpoints procurados
docs/ARCHITECTURE.md este arquivo
```

Não há fluxo de pedido HTTP, porque não há servidor. Não há modelo de dados, porque não há schema. Não há fronteira entre empresas no código, porque não há consulta persistida.

Quando a API da Sprint 1 for versionada, este arquivo deve passar a descrever só o que estiver no código: pasta da aplicação, módulo de autenticação, onde o `empresaId` é obtido e como as queries filtram por ele, e o processo que o Compose sobe.
