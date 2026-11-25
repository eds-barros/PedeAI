import { hashToken, gerarTokenOpaco, novoId } from './tokens';
import { ipDaRequisicao } from './ip';
import { assertPodeRodarSeed } from '../../../prisma/seed';

describe('tokens e ip', () => {
  it('gera token opaco e hash estável', () => {
    const token = gerarTokenOpaco();
    expect(token.length).toBeGreaterThan(20);
    expect(hashToken(token)).toHaveLength(64);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(novoId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lê o IP do encaminhamento ou do socket', () => {
    expect(ipDaRequisicao({ headers: { 'x-forwarded-for': '10.0.0.8, 10.0.0.1' } })).toBe('10.0.0.8');
    expect(ipDaRequisicao({ headers: { 'x-forwarded-for': ['10.1.1.1'] } })).toBe('10.1.1.1');
    expect(ipDaRequisicao({ ip: '127.0.0.1', headers: {} })).toBe('127.0.0.1');
    expect(ipDaRequisicao({ headers: {} })).toBe('desconhecido');
  });

  it('recusa seed em produção', () => {
    expect(() => assertPodeRodarSeed('production')).toThrow(/production/);
    expect(() => assertPodeRodarSeed('test')).not.toThrow();
  });
});
