import { INestApplication } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/app.setup';
import { criarAdaptadorFastify } from '../../src/common/correlation/request-id';

export const PIZZARIA = '11111111-1111-4111-8111-111111111111';
export const LANCHONETE = '22222222-2222-4222-8222-222222222222';
export const UUID_INEXISTENTE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export const SENHAS = {
  adminA: 'PizzariaAdmin1',
  gerenteA: 'PizzariaGerente1',
  caixaA: 'PizzariaCaixa1',
  garcomA: 'PizzariaGarcom1',
  cozinhaA: 'PizzariaCozinha1',
  adminB: 'LanchoneteAdmin1',
  gerenteB: 'LanchoneteGerente1',
  caixaB: 'LanchoneteCaixa1',
  multi: 'MultiEmpresa1',
  inativo: 'InativoUser1',
} as const;

export const EMAILS = {
  adminA: 'admin.pizzaria@pedeai.local',
  gerenteA: 'gerente.pizzaria@pedeai.local',
  caixaA: 'caixa.pizzaria@pedeai.local',
  garcomA: 'garcom.pizzaria@pedeai.local',
  cozinhaA: 'cozinha.pizzaria@pedeai.local',
  adminB: 'admin.lanchonete@pedeai.local',
  gerenteB: 'gerente.lanchonete@pedeai.local',
  caixaB: 'caixa.lanchonete@pedeai.local',
  multi: 'multi@pedeai.local',
  inativo: 'inativo.pizzaria@pedeai.local',
} as const;

export type LoginBody = {
  accessToken: string;
  refreshToken: string;
  activeCompanyId: string;
  user: { id: string; name: string; email: string };
  companies: { id: string; name: string; role: string }[];
};

export type Claims = {
  sub: string;
  empresaId: string;
  papel: string;
  jti: string;
  sid: string;
};

export async function montarApp(): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication<NestFastifyApplication>(criarAdaptadorFastify(), {
    rawBody: true,
  });
  configurarApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export async function popularCenario(prisma: PrismaClient): Promise<void> {
  await prisma.empresa.createMany({
    data: [
      {
        id: PIZZARIA,
        razaoSocial: 'Pizzaria Bella Napoli Ltda',
        nomeFantasia: 'Pizzaria Bella Napoli',
        slug: 'pizzaria-bella-napoli',
        cnpj: '11222333000181',
        telefone: '1133334444',
        email: 'contato@pizzaria.local',
        endereco: 'Rua das Pizzas, 100',
      },
      {
        id: LANCHONETE,
        razaoSocial: 'Lanchonete do Zé Ltda',
        nomeFantasia: 'Lanchonete do Zé',
        slug: 'lanchonete-do-ze',
        cnpj: '22333444000192',
        telefone: '1144445555',
        email: 'contato@lanchonete.local',
        endereco: 'Avenida dos Lanches, 50',
      },
    ],
  });

  await criarUsuario(prisma, EMAILS.adminA, SENHAS.adminA, 'Admin Pizzaria', PIZZARIA, Papel.ADMIN);
  await criarUsuario(prisma, EMAILS.gerenteA, SENHAS.gerenteA, 'Gerente Pizzaria', PIZZARIA, Papel.GERENTE);
  await criarUsuario(prisma, EMAILS.caixaA, SENHAS.caixaA, 'Caixa Pizzaria', PIZZARIA, Papel.CAIXA);
  await criarUsuario(prisma, EMAILS.garcomA, SENHAS.garcomA, 'Garçom Pizzaria', PIZZARIA, Papel.GARCOM);
  await criarUsuario(prisma, EMAILS.cozinhaA, SENHAS.cozinhaA, 'Cozinha Pizzaria', PIZZARIA, Papel.COZINHA);
  await criarUsuario(prisma, EMAILS.adminB, SENHAS.adminB, 'Admin Lanchonete', LANCHONETE, Papel.ADMIN);
  await criarUsuario(prisma, EMAILS.gerenteB, SENHAS.gerenteB, 'Gerente Lanchonete', LANCHONETE, Papel.GERENTE);
  await criarUsuario(prisma, EMAILS.caixaB, SENHAS.caixaB, 'Caixa Lanchonete', LANCHONETE, Papel.CAIXA);
  const multiId = await criarUsuario(
    prisma,
    EMAILS.multi,
    SENHAS.multi,
    'Multi',
    PIZZARIA,
    Papel.GARCOM,
    PIZZARIA,
  );
  await prisma.usuarioEmpresa.create({
    data: { usuarioId: multiId, empresaId: LANCHONETE, papel: Papel.GERENTE, ativo: true },
  });
  await criarUsuario(prisma, EMAILS.inativo, SENHAS.inativo, 'Inativo Pizzaria', PIZZARIA, Papel.CAIXA);
  const inativo = await prisma.usuario.findUniqueOrThrow({ where: { email: EMAILS.inativo } });
  await prisma.usuarioEmpresa.update({
    where: { usuarioId_empresaId: { usuarioId: inativo.id, empresaId: PIZZARIA } },
    data: { ativo: false },
  });
}

export async function criarUsuario(
  prisma: PrismaClient,
  email: string,
  senha: string,
  nome: string,
  empresaId: string,
  papel: Papel,
  ultimaEmpresaId: string | null = empresaId,
): Promise<string> {
  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      ativo: true,
      ultimaEmpresaId,
      vinculos: { create: { empresaId, papel, ativo: true } },
    },
  });
  return usuario.id;
}

export async function login(
  app: INestApplication,
  email: string,
  password: string,
  ip = '203.0.113.10',
): Promise<LoginBody> {
  const resposta = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('X-Forwarded-For', ip)
    .send({ email, password });
  expect(resposta.status).toBe(200);
  return resposta.body as LoginBody;
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export function decodificarClaims(accessToken: string): Claims {
  const parte = accessToken.split('.')[1];
  const json = Buffer.from(parte, 'base64url').toString('utf8');
  return JSON.parse(json) as Claims;
}

export function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

export async function idPorEmail(prisma: PrismaClient, email: string): Promise<string> {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
  return usuario.id;
}

export const PERMISSOES = {
  ADMIN: [
    'empresa:ler',
    'empresa:editar',
    'usuarios:ler',
    'usuarios:gerenciar',
    'papeis:ler',
    'produtos:ler',
    'produtos:gerenciar',
    'pedidos:ler',
    'pedidos:gerenciar',
    'pdv:operar',
    'caixa:operar',
    'cozinha:operar',
    'relatorios:ler',
  ],
  GERENTE: [
    'empresa:ler',
    'usuarios:ler',
    'papeis:ler',
    'produtos:ler',
    'produtos:gerenciar',
    'pedidos:ler',
    'pedidos:gerenciar',
    'pdv:operar',
    'caixa:operar',
    'cozinha:operar',
    'relatorios:ler',
  ],
  CAIXA: ['empresa:ler', 'produtos:ler', 'pedidos:ler', 'pedidos:gerenciar', 'pdv:operar', 'caixa:operar'],
  GARCOM: ['empresa:ler', 'produtos:ler', 'pedidos:ler', 'pedidos:gerenciar'],
  COZINHA: ['empresa:ler', 'produtos:ler', 'pedidos:ler', 'cozinha:operar'],
} as const;

export function esperarConjunto(atual: unknown, esperado: readonly string[]): void {
  expect(Array.isArray(atual)).toBe(true);
  expect([...(atual as string[])].sort()).toEqual([...esperado].sort());
}
