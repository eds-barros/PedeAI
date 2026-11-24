import { Papel } from '@prisma/client';
import { PERMISSOES } from './permissoes';
import { PapeisService } from './papeis.service';
import { PapeisController } from './papeis.controller';

describe('PapeisService', () => {
  const service = new PapeisService();

  it('entrega o catálogo com o recorte de cada papel', () => {
    const lista = service.listar();
    const porPapel = Object.fromEntries(lista.map((item) => [item.role, item.permissions]));
    expect(porPapel[Papel.ADMIN]).toEqual([...PERMISSOES]);
    expect(porPapel[Papel.GERENTE]).not.toContain('empresa:editar');
    expect(porPapel[Papel.GERENTE]).not.toContain('usuarios:gerenciar');
    expect(porPapel[Papel.GERENTE]).toContain('usuarios:ler');
    expect(porPapel[Papel.CAIXA]).toEqual([
      'empresa:ler',
      'produtos:ler',
      'pedidos:ler',
      'pedidos:gerenciar',
      'pdv:operar',
      'caixa:operar',
    ]);
    expect(porPapel[Papel.GARCOM]).toEqual(['empresa:ler', 'produtos:ler', 'pedidos:ler', 'pedidos:gerenciar']);
    expect(porPapel[Papel.COZINHA]).toEqual(['empresa:ler', 'produtos:ler', 'pedidos:ler', 'cozinha:operar']);
    expect(lista.find((item) => item.role === Papel.GARCOM)?.label).toBe('Garçom');
  });

  it('o controller só delega', () => {
    const controller = new PapeisController(service);
    expect(controller.listar()).toHaveLength(5);
  });
});
