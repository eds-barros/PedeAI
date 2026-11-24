import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Papel, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { criarAdaptadorFastify } from '../src/common/correlation/request-id';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { MAIL_PORT, MailPort } from '../src/modules/auth/mail.port';
import { LimitadorAuth } from '../src/modules/auth/limitador-auth';

const PIZZARIA = '11111111-1111-4111-8111-111111111111';
const LANCHONETE = '22222222-2222-4222-8222-222222222222';

describe('Sprint 1 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken = '';
  let gerenteToken = '';
  let garcomToken = '';
  let garcomId = '';
  let multiToken = '';
  let multiRefresh = '';

  beforeAll(async () => {
    prisma = new PrismaClient();
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
    await criarUsuario('admin.pizzaria@pedeai.local', 'PizzariaAdmin1', 'Admin Pizzaria', PIZZARIA, Papel.ADMIN);
    await criarUsuario('gerente.pizzaria@pedeai.local', 'PizzariaGerente1', 'Gerente Pizzaria', PIZZARIA, Papel.GERENTE);
    garcomId = await criarUsuario('garcom.pizzaria@pedeai.local', 'PizzariaGarcom1', 'Garçom Pizzaria', PIZZARIA, Papel.GARCOM);
    await criarUsuario('admin.lanchonete@pedeai.local', 'LanchoneteAdmin1', 'Admin Lanchonete', LANCHONETE, Papel.ADMIN);
    const multiId = await criarUsuario('multi@pedeai.local', 'MultiEmpresa1', 'Multi', PIZZARIA, Papel.GARCOM, PIZZARIA);
    await prisma.usuarioEmpresa.create({
      data: { usuarioId: multiId, empresaId: LANCHONETE, papel: Papel.GERENTE, ativo: true },
    });

    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication<NestFastifyApplication>(criarAdaptadorFastify(), { rawBody: true });
    configurarApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const admin = await login('admin.pizzaria@pedeai.local', 'PizzariaAdmin1');
    adminToken = admin.accessToken;
    gerenteToken = (await login('gerente.pizzaria@pedeai.local', 'PizzariaGerente1')).accessToken;
    garcomToken = (await login('garcom.pizzaria@pedeai.local', 'PizzariaGarcom1')).accessToken;
    const multi = await login('multi@pedeai.local', 'MultiEmpresa1');
    multiToken = multi.accessToken;
    multiRefresh = multi.refreshToken;
    expect(multi.activeCompanyId).toBe(PIZZARIA);
    expect(multi.companies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Pizzaria Bella Napoli', role: 'GARCOM' }),
        expect.objectContaining({ name: 'Lanchonete do Zé', role: 'GERENTE' }),
      ]),
    );
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    app.get(LimitadorAuth).limpar();
    app.get<MailPort>(MAIL_PORT).limpar();
  });

  it('responde saúde, correlaciona a requisição e preserva o raw body', async () => {
    const comId = await request(app.getHttpServer()).get('/api/v1/health').set('X-Request-Id', 'req-teste-1');
    expect(comId.status).toBe(200);
    expect(comId.body).toEqual({ status: 'ok' });
    expect(comId.headers['x-request-id']).toBe('req-teste-1');

    const gerado = await request(app.getHttpServer()).get('/api/v1/health');
    expect(gerado.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const fastify = app.getHttpAdapter().getInstance();
    let bruto: Buffer | undefined;
    fastify.addHook('preHandler', (req, _reply, done) => {
      if (req.url?.includes('/auth/login')) bruto = req.rawBody as Buffer | undefined;
      done();
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ email: 'nao-existe@pedeai.local', password: 'Senha123' });
    expect(bruto?.toString()).toContain('nao-existe@pedeai.local');
  });

  it('não distingue e-mail inexistente de senha errada', async () => {
    const senha = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.20')
      .send({ email: 'admin.pizzaria@pedeai.local', password: 'errada1' });
    const ausente = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.21')
      .send({ email: 'ninguem@pedeai.local', password: 'Senha123' });
    expect(senha.status).toBe(401);
    expect(ausente.status).toBe(401);
    expect(senha.body.message).toBe('E-mail ou senha inválidos.');
    expect(ausente.body.message).toBe(senha.body.message);
  });

  it('rotaciona o refresh e a reutilização revoga a família', async () => {
    const sessao = await login('admin.pizzaria@pedeai.local', 'PizzariaAdmin1', '203.0.113.30');
    const renovado = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessao.refreshToken });
    expect(renovado.status).toBe(200);
    expect(renovado.body.refreshToken).not.toBe(sessao.refreshToken);

    const reuso = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: sessao.refreshToken });
    expect(reuso.status).toBe(401);

    const sucessor = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: renovado.body.refreshToken });
    expect(sucessor.status).toBe(401);
  });

  it('logout revoga a sessão e o access deixa de valer', async () => {
    const sessao = await login('gerente.pizzaria@pedeai.local', 'PizzariaGerente1', '203.0.113.31');
    const saida = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${sessao.accessToken}`)
      .send({ refreshToken: sessao.refreshToken });
    expect(saida.status).toBe(204);
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${sessao.accessToken}`);
    expect(me.status).toBe(401);
  });

  it('desativar o vínculo derruba a sessão e o login', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Temporário', email: 'temp.pizzaria@pedeai.local', password: 'TempSenha1', role: 'CAIXA' });
    expect(criado.status).toBe(201);
    const sessao = await login('temp.pizzaria@pedeai.local', 'TempSenha1', '203.0.113.32');
    const status = await request(app.getHttpServer())
      .patch(`/api/v1/users/${criado.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });
    expect(status.status).toBe(200);
    expect(status.body.active).toBe(false);

    const bloqueado = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${sessao.accessToken}`);
    expect(bloqueado.status).toBe(401);
    const novoLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.33')
      .send({ email: 'temp.pizzaria@pedeai.local', password: 'TempSenha1' });
    expect(novoLogin.status).toBe(401);
    expect(novoLogin.body.message).toBe('E-mail ou senha inválidos.');

    const consulta = await request(app.getHttpServer())
      .get(`/api/v1/users/${criado.body.id}`)
      .set('Authorization', `Bearer ${gerenteToken}`);
    expect(consulta.status).toBe(200);
    expect(consulta.body.active).toBe(false);
  });

  it('isola empresas e ignora header de empresa', async () => {
    const outroAdmin = await prisma.usuario.findUnique({ where: { email: 'admin.lanchonete@pedeai.local' } });
    const leitura = await request(app.getHttpServer())
      .get(`/api/v1/users/${outroAdmin?.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Company-Id', LANCHONETE);
    expect(leitura.status).toBe(404);
    expect(leitura.body.message).toBe('Usuário não encontrado.');

    const lista = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Company-Id', LANCHONETE);
    expect(lista.status).toBe(200);
    expect(lista.body.data.map((item: { email: string }) => item.email)).not.toContain(
      'admin.lanchonete@pedeai.local',
    );
    expect(lista.body.meta.total).toBeGreaterThan(0);
  });

  it('aplica RBAC, último admin e e-mail já existente', async () => {
    const gerenteCria = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${gerenteToken}`)
      .send({ name: 'Novo', email: 'novo@pedeai.local', password: 'Senha1234', role: 'CAIXA' });
    expect(gerenteCria.status).toBe(403);

    const garcomLista = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${garcomToken}`);
    expect(garcomLista.status).toBe(403);

    const papeis = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${gerenteToken}`);
    expect(papeis.status).toBe(200);
    expect(papeis.body.find((item: { role: string }) => item.role === 'ADMIN').permissions).toContain(
      'usuarios:gerenciar',
    );
    const garcomPapeis = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${garcomToken}`);
    expect(garcomPapeis.status).toBe(403);

    const duplicado = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Outro', email: 'admin.lanchonete@pedeai.local', password: 'Senha1234', role: 'CAIXA' });
    expect(duplicado.status).toBe(409);
    expect(duplicado.body.message).toBe('Não foi possível cadastrar este e-mail.');
    expect(duplicado.body.message).not.toContain(LANCHONETE);

    const me = await request(app.getHttpServer()).get('/api/v1/me').set('Authorization', `Bearer ${adminToken}`);
    expect(me.body.permissions).toContain('empresa:editar');
    expect(me.body.role).toBe('ADMIN');

    const rebaixar = await request(app.getHttpServer())
      .patch(`/api/v1/users/${(await idDe('admin.pizzaria@pedeai.local'))}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });
    expect(rebaixar.status).toBe(409);

    const fraca = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fraca', email: 'fraca@pedeai.local', password: 'semnumero', role: 'CAIXA' });
    expect(fraca.status).toBe(400);
    expect(fraca.body.errors[0].field).toBe('password');
  });

  it('troca a empresa ativa e mata o access antigo', async () => {
    const trocou = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-company')
      .set('Authorization', `Bearer ${multiToken}`)
      .send({ companyId: LANCHONETE });
    expect(trocou.status).toBe(200);
    expect(trocou.body).toMatchObject({ activeCompanyId: LANCHONETE, role: 'GERENTE' });

    const antigo = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${multiToken}`);
    expect(antigo.status).toBe(401);

    const novo = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${trocou.body.accessToken}`);
    expect(novo.status).toBe(200);
    expect(novo.body.role).toBe('GERENTE');
    expect(novo.body.permissions).not.toContain('usuarios:gerenciar');

    const reuso = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: multiRefresh });
    expect(reuso.status).toBe(401);
    const depois = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${trocou.body.accessToken}`);
    expect(depois.status).toBe(401);

    const inexistente = await request(app.getHttpServer())
      .post('/api/v1/auth/switch-company')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyId: LANCHONETE });
    expect(inexistente.status).toBe(404);
  });

  it('mostra o cadastro da empresa conforme o papel', async () => {
    const garcom = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set('Authorization', `Bearer ${garcomToken}`);
    expect(garcom.status).toBe(200);
    expect(garcom.body).toEqual({
      id: PIZZARIA,
      nomeFantasia: 'Pizzaria Bella Napoli',
      slug: 'pizzaria-bella-napoli',
      logoUrl: null,
    });

    const admin = await request(app.getHttpServer())
      .get('/api/v1/companies/current')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(admin.body).toMatchObject({ razaoSocial: 'Pizzaria Bella Napoli Ltda', cnpj: '11222333000181' });

    const patch = await request(app.getHttpServer())
      .patch('/api/v1/companies/current')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nomeFantasia: 'Pizzaria Bella', slug: 'outra' });
    expect(patch.status).toBe(400);

    const ok = await request(app.getHttpServer())
      .patch('/api/v1/companies/current')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ telefone: '11988887777' });
    expect(ok.status).toBe(200);
    expect(ok.body.telefone).toBe('11988887777');
    expect(ok.body.slug).toBe('pizzaria-bella-napoli');

    const garcomPatch = await request(app.getHttpServer())
      .patch('/api/v1/companies/current')
      .set('Authorization', `Bearer ${garcomToken}`)
      .send({ telefone: '1' });
    expect(garcomPatch.status).toBe(403);
  });

  it('não envia e-mail de conta desativada e redefine a senha pelo port', async () => {
    const esquecido = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.40')
      .send({ email: 'nao-existe@pedeai.local' });
    expect(esquecido.status).toBe(204);
    expect(app.get<MailPort>(MAIL_PORT).ultimaMensagemPara('nao-existe@pedeai.local')).toBeUndefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${garcomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });
    const desativado = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.41')
      .send({ email: 'garcom.pizzaria@pedeai.local' });
    expect(desativado.status).toBe(204);
    expect(app.get<MailPort>(MAIL_PORT).ultimaMensagemPara('garcom.pizzaria@pedeai.local')).toBeUndefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${garcomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true });
    const pedido = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.42')
      .send({ email: 'garcom.pizzaria@pedeai.local' });
    expect(pedido.status).toBe(204);
    const mensagem = app.get<MailPort>(MAIL_PORT).ultimaMensagemPara('garcom.pizzaria@pedeai.local');
    expect(mensagem?.token).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${garcomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });
    const resetBloqueado = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: mensagem?.token, newPassword: 'OutraSenha1' });
    expect(resetBloqueado.status).toBe(400);
    expect(resetBloqueado.body.message).toBe('Token inválido ou expirado.');
    const aindaInativo = await prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: garcomId, empresaId: PIZZARIA },
    });
    expect(aindaInativo?.ativo).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${garcomId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: true });
    const novoPedido = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', '203.0.113.43')
      .send({ email: 'garcom.pizzaria@pedeai.local' });
    expect(novoPedido.status).toBe(204);
    const token = app.get<MailPort>(MAIL_PORT).ultimaMensagemPara('garcom.pizzaria@pedeai.local')?.token;
    const reset = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'GarcomNova1' });
    expect(reset.status).toBe(204);
    const entrou = await login('garcom.pizzaria@pedeai.local', 'GarcomNova1', '203.0.113.44');
    expect(entrou.accessToken).toEqual(expect.any(String));
    garcomToken = entrou.accessToken;
  });

  it('bloqueia o login depois de cinco falhas, mesmo com a senha certa', async () => {
    for (let i = 0; i < 5; i += 1) {
      const falha = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '203.0.113.50')
        .send({ email: 'admin.pizzaria@pedeai.local', password: 'errada1' });
      expect(falha.status).toBe(401);
    }
    const bloqueio = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '203.0.113.50')
      .send({ email: 'admin.pizzaria@pedeai.local', password: 'PizzariaAdmin1' });
    expect(bloqueio.status).toBe(429);
    expect(bloqueio.headers['retry-after']).toBeDefined();
    expect(bloqueio.body.message).toContain('Muitas tentativas');
  });

  async function login(email: string, password: string, ip = '203.0.113.9') {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email, password });
    expect(resposta.status).toBe(200);
    return resposta.body as {
      accessToken: string;
      refreshToken: string;
      activeCompanyId: string;
      companies: { name: string; role: string }[];
    };
  }

  async function criarUsuario(
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

  async function idDe(email: string): Promise<string> {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    return usuario.id;
  }
});
