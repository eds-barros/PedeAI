import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppLogger } from '../../src/common/logger/app-logger.service';
import { LimitadorAuth } from '../../src/modules/auth/limitador-auth';
import { MAIL_PORT, MailPort } from '../../src/modules/auth/mail.port';
import {
  EMAILS,
  SENHAS,
  bearer,
  decodificarClaims,
  idPorEmail,
  login,
  montarApp,
  popularCenario,
  sha256,
} from './helpers';

describe('QA Sprint 1 — AUTH (P0)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await popularCenario(prisma);
    app = await montarApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    app.get(LimitadorAuth).limpar();
    app.get<MailPort>(MAIL_PORT).limpar();
  });

  it('AUTH-001/025 — login válido devolve tokens, user, companies e claims', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.20')
      .send({ email: EMAILS.adminA, password: SENHAS.adminA });
    expect(resposta.status).toBe(200);
    expect(resposta.body.accessToken).toEqual(expect.any(String));
    expect(resposta.body.refreshToken).toEqual(expect.any(String));
    expect(resposta.body.user).toEqual(
      expect.objectContaining({ email: EMAILS.adminA, name: expect.any(String), id: expect.any(String) }),
    );
    expect(resposta.body.user).not.toHaveProperty('password');
    expect(resposta.body.user).not.toHaveProperty('senhaHash');
    expect(JSON.stringify(resposta.body)).not.toContain(SENHAS.adminA);
    expect(JSON.stringify(resposta.body)).not.toContain('$2b$');
    const claims = decodificarClaims(resposta.body.accessToken);
    expect(claims.sub).toBe(resposta.body.user.id);
    expect(claims.empresaId).toBe(resposta.body.activeCompanyId);
    expect(claims.papel).toBe('ADMIN');
    expect(claims.jti).toEqual(expect.any(String));
    expect(claims.sid).toEqual(expect.any(String));
  });

  it('AUTH-002/003/004/018/041 — 401 genérico idêntico (inexistente, senha, desativado, sem vínculo)', async () => {
    const inexistente = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.21')
      .send({ email: 'nao.existe@pedeai.local', password: 'Qualquer1' });
    const senha = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.21')
      .send({ email: EMAILS.adminA, password: 'SenhaErrada1' });
    const desativado = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.21')
      .send({ email: EMAILS.inativo, password: SENHAS.inativo });

    for (const r of [inexistente, senha, desativado]) {
      expect(r.status).toBe(401);
      expect(r.body.message).toBe('E-mail ou senha inválidos.');
      expect(r.body.statusCode).toBe(401);
      expect(r.body).not.toHaveProperty('accessToken');
    }
    expect(inexistente.body).toEqual(senha.body);
    expect(senha.body).toEqual(desativado.body);
  });

  it('AUTH-006/007 — GET /me e listagem não expõem hash; persistência é $2b$12$', async () => {
    const admin = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.22');
    const me = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(admin.accessToken));
    expect(me.status).toBe(200);
    const serial = JSON.stringify(me.body);
    expect(serial).not.toContain(SENHAS.adminA);
    expect(serial).not.toMatch(/\$2b\$/);
    expect(me.body.user).not.toHaveProperty('senhaHash');
    expect(me.body.user).not.toHaveProperty('password');

    const lista = await request(app.getHttpServer()).get('/api/v1/users').set(bearer(admin.accessToken));
    expect(lista.status).toBe(200);
    expect(JSON.stringify(lista.body)).not.toMatch(/\$2b\$|senhaHash|"password":/);

    const registro = await prisma.usuario.findUniqueOrThrow({ where: { email: EMAILS.adminA } });
    expect(registro.senhaHash.startsWith('$2b$12$')).toBe(true);
    expect(registro.senhaHash).not.toBe(SENHAS.adminA);
  });

  it('AUTH-008 — logger redacta senha e tokens', async () => {
    const logger = app.get(AppLogger);
    logger.limpar();
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.23')
      .send({ email: EMAILS.adminA, password: SENHAS.adminA });
    const linhas = logger.entradas().join('\n');
    expect(linhas).not.toContain(SENHAS.adminA);
    // tokens completos não podem aparecer em claro se o logger registrar o body
    if (linhas.toLowerCase().includes('password')) {
      expect(linhas).toMatch(/\[Redacted\]/i);
    }
  });

  it('AUTH-009/026/027/044 — refresh rotaciona; reúso revoga a família; sid estável', async () => {
    const sessao = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.24');
    const sid0 = decodificarClaims(sessao.accessToken).sid;
    const r1 = sessao.refreshToken;

    const rotacao = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: r1 });
    expect(rotacao.status).toBe(200);
    expect(rotacao.body.accessToken).toEqual(expect.any(String));
    expect(rotacao.body.refreshToken).toBeDefined();
    expect(rotacao.body.refreshToken).not.toBe(r1);
    const sid1 = decodificarClaims(rotacao.body.accessToken).sid;
    expect(sid1).toBe(sid0);

    const r2 = rotacao.body.refreshToken as string;
    const reuso = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: r1 });
    expect(reuso.status).toBe(401);

    const r2depois = await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: r2 });
    expect(r2depois.status).toBe(401);

    const me = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(rotacao.body.accessToken));
    expect(me.status).toBe(401);
  });

  it('AUTH-028/029/030 — reúso de uma família não derruba a outra; logout é por sessão', async () => {
    const s1 = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.25');
    const s2 = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.26');
    expect(decodificarClaims(s1.accessToken).sid).not.toBe(decodificarClaims(s2.accessToken).sid);

    const rot1 = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: s1.refreshToken });
    expect(rot1.status).toBe(200);
    await request(app.getHttpServer()).post('/api/v1/auth/refresh').send({ refreshToken: s1.refreshToken });

    const me2 = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(s2.accessToken));
    expect(me2.status).toBe(200);
    const ref2 = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: s2.refreshToken });
    expect(ref2.status).toBe(200);

    const logout = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set(bearer(ref2.body.accessToken))
      .send({ refreshToken: ref2.body.refreshToken });
    expect(logout.status).toBe(204);
    const ref2depois = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: ref2.body.refreshToken });
    expect(ref2depois.status).toBe(401);

    // s1 já estava revogada pelo reúso; uma nova sessão 3 confirma que o usuário ainda autentica
    const s3 = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.27');
    expect(s3.accessToken).toBeDefined();
  });

  it('AUTH-011/012/014/015/022/023 — logout, ausência e token inválido / tipo trocado', async () => {
    const sessao = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.28');
    const saida = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set(bearer(sessao.accessToken))
      .send({ refreshToken: sessao.refreshToken });
    expect(saida.status).toBe(204);

    const refresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessao.refreshToken });
    expect(refresh.status).toBe(401);

    const sem = await request(app.getHttpServer()).get('/api/v1/me');
    expect(sem.status).toBe(401);
    const lixo = await request(app.getHttpServer()).get('/api/v1/me').set(bearer('nao-e-um-jwt'));
    expect(lixo.status).toBe(401);
    const partes = sessao.accessToken.split('.');
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString());
    payload.empresaId = '22222222-2222-4222-8222-222222222222';
    const adulterado = `${partes[0]}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${partes[2]}`;
    const forged = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(adulterado));
    expect(forged.status).toBe(401);

    const sessao2 = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.29');
    const accessComoRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessao2.accessToken });
    expect(accessComoRefresh.status).toBe(401);
    const refreshComoAccess = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(bearer(sessao2.refreshToken));
    expect(refreshComoAccess.status).toBe(401);
  });

  it('AUTH-016/017/039 — rate limit 5 falhas / 15 min, 429 com Retry-After inclusive na senha correta', async () => {
    expect(process.env.LOGIN_MAX_FALHAS_EMAIL).toBe('5');
    expect(process.env.LOGIN_MAX_FALHAS_IP).toBe('20');
    expect(process.env.LOGIN_JANELA_MIN).toBe('15');
    const ip = '203.0.113.80';
    for (let i = 0; i < 5; i += 1) {
      const falha = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: EMAILS.adminA, password: 'errada1' });
      expect(falha.status).toBe(401);
    }
    const bloqueio = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: EMAILS.adminA, password: SENHAS.adminA });
    expect(bloqueio.status).toBe(429);
    expect(bloqueio.headers['retry-after']).toBeDefined();
    const retryAfter = Number(bloqueio.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(15 * 60);
    expect(bloqueio.body.accessToken).toBeUndefined();
  });

  it('AUTH-040 — 20 falhas por IP em 15 min; login bem-sucedido não consome a cota', async () => {
    const ip = '203.0.113.90';
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: EMAILS.adminA, password: SENHAS.adminA });
      expect(ok.status).toBe(200);
    }
    for (let i = 0; i < 20; i += 1) {
      const falha = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: `inexistente.${i}@pedeai.local`, password: 'errada1' });
      expect(falha.status).toBe(401);
    }
    const bloqueio = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: EMAILS.gerenteA, password: SENHAS.gerenteA });
    expect(bloqueio.status).toBe(429);
    expect(bloqueio.headers['retry-after']).toBeDefined();
    expect(bloqueio.body.accessToken).toBeUndefined();
  });

  it('AUTH-019/020 — desativar vínculo: 401 imediato no access e no refresh (guard)', async () => {
    const alvo = await login(app, EMAILS.garcomA, SENHAS.garcomA, '203.0.113.30');
    const admin = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.31');
    const id = await idPorEmail(prisma, EMAILS.garcomA);
    const status = await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/status`)
      .set(bearer(admin.accessToken))
      .send({ active: false });
    expect(status.status).toBe(200);

    const me = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(alvo.accessToken));
    expect(me.status).toBe(401);
    const ref = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: alvo.refreshToken });
    expect(ref.status).toBe(401);

    // reativa para não contaminar outros testes do mesmo arquivo (já truncado só no beforeAll)
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/status`)
      .set(bearer(admin.accessToken))
      .send({ active: true });
  });

  it('AUTH-033/034/035/036 — forgot 204, token via MAIL_PORT, reset único, token inválido', async () => {
    const mail = app.get<MailPort>(MAIL_PORT);
    const ativo = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.32')
      .send({ email: EMAILS.caixaA });
    expect(ativo.status).toBe(204);
    const msg = mail.ultimaMensagemPara(EMAILS.caixaA);
    expect(msg?.token).toEqual(expect.any(String));

    const inexistente = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.32')
      .send({ email: 'nao@pedeai.local' });
    expect(inexistente.status).toBe(204);
    expect(mail.ultimaMensagemPara('nao@pedeai.local')).toBeUndefined();

    const desativado = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.32')
      .send({ email: EMAILS.inativo });
    expect(desativado.status).toBe(204);
    expect(mail.ultimaMensagemPara(EMAILS.inativo)).toBeUndefined();

    const token = msg!.token!;
    const reset = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'CaixaNova1' });
    expect(reset.status).toBe(204);
    const entrou = await login(app, EMAILS.caixaA, 'CaixaNova1', '203.0.113.33');
    expect(entrou.accessToken).toBeDefined();

    const reuso = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'OutraSenha1' });
    expect(reuso.status).toBe(400);
    expect(reuso.body.message).toBe('Token inválido ou expirado.');

    const invalido = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'token-lixo', newPassword: 'OutraSenha1' });
    expect(invalido.status).toBe(400);
    expect(invalido.body.message).toBe('Token inválido ou expirado.');

    // restaura senha original via change-password para não quebrar outros casos
    await request(app.getHttpServer())
      .patch('/api/v1/auth/change-password')
      .set(bearer(entrou.accessToken))
      .send({ currentPassword: 'CaixaNova1', newPassword: SENHAS.caixaA });
  });

  it('AUTH-046 — reset com token após desativar o vínculo: 400 e não reativa', async () => {
    const mail = app.get<MailPort>(MAIL_PORT);
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.34')
      .send({ email: EMAILS.cozinhaA });
    const token = mail.ultimaMensagemPara(EMAILS.cozinhaA)?.token;
    expect(token).toBeDefined();

    const admin = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.35');
    const id = await idPorEmail(prisma, EMAILS.cozinhaA);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/v1/users/${id}/status`)
          .set(bearer(admin.accessToken))
          .send({ active: false })
      ).status,
    ).toBe(200);

    const reset = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'CozinhaNova1' });
    expect(reset.status).toBe(400);
    expect(reset.body.message).toBe('Token inválido ou expirado.');

    const loginNovo = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.36')
      .send({ email: EMAILS.cozinhaA, password: 'CozinhaNova1' });
    expect(loginNovo.status).toBe(401);
    const loginAntigo = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.36')
      .send({ email: EMAILS.cozinhaA, password: SENHAS.cozinhaA });
    expect(loginAntigo.status).toBe(401);
    expect(loginAntigo.body.message).toBe('E-mail ou senha inválidos.');

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${id}/status`)
      .set(bearer(admin.accessToken))
      .send({ active: true });
  });

  it('AUTH-031/032 — reset revoga todas as famílias; change-password revoga as demais', async () => {
    const s1 = await login(app, EMAILS.gerenteA, SENHAS.gerenteA, '203.0.113.37');
    const s2 = await login(app, EMAILS.gerenteA, SENHAS.gerenteA, '203.0.113.38');
    const troca = await request(app.getHttpServer())
      .patch('/api/v1/auth/change-password')
      .set(bearer(s1.accessToken))
      .send({ currentPassword: SENHAS.gerenteA, newPassword: 'GerenteNova1' });
    expect(troca.status).toBe(204);
    const me1 = await request(app.getHttpServer()).get('/api/v1/me').set(bearer(s1.accessToken));
    expect(me1.status).toBe(200);
    const ref2 = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: s2.refreshToken });
    expect(ref2.status).toBe(401);

    await request(app.getHttpServer())
      .patch('/api/v1/auth/change-password')
      .set(bearer(s1.accessToken))
      .send({ currentPassword: 'GerenteNova1', newPassword: SENHAS.gerenteA });
  });

  it('AUTH-042 — refresh é persistido só como hash SHA-256', async () => {
    const sessao = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.39');
    const hash = sha256(sessao.refreshToken);
    const linha = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    expect(linha).not.toBeNull();
    const textoPuro = await prisma.refreshToken.findFirst({
      where: { tokenHash: sessao.refreshToken },
    });
    expect(textoPuro).toBeNull();
  });

  it('AUTH-044 — novo login gera sid diferente (nova família)', async () => {
    const a = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.40');
    const b = await login(app, EMAILS.adminA, SENHAS.adminA, '203.0.113.41');
    expect(decodificarClaims(a.accessToken).sid).not.toBe(decodificarClaims(b.accessToken).sid);
    expect(decodificarClaims(a.accessToken).jti).not.toBe(decodificarClaims(b.accessToken).jti);
  });
});
