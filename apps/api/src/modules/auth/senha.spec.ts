import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS, SenhaForteConstraint, hashSenha, senhaAtendePolitica } from './senha';

describe('política de senha', () => {
  const regra = new SenhaForteConstraint();

  it('exige 8 a 72 caracteres com letra e número', () => {
    expect(senhaAtendePolitica('abc')).toBe(false);
    expect(senhaAtendePolitica('abcdefgh')).toBe(false);
    expect(senhaAtendePolitica('12345678')).toBe(false);
    expect(senhaAtendePolitica('Senha123')).toBe(true);
    expect(senhaAtendePolitica('a'.repeat(73))).toBe(false);
    expect(regra.validate('Senha123')).toBe(true);
    expect(regra.validate(12)).toBe(false);
    expect(regra.defaultMessage()).toContain('8 a 72');
  });

  it('gera hash bcrypt com custo 12', async () => {
    const hash = await hashSenha('Senha123');
    expect(hash.startsWith('$2b$12$')).toBe(true);
    expect(BCRYPT_ROUNDS).toBe(12);
    await expect(bcrypt.compare('Senha123', hash)).resolves.toBe(true);
  });
});
