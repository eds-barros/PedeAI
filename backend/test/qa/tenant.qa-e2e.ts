import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { LimitadorAuth } from '../../src/modules/auth/limitador-auth';
import { MAIL_PORT, MailPort } from '../../src/modules/auth/mail.port';
import {
  EMAILS,
  LANCHONETE,
  PIZZARIA,
  SENHAS,
  UUID_INEXISTENTE,
  bearer,
  decodificarClaims,
  idPorEmail,
  login,
  montarApp,
  popularCenario,
} from './helpers';

describe('QA Sprint 1 — TEN isolamento e switch-company (P0)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminA: string;
  let adminB: string;
  let multi: { accessToken: string; refreshToken: string };
  let idAdminB: string;
  let idCaixaB: string;
  let idAdminA: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await popularCenario(prisma);
    app = await montarApp();
    adminA = (await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.60')).accessToken;
    adminB = (await login(app, EMAILS.adminB, SENHAS.adminB, '203.0.113.61')).accessToken;
    multi = await login(app, EMAILS.multi, SENHAS.multi, '203.0.113.62');
    idAdminB = await idPorEmail(prisma, EMAILS.adminB);
    idCaixaB = await idPorEmail(prisma, EMAILS.caixaB);
    idAdminA = await idPorEmail(prisma, EMAILS.adminA);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    app.get(LimitadorAuth).limpar();
    app.get<MailPort>(MAIL_PORT).limpar();
  });

  it('TEN-001/011/021/025 — GET de usuário de B com token de A é 404 genérico', async () => {
    const real = await request(app.getHttpServer()).get(`/api/v1/users/${idAdminB}`).set(bearer(adminA));
    const gerenteB = await idPorEmail(prisma, EMAILS.gerenteB);
    const outro = await request(app.getHttpServer()).get(`/api/v1/users/${gerenteB}`).set(bearer(adminA));
    const inexistente = await request(app.getHttpServer())
      .get(`/api/v1/users/${UUID_INEXISTENTE}`)
      .set(bearer(adminA));
    for (const r of [real, outro, inexistente]) {
      expect(r.status).toBe(404);
      expect(r.body.message).toBe('Usuário não encontrado.');
      expect(JSON.stringify(r.body)).not.toContain(EMAILS.adminB);
      expect(JSON.stringify(r.body)).not.toContain(EMAILS.gerenteB);
    }
    expect(real.body).toEqual(inexistente.body);
  });

  it('TEN-002/003/022 — PATCH e status em ID de B não alteram B (404)', async () => {
    const patch = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idAdminB}`)
      .set(bearer(adminA))
      .send({ name: 'Intruso' });
    expect(patch.status).toBe(404);
    const status = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idAdminB}/status`)
      .set(bearer(adminA))
      .send({ active: false });
    expect(status.status).toBe(404);
    const papel = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idCaixaB}`)
      .set(bearer(adminA))
      .send({ role: 'CAIXA' });
    expect(papel.status).toBe(404);

    const relido = await request(app.getHttpServer()).get(`/api/v1/users/${idAdminB}`).set(bearer(adminB));
    expect(relido.status).toBe(200);
    expect(relido.body.name).not.toBe('Intruso');
    expect(relido.body.active).not.toBe(false);
  });

  it('TEN-005/006/007/009/010 — query/header forjados e listagem não vazam B', async () => {
    const query = await request(app.getHttpServer())
      .get(`/api/v1/users?companyId=${LANCHONETE}&pageSize=100`)
      .set(bearer(adminA));
    // 400 (query não reconhecida) ou 200 só com dados de A — nunca lista B
    expect([200, 400]).toContain(query.status);
    if (query.status === 200) {
      const emails = (query.body.data ?? query.body).map((u: { email?: string }) => u.email);
      expect(emails).not.toContain(EMAILS.adminB);
      expect(emails).not.toContain(EMAILS.caixaB);
      expect(emails).toContain(EMAILS.adminA);
    }
    const listaA = await request(app.getHttpServer())
      .get('/api/v1/users?pageSize=100')
      .set(bearer(adminA));
    expect(listaA.status).toBe(200);
    const emailsA = (listaA.body.data ?? []).map((u: { email?: string }) => u.email);
    expect(emailsA).toContain(EMAILS.adminA);
    expect(emailsA).not.toContain(EMAILS.adminB);

    const header = await request(app.getHttpServer())
      .get('/api/v1/users?pageSize=100')
      .set(bearer(adminA))
      .set('X-Company-Id', LANCHONETE)
      .set('X-Tenant-Id', LANCHONETE)
      .set('X-Empresa-Id', LANCHONETE);
    expect(header.status).toBe(200);
    const emailsH = (header.body.data ?? []).map((u: { email?: string }) => u.email);
    expect(emailsH).not.toContain(EMAILS.adminB);
    expect(emailsH).toContain(EMAILS.adminA);

    const detalheHeader = await request(app.getHttpServer())
      .get(`/api/v1/users/${idAdminB}`)
      .set(bearer(adminA))
      .set('X-Company-Id', LANCHONETE);
    expect(detalheHeader.status).toBe(404);

    const busca = await request(app.getHttpServer())
      .get(`/api/v1/users?search=${encodeURIComponent(EMAILS.adminB)}`)
      .set(bearer(adminA));
    expect(busca.status).toBe(200);
    const achados = (busca.body.data ?? []).map((u: { email?: string }) => u.email);
    expect(achados).not.toContain(EMAILS.adminB);
    expect(busca.body.meta?.total ?? achados.length).not.toBeGreaterThan(0);
  });

  it('TEN-012/023 — companyId de B no body de POST /users não cria em B', async () => {
    const email = 'intruso.qa@pedeai.local';
    const criado = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(adminA))
      .send({
        name: 'Intruso QA',
        email,
        password: 'IntrusoQa1',
        role: 'CAIXA',
        companyId: LANCHONETE,
        empresaId: LANCHONETE,
      });
    expect([201, 400]).toContain(criado.status);
    if (criado.status === 201) {
      expect(criado.body.email ?? criado.body.user?.email ?? email).toBeDefined();
    }
    const buscaB = await request(app.getHttpServer())
      .get(`/api/v1/users?search=${encodeURIComponent(email)}`)
      .set(bearer(adminB));
    const emailsB = (buscaB.body.data ?? []).map((u: { email?: string }) => u.email);
    expect(emailsB).not.toContain(email);
  });

  it('TEN-014/015/016/018/026/044 — switch-company rotaciona a família, mata access antigo e muda o papel', async () => {
    const sid0 = decodificarClaims(multi.accessToken).sid;
    expect(decodificarClaims(multi.accessToken).empresaId).toBe(PIZZARIA);
    expect(decodificarClaims(multi.accessToken).papel).toBe('GARCOM');

    const listaA = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(multi.accessToken));
    expect(listaA.status).toBe(403);

    const troca = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-company')
      .set(bearer(multi.accessToken))
      .send({ companyId: LANCHONETE });
    expect(troca.status).toBe(200);
    expect(troca.body.activeCompanyId).toBe(LANCHONETE);
    expect(troca.body.role).toBe('GERENTE');
    expect(troca.body.accessToken).toBeDefined();
    expect(troca.body.refreshToken).toBeDefined();
    expect(troca.body.refreshToken).not.toBe(multi.refreshToken);
    const claims = decodificarClaims(troca.body.accessToken);
    expect(claims.empresaId).toBe(LANCHONETE);
    expect(claims.papel).toBe('GERENTE');
    expect(claims.sid).toBe(sid0);

    const antigo = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(multi.accessToken));
    expect(antigo.status).toBe(401);

    // usa os tokens novos ANTES de reenviar o refresh antigo (reúso revoga a família)
    const listaB = await request(app.getHttpServer()).get('/api/v1/users?pageSize=100').set(bearer(troca.body.accessToken));
    expect(listaB.status).toBe(200);
    const emails = (listaB.body.data ?? []).map((u: { email?: string }) => u.email);
    expect(emails).toContain(EMAILS.adminB);
    expect(emails).not.toContain(EMAILS.adminA);
    expect(emails).not.toContain(EMAILS.garcomA);

    const idA = await request(app.getHttpServer())
      .get(`/api/v1/users/${idAdminA}`)
      .set(bearer(troca.body.accessToken));
    expect(idA.status).toBe(404);

    const postB = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(troca.body.accessToken))
      .send({ name: 'Novo', email: 'novo.b@pedeai.local', password: 'NovoUser1', role: 'CAIXA' });
    expect(postB.status).toBe(403);

    const refreshAntigo = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: multi.refreshToken });
    expect(refreshAntigo.status).toBe(401);
    const meNovo = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(troca.body.accessToken));
    expect(meNovo.status).toBe(401);
  });

  it('TEN-017/019 — switch sem vínculo ou empresa inexistente é 404 e não rotaciona', async () => {
    const sessao = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.63');
    const semVinculo = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-company')
      .set(bearer(sessao.accessToken))
      .send({ companyId: LANCHONETE });
    expect(semVinculo.status).toBe(404);
    const inexistente = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-company')
      .set(bearer(sessao.accessToken))
      .send({ companyId: UUID_INEXISTENTE });
    expect(inexistente.status).toBe(404);
    const me = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(sessao.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.activeCompanyId).toBe(PIZZARIA);
    const ref = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessao.refreshToken });
    expect(ref.status).toBe(200);
  });

  it('TEN-027/028 — soft-deletado de B não vaza; filtros ficam em A', async () => {
    const desativar = await request(app.getHttpServer())
      .patch(`/api/v1/users/${idCaixaB}/status`)
      .set(bearer(adminB))
      .send({ active: false });
    expect(desativar.status).toBe(200);

    const get = await request(app.getHttpServer()).get(`/api/v1/users/${idCaixaB}`).set(bearer(adminA));
    expect(get.status).toBe(404);
    const inativos = await request(app.getHttpServer()).get('/api/v1/users?active=false').set(bearer(adminA));
    expect(inativos.status).toBe(200);
    const emails = (inativos.body.data ?? []).map((u: { email?: string }) => u.email);
    expect(emails).not.toContain(EMAILS.caixaB);
    expect(emails).toContain(EMAILS.inativo);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${idCaixaB}/status`)
      .set(bearer(adminB))
      .send({ active: true });
  });

  it('TEN-030/033 — POST /users com e-mail existente (A, B, soft-deletado) é 409 genérico indistinguível (C1)', async () => {
    const corpo = (email: string) => ({
      name: 'Tentativa',
      email,
      password: 'Tentativa1',
      role: 'CAIXA',
    });
    const mesma = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(adminA))
      .send(corpo(EMAILS.caixaA));
    const outra = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(adminA))
      .send(corpo(EMAILS.caixaB));
    const soft = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(bearer(adminA))
      .send(corpo(EMAILS.inativo));

    for (const r of [mesma, outra, soft]) {
      expect(r.status).toBe(409);
      expect(r.body.message).toBe('Não foi possível cadastrar este e-mail.');
      expect(JSON.stringify(r.body)).not.toContain(idCaixaB);
      expect(JSON.stringify(r.body)).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
    }
    expect(mesma.body.message).toBe(outra.body.message);
    expect(outra.body.message).toBe(soft.body.message);
    expect(Object.keys(mesma.body).sort()).toEqual(Object.keys(outra.body).sort());

    const buscaB = await request(app.getHttpServer())
      .get(`/api/v1/users?search=${encodeURIComponent(EMAILS.caixaB)}`)
      .set(bearer(adminA));
    expect((buscaB.body.data ?? []).map((u: { email: string }) => u.email)).not.toContain(EMAILS.caixaB);

    const loginB = await login(app, EMAILS.caixaB, SENHAS.caixaB, '203.0.113.64');
    expect(loginB.accessToken).toBeDefined();
    const senhaForjada = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.64')
      .send({ email: EMAILS.caixaB, password: 'Tentativa1' });
    expect(senhaForjada.status).toBe(401);
  });

  it('TEN-031/032 — GET /me e /companies/current não vazam a outra empresa', async () => {
    const meA = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(adminA));
    expect(meA.status).toBe(200);
    const ids = (meA.body.companies ?? []).map((c: { id: string }) => c.id);
    expect(ids).toEqual([PIZZARIA]);

    const emp = await request(app.getHttpServer()).get('/api/v1/companies/current').set(bearer(adminA));
    expect(emp.status).toBe(200);
    expect(emp.body.id).toBe(PIZZARIA);
    expect(emp.body.nomeFantasia).toContain('Pizzaria');
    expect(emp.body.cnpj).not.toBe('22333444000192');
    expect(JSON.stringify(emp.body)).not.toContain('Lanchonete do Zé');
  });

  it('TEN-013 — JWT com empresaId adulterado (sem reassinatura) é 401', async () => {
    const partes = adminA.split('.');
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
    payload.empresaId = LANCHONETE;
    payload.papel = 'ADMIN';
    const adulterado = `${partes[0]}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${partes[2]}`;
    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(adulterado));
    expect(lista.status).toBe(401);
  });
});
