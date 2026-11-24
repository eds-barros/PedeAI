jest.mock('../auth/senha', () => ({
  hashSenha: jest.fn(async (valor: string) => `hash:${valor}`),
  senhaAtendePolitica: jest.fn(() => true),
}));

import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { hashSenha } from '../auth/senha';
import { Papel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  const prisma = {
    usuario: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    usuarioEmpresa: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const service = new UsuariosService(prisma as unknown as PrismaService);
  const quando = new Date('2026-01-02T00:00:00.000Z');
  const vinculo = (parcial: Record<string, unknown> = {}) => ({
    id: 'v1',
    papel: Papel.CAIXA,
    ativo: true,
    atualizadoEm: quando,
    usuario: {
      id: 'u1',
      nome: 'Caixa',
      email: 'caixa@pedeai.local',
      ativo: true,
      criadoEm: new Date('2026-01-01T00:00:00.000Z'),
      atualizadoEm: quando,
    },
    ...parcial,
  });

  beforeEach(() => jest.clearAllMocks());

  it('lista sempre filtrando pela empresa ativa', async () => {
    prisma.usuarioEmpresa.count.mockResolvedValue(1);
    prisma.usuarioEmpresa.findMany.mockResolvedValue([vinculo()]);
    const pagina = await service.listar('emp-1', { search: 'cai', role: Papel.CAIXA, active: true, page: 1, pageSize: 10 });
    expect(pagina.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(prisma.usuarioEmpresa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'emp-1', papel: Papel.CAIXA, ativo: true }),
      }),
    );
  });

  it('lista inativos e página vazia', async () => {
    prisma.usuarioEmpresa.count.mockResolvedValue(0);
    prisma.usuarioEmpresa.findMany.mockResolvedValue([]);
    const pagina = await service.listar('emp-1', { active: false, search: '   ' });
    expect(pagina.meta.totalPages).toBe(0);
    expect(prisma.usuarioEmpresa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ empresaId: 'emp-1', ativo: false }) }),
    );
  });

  it('não vincula e-mail que já existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'existente' });
    await expect(
      service.criar('emp-1', { name: 'Maria', email: 'Maria@Pedeai.local', password: 'Senha123', role: Papel.CAIXA }),
    ).rejects.toThrow(new ConflictException('Não foi possível cadastrar este e-mail.'));
    expect(hashSenha).toHaveBeenCalledWith('Senha123');
    expect((hashSenha as unknown as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      prisma.usuario.findUnique.mock.invocationCallOrder[0],
    );
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('cria usuário novo só na empresa do token', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockResolvedValue({
      id: 'u9',
      nome: 'Maria',
      email: 'maria@pedeai.local',
      criadoEm: new Date('2026-01-01T00:00:00.000Z'),
      atualizadoEm: quando,
      vinculos: [{ papel: Papel.CAIXA, ativo: true, atualizadoEm: quando }],
    });
    const criado = await service.criar('emp-1', {
      name: ' Maria ',
      email: 'Maria@Pedeai.local',
      password: 'Senha123',
      role: Papel.CAIXA,
    });
    expect(criado).toMatchObject({ id: 'u9', email: 'maria@pedeai.local', role: Papel.CAIXA, active: true });
    expect(prisma.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vinculos: { create: { empresaId: 'emp-1', papel: Papel.CAIXA, ativo: true } },
        }),
      }),
    );
  });

  it('retorna 404 de outra empresa e 200 de vínculo desativado', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValueOnce(null);
    await expect(service.buscar('emp-1', 'u-outra')).rejects.toBeInstanceOf(NotFoundException);
    prisma.usuarioEmpresa.findUnique.mockResolvedValueOnce(vinculo({ ativo: false }));
    await expect(service.buscar('emp-1', 'u1')).resolves.toMatchObject({ active: false });
  });

  it('impede remover o último admin e altera os demais', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(vinculo({ papel: Papel.ADMIN }));
    prisma.usuarioEmpresa.count.mockResolvedValue(1);
    await expect(service.alterarStatus('emp-1', 'u1', false, 'outro')).rejects.toThrow(/administrador ativo/);
    await expect(service.atualizar('emp-1', 'u1', { role: Papel.GERENTE }, 'outro')).rejects.toThrow(
      /administrador ativo/,
    );

    prisma.usuarioEmpresa.count.mockResolvedValue(2);
    prisma.usuarioEmpresa.update.mockResolvedValue({});
    prisma.usuario.update.mockResolvedValue({});
    prisma.usuarioEmpresa.findUnique
      .mockResolvedValueOnce(vinculo({ papel: Papel.ADMIN }))
      .mockResolvedValueOnce(vinculo({ papel: Papel.GERENTE, ativo: false }));
    const atualizado = await service.alterarStatus('emp-1', 'u1', false, 'outro');
    expect(atualizado.active).toBe(false);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    expect(prisma.usuarioEmpresa.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { ativo: false } });
  });

  it('atualiza nome sem mexer no papel', async () => {
    prisma.usuarioEmpresa.findUnique
      .mockResolvedValueOnce(vinculo())
      .mockResolvedValueOnce(
        vinculo({
          usuario: {
            id: 'u1',
            nome: 'Novo',
            email: 'caixa@pedeai.local',
            ativo: true,
            criadoEm: new Date('2026-01-01T00:00:00.000Z'),
            atualizadoEm: quando,
          },
        }),
      );
    prisma.usuario.update.mockResolvedValue({});
    const resposta = await service.atualizar('emp-1', 'u1', { name: ' Novo ' }, 'outro');
    expect(resposta.name).toBe('Novo');
    expect(prisma.usuarioEmpresa.update).not.toHaveBeenCalled();
  });

  it('reativa vínculo sem exigir outro admin', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(vinculo({ papel: Papel.ADMIN, ativo: false }));
    prisma.usuarioEmpresa.update.mockResolvedValue({});
    await service.alterarStatus('emp-1', 'u1', true, 'outro');
    expect(prisma.usuarioEmpresa.count).not.toHaveBeenCalled();
  });

  it('impede alterar o próprio papel ou desativar o próprio vínculo', async () => {
    prisma.usuarioEmpresa.findUnique.mockResolvedValue(vinculo({ papel: Papel.ADMIN }));
    await expect(service.atualizar('emp-1', 'u1', { role: Papel.GERENTE }, 'u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.alterarStatus('emp-1', 'u1', false, 'u1')).rejects.toThrow(
      'Você não pode alterar o próprio papel ou status.',
    );
    expect(prisma.usuarioEmpresa.count).not.toHaveBeenCalled();
  });
});
