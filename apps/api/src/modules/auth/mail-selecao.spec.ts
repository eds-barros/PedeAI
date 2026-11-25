import { afirmarMailAdapterPermitido, resolverMailAdapter } from './mail-selecao';

describe('seleção do adapter de e-mail', () => {
  it('usa memória só em teste, log em dev e SMTP em produção', () => {
    expect(resolverMailAdapter('test')).toBe('memory');
    expect(resolverMailAdapter('development')).toBe('log');
    expect(resolverMailAdapter(undefined)).toBe('log');
    expect(resolverMailAdapter('production')).toBe('smtp');
  });

  it('recusa registrar a memória fora de teste', () => {
    expect(() => afirmarMailAdapterPermitido('memory', 'production')).toThrow(/NODE_ENV=test/);
    expect(() => afirmarMailAdapterPermitido('memory', 'test')).not.toThrow();
    expect(() => afirmarMailAdapterPermitido('smtp', 'production')).not.toThrow();
  });
});