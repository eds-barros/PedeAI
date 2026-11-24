import { NotFoundException } from '@nestjs/common';
import { Papel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmpresasService } from './empresas.service';

const empresa = {
  id: 'e1',
  nomeFantasia: 'Pizzaria',
  slug: 'pizzaria',
  logoUrl: null,
  razaoSocial: 'Pizzaria Ltda',
  cnpj: '11222333000181',
  telefone: '119999',
  email: 'a@b.c',
  endereco: 'Rua 1',
  ativo: true,
};

describe('EmpresasService', () => {
  const prisma = {
    empresa: { findFirst: jest.fn(), update: jest.fn() },
  };
  const service = new EmpresasService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('esconde o cadastro completo de quem não é admin nem gerente', async () => {
    prisma.empresa.findFirst.mockResolvedValue(empresa);
    const caixa = await service.atual('e1', Papel.CAIXA);
    expect(caixa).toEqual({ id: 'e1', nomeFantasia: 'Pizzaria', slug: 'pizzaria', logoUrl: null });
    expect(caixa).not.toHaveProperty('cnpj');
    const admin = await service.atual('e1', Papel.ADMIN);
    expect(admin).toMatchObject({ razaoSocial: 'Pizzaria Ltda', cnpj: '11222333000181' });
    const gerente = await service.atual('e1', Papel.GERENTE);
    expect(gerente).toHaveProperty('endereco');
  });

  it('responde 404 quando a empresa ativa não existe', async () => {
    prisma.empresa.findFirst.mockResolvedValue(null);
    await expect(service.atual('e1', Papel.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('atualiza só os campos enviados e não mexe em slug ou cnpj', async () => {
    prisma.empresa.findFirst.mockResolvedValue(empresa);
    prisma.empresa.update.mockResolvedValue({ ...empresa, nomeFantasia: 'Nova' });
    const resposta = await service.atualizar('e1', { nomeFantasia: ' Nova ', email: 'A@B.c' });
    expect(prisma.empresa.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { nomeFantasia: 'Nova', email: 'a@b.c' },
    });
    expect(resposta).toMatchObject({ nomeFantasia: 'Nova', cnpj: '11222333000181' });
    await service.atualizar('e1', {
      razaoSocial: ' Nova Ltda ',
      telefone: ' 119 ',
      endereco: ' Rua 2 ',
      logoUrl: ' https://cdn/logo.png ',
    });
    expect(prisma.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: {
        razaoSocial: 'Nova Ltda',
        telefone: '119',
        endereco: 'Rua 2',
        logoUrl: 'https://cdn/logo.png',
      },
    });
  });
});
