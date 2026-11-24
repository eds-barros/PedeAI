import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Papel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { extrairEmpresaAtual, extrairUsuarioAtual, Papeis, Public } from './index';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PAPEIS_KEY } from './papeis.decorator';
import { RolesGuard } from './roles.guard';
import { UsuarioAutenticado } from './usuario-autenticado';

function contexto(req: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => function handler() {},
    getClass: () => class Controlador {},
  } as unknown as ExecutionContext;
}

const usuario = (parcial: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado => ({
  id: 'u1',
  email: 'a@b.c',
  empresaId: 'e1',
  papel: Papel.ADMIN,
  jti: 'j1',
  sid: 's1',
  ...parcial,
});

describe('decorators de tenant', () => {
  it('expõe usuário e empresa e recusa sessão ausente', () => {
    expect(Public()).toBeDefined();
    expect(Papeis(Papel.ADMIN)).toBeDefined();
    const req = { user: usuario() };
    expect(extrairUsuarioAtual(undefined, contexto(req)).id).toBe('u1');
    expect(extrairEmpresaAtual(undefined, contexto(req))).toBe('e1');
    expect(() => extrairUsuarioAtual(undefined, contexto({}))).toThrow(UnauthorizedException);
    expect(() => extrairEmpresaAtual(undefined, contexto({ user: { id: 'x' } }))).toThrow(
      UnauthorizedException,
    );
  });
});

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  it('libera rota pública, rota sem papel e papel permitido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true);
    expect(guard.canActivate(contexto({}))).toBe(true);

    (reflector.getAllAndOverride as jest.Mock).mockImplementation((chave: string) =>
      chave === IS_PUBLIC_KEY ? false : undefined,
    );
    expect(guard.canActivate(contexto({ user: usuario() }))).toBe(true);

    (reflector.getAllAndOverride as jest.Mock).mockImplementation((chave: string) => {
      if (chave === IS_PUBLIC_KEY) return false;
      if (chave === PAPEIS_KEY) return [Papel.ADMIN];
      return undefined;
    });
    expect(guard.canActivate(contexto({ user: usuario() }))).toBe(true);
  });

  it('nega papel insuficiente', () => {
    (reflector.getAllAndOverride as jest.Mock).mockImplementation((chave: string) => {
      if (chave === IS_PUBLIC_KEY) return false;
      if (chave === PAPEIS_KEY) return [Papel.ADMIN];
      return undefined;
    });
    expect(() => guard.canActivate(contexto({ user: usuario({ papel: Papel.GARCOM }) }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(contexto({}))).toThrow(ForbiddenException);
  });
});

describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
  const prisma = {
    sessao: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    usuarioEmpresa: { findUnique: jest.fn() },
    empresa: { findUnique: jest.fn() },
  };
  const guard = new JwtAuthGuard(reflector, jwt, prisma as unknown as PrismaService);
  const payload = { sub: 'u1', empresaId: 'e1', papel: Papel.CAIXA, jti: 'j1', sid: 's1' };

  beforeEach(() => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (jwt.verifyAsync as jest.Mock).mockResolvedValue(payload);
    prisma.sessao.findUnique.mockResolvedValue({
      id: 's1',
      usuarioId: 'u1',
      empresaAtivaId: 'e1',
      revogadaEm: null,
    });
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', ativo: true });
    prisma.usuarioEmpresa.findUnique.mockResolvedValue({ papel: Papel.GERENTE, ativo: true });
    prisma.empresa.findUnique.mockResolvedValue({ id: 'e1', ativo: true });
  });

  it('libera rota pública', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    await expect(guard.canActivate(contexto({}))).resolves.toBe(true);
  });

  it('revalida sessão, usuário e vínculo e usa o papel do banco', async () => {
    const req: { headers: { authorization: string }; user?: UsuarioAutenticado } = {
      headers: { authorization: 'Bearer token' },
    };
    await expect(guard.canActivate(contexto(req))).resolves.toBe(true);
    expect(req.user).toEqual({
      id: 'u1',
      email: 'a@b.c',
      empresaId: 'e1',
      papel: Papel.GERENTE,
      jti: 'j1',
      sid: 's1',
    });
  });

  it.each([
    ['sem bearer', { headers: {} }, async (): Promise<void> => undefined],
    ['jwt inválido', { headers: { authorization: 'Bearer x' } }, async () => (jwt.verifyAsync as jest.Mock).mockRejectedValue(new Error('x'))],
    ['claim ausente', { headers: { authorization: 'Bearer x' } }, async () => (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'u1' })],
    ['sessão revogada', { headers: { authorization: 'Bearer x' } }, async () => prisma.sessao.findUnique.mockResolvedValue({ id: 's1', usuarioId: 'u1', empresaAtivaId: 'e1', revogadaEm: new Date() })],
    ['empresa da sessão diferente', { headers: { authorization: 'Bearer x' } }, async () => prisma.sessao.findUnique.mockResolvedValue({ id: 's1', usuarioId: 'u1', empresaAtivaId: 'outra', revogadaEm: null })],
    ['usuário inativo', { headers: { authorization: 'Bearer x' } }, async () => prisma.usuario.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', ativo: false })],
    ['vínculo inativo', { headers: { authorization: 'Bearer x' } }, async () => prisma.usuarioEmpresa.findUnique.mockResolvedValue({ papel: Papel.ADMIN, ativo: false })],
    ['empresa inativa', { headers: { authorization: 'Bearer x' } }, async () => prisma.empresa.findUnique.mockResolvedValue({ id: 'e1', ativo: false })],
  ])('responde 401 quando %s', async (_nome, req, preparar) => {
    await preparar();
    await expect(guard.canActivate(contexto(req))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
