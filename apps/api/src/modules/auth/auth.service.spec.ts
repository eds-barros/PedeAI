jest.mock('bcrypt', () => ({
  hash: jest.fn(async (valor: string) => `$2b$12$hashed:${valor}`),
  compare: jest.fn(async (valor: string, hash: string) => hash === `$2b$12$hashed:${valor}`),
}));

import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Papel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsuarioAutenticado } from '../../common/tenant/usuario-autenticado';
import { AuthService } from './auth.service';
import { LimitadorAuth } from './limitador-auth';
import { MailPort } from './mail.port';
import { Relogio } from './relogio';
import { hashToken } from './tokens';

const AGORA = 1_700_000_000_000;

function usuarioAuth(parcial: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
  return {
    id: 'u1',
    email: 'ana@pedeai.local',
    empresaId: 'e1',
    papel: Papel.ADMIN,
    jti: 'j1',
    sid: 's1',
    ...parcial,
  };
}

describe('AuthService', () => {
  const prisma: any = {
    usuario: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    usuarioEmpresa: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    sessao: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    tokenRedefinicaoSenha: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    empresa: { findUnique: jest.fn() },
    $transaction: jest.fn(async (operacao: unknown) => {
      if (typeof operacao === 'function') return (operacao as (tx: unknown) => Promise<unknown>)(prisma);
      return Promise.all(operacao as Promise<unknown>[]);
    }),
  };
  const jwt = { signAsync: jest.fn(async (payload: { jti: string }) => `access.${payload.jti}`) };
  const config = { get: jest.fn((chave: string) => (chave === 'APP_URL' ? 'http://app' : 7)) };
  const limitador = {
    verificarLogin: jest.fn(),
    registrarFalhaLogin: jest.fn(),
    registrarSucessoLogin: jest.fn(),
    verificarEsqueciSenha: jest.fn(),
  };
  const relogio = { agora: jest.fn(() => AGORA) };
  const mail: MailPort = { enviar: jest.fn(), ultimaMensagemPara: jest.fn(), limpar: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    limitador as unknown as LimitadorAuth,
    relogio as unknown as Relogio,
    mail,
  );

  const vinculo = (empresaId: string, nome: string, papel: Papel) => ({
    empresaId,
    papel,
    empresa: { id: empresaId, nomeFantasia: nome },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    relogio.agora.mockReturnValue(AGORA);
    config.get.mockImplementation((chave: string) => (chave === 'APP_URL' ? 'http://app' : 7));
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-novo' });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.sessao.update.mockResolvedValue({});
    prisma.sessao.updateMany.mockResolvedValue({ count: 1 });
    prisma.usuario.update.mockResolvedValue({});
    prisma.tokenRedefinicaoSenha.update.mockResolvedValue({});
    prisma.tokenRedefinicaoSenha.updateMany.mockResolvedValue({ count: 0 });
    prisma.tokenRedefinicaoSenha.create.mockResolvedValue({});
  });

  it('entra na última empresa ativa e emite tokens', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      nome: 'Ana',
      email: 'ana@pedeai.local',
      senhaHash: '$2b$12$hashed:correta',
      ativo: true,
      ultimaEmpresaId: 'e2',
    });
    prisma.usuarioEmpresa.findMany.mockResolvedValue([
      vinculo('e1', 'Alfa', Papel.CAIXA),
      vinculo('e2', 'Beta', Papel.GERENTE),
    ]);
    prisma.sessao.create.mockResolvedValue({ id: 's1' });

    const resposta = await service.login(' Ana@Pedeai.local ', 'correta', '10.0.0.1');

    expect(limitador.registrarSucessoLogin).toHaveBeenCalledWith('10.0.0.1', 'ana@pedeai.local');
    expect(resposta.activeCompanyId).toBe('e2');
    expect(resposta.user).toEqual({ id: 'u1', name: 'Ana', email: 'ana@pedeai.local' });
    expect(resposta.companies[0]).toEqual({ id: 'e1', name: 'Alfa', role: Papel.CAIXA });
    expect(resposta.accessToken).toContain('access.');
    expect(prisma.sessao.create).toHaveBeenCalledWith({
      data: { usuarioId: 'u1', empresaAtivaId: 'e2' },
    });
  });

  it('cai na primeira empresa por nome quando a última não tem vínculo ativo', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      nome: 'Ana',
      email: 'ana@pedeai.local',
      senhaHash: '$2b$12$hashed:correta',
      ativo: true,
      ultimaEmpresaId: 'sumiu',
    });
    prisma.usuarioEmpresa.findMany.mockResolvedValue([vinculo('e1', 'Alfa', Papel.ADMIN)]);
    prisma.sessao.create.mockResolvedValue({ id: 's1' });
    const resposta = await service.login('ana@pedeai.local', 'correta', '10.0.0.1');
    expect(resposta.activeCompanyId).toBe('e1');
  });

  it.each([
    ['e-mail inexistente', null, 'errada'],
    ['senha errada', { id: 'u1', senhaHash: '$2b$12$hashed:correta', ativo: true }, 'errada'],
    ['usuário inativo', { id: 'u1', senhaHash: '$2b$12$hashed:correta', ativo: false }, 'correta'],
  ])('responde 401 genérico para %s', async (_caso, cadastrado, senha) => {
    prisma.usuario.findUnique.mockResolvedValue(cadastrado);
    await expect(service.login('ana@pedeai.local', senha, '10.0.0.2')).rejects.toThrow(
      'E-mail ou senha inválidos.',
    );
    expect(limitador.registrarFalhaLogin).toHaveBeenCalled();
  });

  it('responde 401 quando não há vínculo ativo', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      senhaHash: '$2b$12$hashed:correta',
      ativo: true,
      ultimaEmpresaId: null,
    });
    prisma.usuarioEmpresa.findMany.mockResolvedValue([]);
    await expect(service.login('ana@pedeai.local', 'correta', '10.0.0.3')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rotaciona o refresh e invalida a família se o token for reusado', async () => {
    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt1',
      usuarioId: 'u1',
      sessaoId: 's1',
      revogadoEm: null,
      expiraEm: new Date(AGORA + 1000),
      sessao: { empresaAtivaId: 'e1', revogadaEm: null },
    });
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', ativo: true });
    prisma.usuarioEmpresa.findUnique.mockResolvedValue({ papel: Papel.ADMIN, ativo: true });
    prisma.empresa.findUnique.mockResolvedValue({ ativo: true });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt2' });

    const novo = await service.refresh('token-atual');
    expect(novo.refreshToken).not.toBe('token-atual');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt1' }, data: expect.objectContaining({ substituidoPorId: 'rt2' }) }),
    );

    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt1',
      sessaoId: 's1',
      revogadoEm: new Date(),
      sessao: { revogadaEm: null },
    });
    await expect(service.refresh('token-atual')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.sessao.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ revogadaEm: expect.any(Date) }) }),
    );
  });

  it('recusa refresh inexistente, expirado, usuário inativo ou vínculo inativo', async () => {
    prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt',
      usuarioId: 'u1',
      sessaoId: 's1',
      revogadoEm: null,
      expiraEm: new Date(AGORA - 1),
      sessao: { empresaAtivaId: 'e1', revogadaEm: null },
    });
    await expect(service.refresh('velho')).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt',
      usuarioId: 'u1',
      sessaoId: 's1',
      revogadoEm: null,
      expiraEm: new Date(AGORA + 1000),
      sessao: { empresaAtivaId: 'e1', revogadaEm: null },
    });
    prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', ativo: false });
    await expect(service.refresh('inativo')).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt',
      usuarioId: 'u1',
      sessaoId: 's1',
      revogadoEm: null,
      expiraEm: new Date(AGORA + 1000),
      sessao: { empresaAtivaId: 'e1', revogadaEm: null },
    });
    prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', ativo: true });
    prisma.usuarioEmpresa.findUnique.mockResolvedValueOnce({ ativo: false });
    prisma.empresa.findUnique.mockResolvedValueOnce({ ativo: true });
    await expect(service.refresh('sem-vinculo')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revoga a família no logout e recusa token de outro usuário', async () => {
    prisma.refreshToken.findUnique.mockResolvedValueOnce({ id: 'rt', usuarioId: 'u1', sessaoId: 's1' });
    await service.logout('u1', 'token');
    expect(prisma.sessao.update).toHaveBeenCalled();

    prisma.refreshToken.findUnique.mockResolvedValueOnce({ id: 'rt', usuarioId: 'outro', sessaoId: 's9' });
    await expect(service.logout('u1', 'token')).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.refreshToken.findUnique.mockResolvedValueOnce(null);
    await expect(service.logout('u1', 'ausente')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('envia e-mail só para conta com vínculo ativo', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    await service.esqueciSenha('ninguem@pedeai.local', '1.1.1.1');
    expect(mail.enviar).not.toHaveBeenCalled();

    prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'ana@pedeai.local', ativo: false });
    await service.esqueciSenha('ana@pedeai.local', '1.1.1.1');
    expect(mail.enviar).not.toHaveBeenCalled();

    prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'ana@pedeai.local', ativo: true });
    prisma.usuarioEmpresa.findFirst.mockResolvedValueOnce(null);
    await service.esqueciSenha('ana@pedeai.local', '1.1.1.1');
    expect(mail.enviar).not.toHaveBeenCalled();

    prisma.usuario.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'ana@pedeai.local', ativo: true });
    prisma.usuarioEmpresa.findFirst.mockResolvedValueOnce({ id: 'v1' });
    await service.esqueciSenha('ana@pedeai.local', '1.1.1.1');
    expect(mail.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'ana@pedeai.local', token: expect.any(String) }),
    );
  });

  it('redefine a senha, revoga sessões e recusa token de conta desativada', async () => {
    prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValueOnce(null);
    await expect(service.redefinirSenha('x', 'NovaSenha1')).rejects.toBeInstanceOf(BadRequestException);

    prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValueOnce({
      id: 't1',
      usuarioId: 'u1',
      usadoEm: null,
      expiraEm: new Date(AGORA + 1000),
      usuario: { ativo: false },
    });
    prisma.usuarioEmpresa.findFirst.mockResolvedValueOnce(null);
    await expect(service.redefinirSenha('tok', 'NovaSenha1')).rejects.toThrow('Token inválido ou expirado.');
    expect(prisma.tokenRedefinicaoSenha.update).toHaveBeenCalled();

    prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValueOnce({
      id: 't2',
      usuarioId: 'u1',
      usadoEm: null,
      expiraEm: new Date(AGORA + 1000),
      usuario: { ativo: true },
    });
    prisma.usuarioEmpresa.findFirst.mockResolvedValueOnce({ id: 'v1' });
    await service.redefinirSenha('tok-ok', 'NovaSenha1');
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { senhaHash: '$2b$12$hashed:NovaSenha1' } }),
    );
    expect(prisma.sessao.updateMany).toHaveBeenCalled();
  });

  it('recusa token de reset usado ou expirado', async () => {
    prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValueOnce({
      id: 't',
      usadoEm: new Date(),
      expiraEm: new Date(AGORA + 1000),
      usuario: { ativo: true },
    });
    await expect(service.redefinirSenha('usado', 'NovaSenha1')).rejects.toBeInstanceOf(BadRequestException);
    prisma.tokenRedefinicaoSenha.findUnique.mockResolvedValueOnce({
      id: 't',
      usadoEm: null,
      expiraEm: new Date(AGORA - 1),
      usuario: { ativo: true },
    });
    await expect(service.redefinirSenha('expirado', 'NovaSenha1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('troca a senha e preserva só a sessão atual', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', ativo: true, senhaHash: '$2b$12$hashed:atual' });
    await expect(service.trocarSenha(usuarioAuth(), 'errada', 'NovaSenha1')).rejects.toThrow(
      'Senha atual incorreta.',
    );
    await service.trocarSenha(usuarioAuth(), 'atual', 'NovaSenha1');
    expect(prisma.sessao.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 's1' } }) }),
    );
  });

  it('troca a empresa na mesma sessão e esconde empresa sem vínculo', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValueOnce(null);
    await expect(service.trocarEmpresa(usuarioAuth(), 'e9')).rejects.toBeInstanceOf(NotFoundException);

    prisma.usuarioEmpresa.findUnique.mockResolvedValueOnce({
      ativo: true,
      papel: Papel.GARCOM,
      empresa: { ativo: true },
    });
    prisma.sessao.findUnique.mockResolvedValueOnce({ id: 's1', usuarioId: 'u1', revogadaEm: null });
    prisma.refreshToken.findFirst.mockResolvedValueOnce({
      id: 'rt',
      expiraEm: new Date(AGORA + 5000),
    });
    const resposta = await service.trocarEmpresa(usuarioAuth(), 'e2');
    expect(resposta).toMatchObject({ activeCompanyId: 'e2', role: Papel.GARCOM });
    expect(prisma.sessao.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { empresaAtivaId: 'e2' },
    });
    expect(hashToken(resposta.refreshToken)).toEqual(expect.any(String));
  });

  it('recusa troca se a sessão não existe', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue({ ativo: true, papel: Papel.ADMIN, empresa: { ativo: true } });
    prisma.sessao.findUnique.mockResolvedValue(null);
    await expect(service.trocarEmpresa(usuarioAuth(), 'e1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('monta /me com permissões do papel', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', nome: 'Ana', email: 'ana@pedeai.local' });
    prisma.usuarioEmpresa.findMany.mockResolvedValue([vinculo('e1', 'Alfa', Papel.ADMIN)]);
    const eu = await service.eu(usuarioAuth());
    expect(eu.permissions).toContain('usuarios:gerenciar');
    expect(eu.role).toBe(Papel.ADMIN);
    expect(eu.activeCompanyId).toBe('e1');

    prisma.usuario.findUnique.mockResolvedValue(null);
    await expect(service.eu(usuarioAuth())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('troca empresa mesmo sem refresh vigente', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue({
      ativo: true,
      papel: Papel.ADMIN,
      empresa: { ativo: false },
    });
    await expect(service.trocarEmpresa(usuarioAuth(), 'e1')).rejects.toBeInstanceOf(NotFoundException);

    prisma.usuarioEmpresa.findUnique.mockResolvedValue({
      ativo: true,
      papel: Papel.ADMIN,
      empresa: { ativo: true },
    });
    prisma.sessao.findUnique.mockResolvedValue({ id: 's1', usuarioId: 'u1', revogadaEm: null });
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    const resposta = await service.trocarEmpresa(usuarioAuth(), 'e1');
    expect(resposta.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });
});
