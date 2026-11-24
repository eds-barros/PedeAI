import { INestApplication } from '@nestjs/common';
import { Papel, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { LimitadorAuth } from '../../src/modules/auth/limitador-auth';
import { MAIL_PORT, MailPort } from '../../src/modules/auth/mail.port';
import { UsuariosService } from '../../src/modules/usuarios/usuarios.service';
import {
  EMAILS,
  LANCHONETE,
  PERMISSOES,
  PIZZARIA,
  SENHAS,
  bearer,
  esperarConjunto,
  idPorEmail,
  login,
  montarApp,
  popularCenario,
} from './helpers';

describe('QA Sprint 1 — PERM e menu (P0)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let tokens: Record<string, string>;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await popularCenario(prisma);
    app = await montarApp();
    tokens = {
      adminA: (await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.70')).accessToken,
      gerenteA: (await login(app, EMAILS.gerenteA, SENHAS.gerenteA, '203.0.113.71')).accessToken,
      caixaA: (await login(app, EMAILS.caixaA, SENHAS.caixaA, '203.0.113.72')).accessToken,
      garcomA: (await login(app, EMAILS.garcomA, SENHAS.garcomA, '203.0.113.73')).accessToken,
      cozinhaA: (await login(app, EMAILS.cozinhaA, SENHAS.cozinhaA, '203.0.113.74')).accessToken,
      adminB: (await login(app, EMAILS.adminB, SENHAS.adminB, '203.0.113.75')).accessToken,
    };
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    app.get(LimitadorAuth).limpar();
    app.get<MailPort>(MAIL_PORT).limpar();
  });

  it('PERM-026 / MENU-001 a 005 — GET /me devolve o catálogo exato de permissions por papel', async () => {
    const casos: [string, readonly string[]][] = [
      [tokens.adminA, PERMISSOES.ADMIN],
      [tokens.gerenteA, PERMISSOES.GERENTE],
      [tokens.caixaA, PERMISSOES.CAIXA],
      [tokens.garcomA, PERMISSOES.GARCOM],
      [tokens.cozinhaA, PERMISSOES.COZINHA],
    ];
    for (const [token, esperado] of casos) {
      const me = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(token));
      expect(me.status).toBe(200);
      expect(me.body.user).not.toHaveProperty('password');
      esperarConjunto(me.body.permissions, esperado);
    }
  });

  it('PERM-001 — Admin lê e escreve usuários e empresa na Pizzaria', async () => {
    const empresa = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set(bearer(tokens.adminA));
    expect(empresa.status).toBe(200);
    expect(empresa.body.razaoSocial).toBeDefined();
    expect(empresa.body.cnpj).toBeDefined();

    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(tokens.adminA));
    expect(lista.status).toBe(200);

    const criado = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(tokens.adminA))
      .send({ name: 'Temp QA', email: 'temp.qa.admin@pedeai.local', password: 'TempQa11', role: 'CAIXA' });
    expect(criado.status).toBe(201);
    const id = criado.body.id ?? criado.body.user?.id;
    expect(id).toBeDefined();
    expect(JSON.stringify(criado.body)).not.toContain('TempQa11');
    expect(JSON.stringify(criado.body)).not.toMatch(/\$2b\$/);

    const hash = await prisma.usuario.findUniqueOrThrow({ where: { email: 'temp.qa.admin@pedeai.local' } });
    expect(hash.senhaHash.startsWith('$2b$12$')).toBe(true);

    const patch = await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}`)
      .set(bearer(tokens.adminA))
      .send({ name: 'Temp QA 2' });
    expect(patch.status).toBe(200);

    const buscaB = await request(app.getHttpServer())
      .get('/api/v1/users?search=temp.qa.admin@pedeai.local')
      .set(bearer(tokens.adminB));
    expect((buscaB.body.data ?? []).map((u: { email: string }) => u.email)).not.toContain(
      'temp.qa.admin@pedeai.local',
    );
  });

  it('PERM-002/007/010/013/027 — Gerente só lê; escrita de usuários e empresa é 403', async () => {
    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(tokens.gerenteA));
    expect(lista.status).toBe(200);
    const idCaixa = await idPorEmail(prisma, EMAILS.caixaA);
    const detalhe = await request(app.getHttpServer()).get(`/api/v1/users/${idCaixa}`).set(bearer(tokens.gerenteA));
    expect(detalhe.status).toBe(200);
    const empresa = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set(bearer(tokens.gerenteA));
    expect(empresa.status).toBe(200);
    expect(empresa.body.razaoSocial).toBeDefined();
    expect(empresa.body.cnpj).toBeDefined();

    const post = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(tokens.gerenteA))
      .send({ name: 'X', email: 'gerente.cria@pedeai.local', password: 'GerenteCria1', role: 'CAIXA' });
    expect(post.status).toBe(403);
    const patch = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idCaixa}`)
      .set(bearer(tokens.gerenteA))
      .send({ name: 'Hack', role: 'ADMIN' });
    expect(patch.status).toBe(403);
    const idAdmin = await idPorEmail(prisma, EMAILS.adminA);
    const status = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idAdmin}/status`)
      .set(bearer(tokens.gerenteA))
      .send({ active: false });
    expect(status.status).toBe(403);
    const empPatch = await request(app.getHttpServer())
      .patch('/api/v1/companies/current')
      .set(bearer(tokens.gerenteA))
      .send({ nomeFantasia: 'Hackeada' });
    expect(empPatch.status).toBe(403);

    const relido = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set(bearer(tokens.adminA));
    expect(relido.body.nomeFantasia).not.toBe('Hackeada');
  });

  it('PERM-003/004/005/013/014/019/030 — Caixa, Garçom e Cozinha: 403 em gestão; empresa só básica', async () => {
    for (const token of [tokens.caixaA, tokens.garcomA, tokens.cozinhaA]) {
      const users = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(token));
      expect(users.status).toBe(403);
      expect(users.body).not.toEqual(expect.objectContaining({ data: [] }));
      const roles = await request(app.getHttpServer()).get('/api/v1/roles').set(bearer(token));
      expect(roles.status).toBe(403);
      const post = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set(bearer(token))
        .send({ name: 'X', email: 'op.cria@pedeai.local', password: 'OperCria1', role: 'CAIXA' });
      expect(post.status).toBe(403);
      const emp = await request(app.getHttpServer()).get('/api/v1/companies/current').set(bearer(token));
      expect(emp.status).toBe(200);
      expect(emp.body).toEqual(
        expect.objectContaining({
          id: PIZZARIA,
          nomeFantasia: expect.any(String),
          slug: expect.any(String),
        }),
      );
      expect(emp.body).not.toHaveProperty('cnpj');
      expect(emp.body).not.toHaveProperty('razaoSocial');
      expect(emp.body).not.toHaveProperty('endereco');
      const empPatch = await request(app.getHttpServer())
        .patch('/api/v1/companies/current')
        .set(bearer(token))
        .send({ telefone: '1100000000' });
      expect(empPatch.status).toBe(403);
    }

    const rolesAdmin = await request(app.getHttpServer()).get('/api/v1/roles').set(bearer(tokens.adminA));
    const rolesGerente = await request(app.getHttpServer()).get('/api/v1/roles').set(bearer(tokens.gerenteA));
    expect(rolesAdmin.status).toBe(200);
    expect(rolesGerente.status).toBe(200);
  });

  it('PERM-006/025 — último Admin: auto-alvo é 403; outro ator recebe 409', async () => {
    const id = await idPorEmail(prisma, EMAILS.adminA);
    const desativar = await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/status`)
      .set(bearer(tokens.adminA))
      .send({ active: false });
    expect(desativar.status).toBe(403);
    expect(desativar.body.message).toBe('Você não pode alterar o próprio papel ou status.');

    const rebaixar = await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}`)
      .set(bearer(tokens.adminA))
      .send({ role: 'GERENTE' });
    expect(rebaixar.status).toBe(403);
    expect(rebaixar.body.message).toBe('Você não pode alterar o próprio papel ou status.');

    // A checagem de auto-alteração vem primeiro na HTTP. O 409 permanece para
    // outro ator, contra o Postgres real (defesa em profundidade do serviço).
    const outroAtor = '00000000-0000-4000-8000-000000000099';
    const servico = app.get(UsuariosService);
    await expect(servico.alterarStatus(PIZZARIA, id, false, outroAtor)).rejects.toThrow(
      'A empresa precisa ter ao menos um administrador ativo.',
    );
    await expect(servico.atualizar(PIZZARIA, id, { role: Papel.GERENTE }, outroAtor)).rejects.toThrow(
      'A empresa precisa ter ao menos um administrador ativo.',
    );

    const me = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(tokens.adminA));
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('ADMIN');
    const ainda = await request(app.getHttpServer()).get(`/api/v1/users/${id}`).set(bearer(tokens.adminA));
    expect(ainda.body).toMatchObject({ role: 'ADMIN', active: true });
  });

  it('PERM-008/009 — auto-alteração de papel ou auto-desativação é 403', async () => {
    const idAdmin = await idPorEmail(prisma, EMAILS.adminA);
    const idCaixa = await idPorEmail(prisma, EMAILS.caixaA);
    const idGerente = await idPorEmail(prisma, EMAILS.gerenteA);

    const adminPapel = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idAdmin}`)
      .set(bearer(tokens.adminA))
      .send({ role: 'GERENTE' });
    expect(adminPapel.status).toBe(403);
    expect(adminPapel.body.message).toBe('Você não pode alterar o próprio papel ou status.');

    const adminStatus = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idAdmin}/status`)
      .set(bearer(tokens.adminA))
      .send({ active: false });
    expect(adminStatus.status).toBe(403);
    expect(adminStatus.body.message).toBe('Você não pode alterar o próprio papel ou status.');

    const caixaPapel = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idCaixa}`)
      .set(bearer(tokens.caixaA))
      .send({ role: 'ADMIN' });
    expect(caixaPapel.status).toBe(403);

    const gerentePapel = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idGerente}`)
      .set(bearer(tokens.gerenteA))
      .send({ role: 'ADMIN' });
    expect(gerentePapel.status).toBe(403);
  });

  it('PERM-016 / MENU-007 — MULTI_AB: Garçom em A (403) e Gerente em B (lê, não escreve)', async () => {
    const multi = await login(app, EMAILS.multi, SENHAS.multi, '203.0.113.76');
    const meA = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(multi.accessToken));
    expect(meA.body.role).toBe('GARCOM');
    esperarConjunto(meA.body.permissions, PERMISSOES.GARCOM);
    expect((await request(app.getHttpServer()).get('/api/v1/users').set(bearer(multi.accessToken))).status).toBe(
      403,
    );

    const troca = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-company')
      .set(bearer(multi.accessToken))
      .send({ companyId: LANCHONETE });
    expect(troca.status).toBe(200);
    const meB = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(troca.body.accessToken));
    expect(meB.body.role).toBe('GERENTE');
    esperarConjunto(meB.body.permissions, PERMISSOES.GERENTE);
    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(troca.body.accessToken));
    expect(lista.status).toBe(200);
    const emails = (lista.body.data ?? []).map((u: { email: string }) => u.email);
    expect(emails).not.toContain(EMAILS.adminA);
    const post = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(troca.body.accessToken))
      .send({ name: 'X', email: 'multi.cria@pedeai.local', password: 'MultiCria1', role: 'CAIXA' });
    expect(post.status).toBe(403);
  });

  it('PERM-021/022/028 — listagem padrão inclui desativados; detalhe 200 active:false', async () => {
    const id = await idPorEmail(prisma, EMAILS.inativo);
    const padrao = await request(app.getHttpServer()).get('/api/v1/users?pageSize=100').set(bearer(tokens.adminA));
    expect(padrao.status).toBe(200);
    const inativo = (padrao.body.data ?? []).find((u: { email: string }) => u.email === EMAILS.inativo);
    expect(inativo).toBeDefined();
    expect(inativo.active).toBe(false);

    const soAtivos = await request(app.getHttpServer())
      .get('/api/v1/users?active=true&pageSize=100')
      .set(bearer(tokens.adminA));
    expect((soAtivos.body.data ?? []).map((u: { email: string }) => u.email)).not.toContain(EMAILS.inativo);

    const soInativos = await request(app.getHttpServer())
      .get('/api/v1/users?active=false')
      .set(bearer(tokens.gerenteA));
    expect(soInativos.status).toBe(200);
    expect((soInativos.body.data ?? []).map((u: { email: string }) => u.email)).toContain(EMAILS.inativo);
    expect((soInativos.body.data ?? []).map((u: { email: string }) => u.email)).not.toContain(EMAILS.caixaB);

    const detalhe = await request(app.getHttpServer()).get(`/api/v1/users/${id}`).set(bearer(tokens.adminA));
    expect(detalhe.status).toBe(200);
    expect(detalhe.body.active).toBe(false);
  });

  it('PERM-029 — desativar vínculo em A não derruba o acesso a B (C2)', async () => {
    let multi = await login(app, EMAILS.multi, SENHAS.multi, '203.0.113.77');
    if (multi.activeCompanyId !== PIZZARIA) {
      const troca = await request(app.getHttpServer())
        .post('/api/v1/auth/switch-company')
        .set(bearer(multi.accessToken))
        .send({ companyId: PIZZARIA });
      expect(troca.status).toBe(200);
      multi = { ...multi, accessToken: troca.body.accessToken, refreshToken: troca.body.refreshToken, activeCompanyId: troca.body.activeCompanyId };
    }
    expect(multi.activeCompanyId).toBe(PIZZARIA);
    const id = await idPorEmail(prisma, EMAILS.multi);
    const desativar = await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/status`)
      .set(bearer(tokens.adminA))
      .send({ active: false });
    expect(desativar.status).toBe(200);

    const meA = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(multi.accessToken));
    expect(meA.status).toBe(401);

    const novoLogin = await login(app, EMAILS.multi, SENHAS.multi, '203.0.113.78');
    expect(novoLogin.activeCompanyId).toBe(LANCHONETE);
    expect(novoLogin.companies.some((c) => c.id === LANCHONETE && c.role === 'GERENTE')).toBe(true);
    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(novoLogin.accessToken));
    expect(lista.status).toBe(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/status`)
      .set(bearer(tokens.adminA))
      .send({ active: true });
  });

  it('PERM-031 — cnpj e slug são imutáveis no PATCH /companies/current', async () => {
    const antes = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set(bearer(tokens.adminA));
    const cnpj = antes.body.cnpj;
    const slug = antes.body.slug;
    const patch = await request(app.getHttpServer())
      .patch('/api/v1/companies/current')
      .set(bearer(tokens.adminA))
      .send({ cnpj: '00000000000000', slug: 'hackeado', telefone: '1199999999' });
    expect([200, 400]).toContain(patch.status);
    const depois = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set(bearer(tokens.adminA));
    expect(depois.body.cnpj).toBe(cnpj);
    expect(depois.body.slug).toBe(slug);

    const b = await request(app.getHttpServer()).get('/api/v1/companies/current').set(bearer(tokens.adminB));
    expect(b.body.slug).toBe('lanchonete-do-ze');
  });
});
