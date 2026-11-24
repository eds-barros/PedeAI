import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "movimentos_caixa",
      "itens_pedido",
      "pedidos",
      "caixas",
      "produtos",
      "categorias",
      "tokens_redefinicao_senha",
      "refresh_tokens",
      "sessoes",
      "usuarios_empresas",
      "usuarios",
      "empresas"
    CASCADE
  `);
  await prisma.$disconnect();
});
