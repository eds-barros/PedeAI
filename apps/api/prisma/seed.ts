import { Papel, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export function assertPodeRodarSeed(nodeEnv: string | undefined = process.env.NODE_ENV): void {
  if (nodeEnv === 'production') {
    throw new Error('Seed abortado: NODE_ENV=production.');
  }
}

const PIZZARIA = '11111111-1111-4111-8111-111111111111';
const LANCHONETE = '22222222-2222-4222-8222-222222222222';

const USUARIOS: {
  id: string;
  email: string;
  nome: string;
  senha: string;
  empresaId: string;
  papel: Papel;
}[] = [
  pessoa('11111111-1111-4111-8111-000000000001', 'admin.pizzaria@pedeai.local', 'Admin Pizzaria', 'PizzariaAdmin1', PIZZARIA, Papel.ADMIN),
  pessoa('11111111-1111-4111-8111-000000000002', 'gerente.pizzaria@pedeai.local', 'Gerente Pizzaria', 'PizzariaGerente1', PIZZARIA, Papel.GERENTE),
  pessoa('11111111-1111-4111-8111-000000000003', 'caixa.pizzaria@pedeai.local', 'Caixa Pizzaria', 'PizzariaCaixa1', PIZZARIA, Papel.CAIXA),
  pessoa('11111111-1111-4111-8111-000000000004', 'garcom.pizzaria@pedeai.local', 'Garçom Pizzaria', 'PizzariaGarcom1', PIZZARIA, Papel.GARCOM),
  pessoa('11111111-1111-4111-8111-000000000005', 'cozinha.pizzaria@pedeai.local', 'Cozinha Pizzaria', 'PizzariaCozinha1', PIZZARIA, Papel.COZINHA),
  pessoa('22222222-2222-4222-8222-000000000001', 'admin.lanchonete@pedeai.local', 'Admin Lanchonete', 'LanchoneteAdmin1', LANCHONETE, Papel.ADMIN),
  pessoa('22222222-2222-4222-8222-000000000002', 'gerente.lanchonete@pedeai.local', 'Gerente Lanchonete', 'LanchoneteGerente1', LANCHONETE, Papel.GERENTE),
  pessoa('22222222-2222-4222-8222-000000000003', 'caixa.lanchonete@pedeai.local', 'Caixa Lanchonete', 'LanchoneteCaixa1', LANCHONETE, Papel.CAIXA),
  pessoa('22222222-2222-4222-8222-000000000004', 'garcom.lanchonete@pedeai.local', 'Garçom Lanchonete', 'LanchoneteGarcom1', LANCHONETE, Papel.GARCOM),
  pessoa('22222222-2222-4222-8222-000000000005', 'cozinha.lanchonete@pedeai.local', 'Cozinha Lanchonete', 'LanchoneteCozinha1', LANCHONETE, Papel.COZINHA),
];

const MULTI_ID = '33333333-3333-4333-8333-333333333333';

function pessoa(
  id: string,
  email: string,
  nome: string,
  senha: string,
  empresaId: string,
  papel: Papel,
) {
  return { id, email, nome, senha, empresaId, papel };
}

async function main(): Promise<void> {
  assertPodeRodarSeed();

  await prisma.empresa.upsert({
    where: { slug: 'pizzaria-bella-napoli' },
    update: {
      razaoSocial: 'Pizzaria Bella Napoli Ltda',
      nomeFantasia: 'Pizzaria Bella Napoli',
      cnpj: '11222333000181',
      telefone: '1133334444',
      email: 'contato@pizzaria.local',
      endereco: 'Rua das Pizzas, 100, São Paulo',
      ativo: true,
    },
    create: {
      id: PIZZARIA,
      slug: 'pizzaria-bella-napoli',
      razaoSocial: 'Pizzaria Bella Napoli Ltda',
      nomeFantasia: 'Pizzaria Bella Napoli',
      cnpj: '11222333000181',
      telefone: '1133334444',
      email: 'contato@pizzaria.local',
      endereco: 'Rua das Pizzas, 100, São Paulo',
    },
  });

  await prisma.empresa.upsert({
    where: { slug: 'lanchonete-do-ze' },
    update: {
      razaoSocial: 'Lanchonete do Zé Ltda',
      nomeFantasia: 'Lanchonete do Zé',
      cnpj: '22333444000192',
      telefone: '1144445555',
      email: 'contato@lanchonete.local',
      endereco: 'Avenida dos Lanches, 50, São Paulo',
      ativo: true,
    },
    create: {
      id: LANCHONETE,
      slug: 'lanchonete-do-ze',
      razaoSocial: 'Lanchonete do Zé Ltda',
      nomeFantasia: 'Lanchonete do Zé',
      cnpj: '22333444000192',
      telefone: '1144445555',
      email: 'contato@lanchonete.local',
      endereco: 'Avenida dos Lanches, 50, São Paulo',
    },
  });

  for (const item of USUARIOS) {
    const senhaHash = await bcrypt.hash(item.senha, 12);
    const usuario = await prisma.usuario.upsert({
      where: { email: item.email },
      update: { nome: item.nome, senhaHash, ativo: true, ultimaEmpresaId: item.empresaId },
      create: {
        id: item.id,
        nome: item.nome,
        email: item.email,
        senhaHash,
        ativo: true,
        ultimaEmpresaId: item.empresaId,
      },
    });
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: item.empresaId } },
      update: { papel: item.papel, ativo: true },
      create: { usuarioId: usuario.id, empresaId: item.empresaId, papel: item.papel, ativo: true },
    });
  }

  const senhaMulti = await bcrypt.hash('MultiEmpresa1', 12);
  const multi = await prisma.usuario.upsert({
    where: { email: 'multi@pedeai.local' },
    update: {
      nome: 'Usuário Multiempresa',
      senhaHash: senhaMulti,
      ativo: true,
      ultimaEmpresaId: PIZZARIA,
    },
    create: {
      id: MULTI_ID,
      nome: 'Usuário Multiempresa',
      email: 'multi@pedeai.local',
      senhaHash: senhaMulti,
      ativo: true,
      ultimaEmpresaId: PIZZARIA,
    },
  });
  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: multi.id, empresaId: PIZZARIA } },
    update: { papel: Papel.GARCOM, ativo: true },
    create: { usuarioId: multi.id, empresaId: PIZZARIA, papel: Papel.GARCOM, ativo: true },
  });
  await prisma.usuarioEmpresa.upsert({
    where: { usuarioId_empresaId: { usuarioId: multi.id, empresaId: LANCHONETE } },
    update: { papel: Papel.GERENTE, ativo: true },
    create: { usuarioId: multi.id, empresaId: LANCHONETE, papel: Papel.GERENTE, ativo: true },
  });

  await semearCardapio(PIZZARIA, 'Pizzas', [
    ['Margherita', 'Molho, mussarela e manjericão', '49.90'],
    ['Calabresa', 'Calabresa e cebola', '54.90'],
    ['Quatro Queijos', 'Mussarela, gorgonzola, parmesão e catupiry', '59.90'],
  ]);
  await semearCardapio(PIZZARIA, 'Bebidas', [
    ['Refrigerante lata', '350 ml', '7.00'],
    ['Suco natural', 'Copo 300 ml', '9.00'],
  ]);
  await semearCardapio(LANCHONETE, 'Lanches', [
    ['X-Burguer', 'Pão, carne e queijo', '22.00'],
    ['X-Salada', 'Pão, carne, queijo e salada', '26.00'],
  ]);
  await semearCardapio(LANCHONETE, 'Bebidas', [['Refrigerante lata', '350 ml', '6.50']]);
}

async function semearCardapio(
  empresaId: string,
  categoriaNome: string,
  produtos: [string, string, string][],
): Promise<void> {
  const categoria = await prisma.categoria.upsert({
    where: { empresaId_nome: { empresaId, nome: categoriaNome } },
    update: { ativo: true },
    create: { empresaId, nome: categoriaNome, ativo: true },
  });
  for (const [nome, descricao, preco] of produtos) {
    await prisma.produto.upsert({
      where: { empresaId_nome: { empresaId, nome } },
      update: { descricao, preco, categoriaId: categoria.id, ativo: true },
      create: { empresaId, categoriaId: categoria.id, nome, descricao, preco, ativo: true },
    });
  }
}

if (process.argv[1]?.includes('seed')) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (erro: unknown) => {
      console.error(erro instanceof Error ? erro.message : erro);
      await prisma.$disconnect();
      process.exit(1);
    });
}
