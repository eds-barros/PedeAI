import { Papel } from '@prisma/client';

export const PERMISSOES = [
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
] as const;

export type Permissao = (typeof PERMISSOES)[number];

const SEM_GERENTE = new Set<Permissao>(['empresa:editar', 'usuarios:gerenciar']);

export const PERMISSOES_POR_PAPEL: Record<Papel, readonly Permissao[]> = {
  ADMIN: PERMISSOES,
  GERENTE: PERMISSOES.filter((permissao) => !SEM_GERENTE.has(permissao)),
  CAIXA: ['empresa:ler', 'produtos:ler', 'pedidos:ler', 'pedidos:gerenciar', 'pdv:operar', 'caixa:operar'],
  GARCOM: ['empresa:ler', 'produtos:ler', 'pedidos:ler', 'pedidos:gerenciar'],
  COZINHA: ['empresa:ler', 'produtos:ler', 'pedidos:ler', 'cozinha:operar'],
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  CAIXA: 'Caixa',
  GARCOM: 'Garçom',
  COZINHA: 'Cozinha',
};
