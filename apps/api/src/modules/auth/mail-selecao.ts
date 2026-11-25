export type TipoMailAdapter = 'memory' | 'log' | 'smtp';

export function resolverMailAdapter(nodeEnv: string | undefined): TipoMailAdapter {
  if (nodeEnv === 'test') return 'memory';
  if (nodeEnv === 'production') return 'smtp';
  return 'log';
}

export function afirmarMailAdapterPermitido(tipo: TipoMailAdapter, nodeEnv: string | undefined): void {
  if (tipo === 'memory' && nodeEnv !== 'test') {
    throw new Error('InMemoryMailAdapter só pode ser registrado com NODE_ENV=test.');
  }
}
