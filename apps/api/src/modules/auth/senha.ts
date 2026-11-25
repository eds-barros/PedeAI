import bcrypt from 'bcrypt';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export const BCRYPT_ROUNDS = 12;
const SENHA_DUMMY = 'dummy-pedeai-nao-usar';
let hashDummyCache: Promise<string> | null = null;

export function senhaAtendePolitica(senha: string): boolean {
  if (senha.length < 8 || senha.length > 72) return false;
  return /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

export function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, BCRYPT_ROUNDS);
}

export function compararSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function hashSenhaDummy(): Promise<string> {
  if (!hashDummyCache) {
    hashDummyCache = bcrypt.hash(SENHA_DUMMY, BCRYPT_ROUNDS);
  }
  return hashDummyCache;
}

@ValidatorConstraint({ name: 'senhaForte', async: false })
export class SenhaForteConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && senhaAtendePolitica(value);
  }

  defaultMessage(): string {
    return 'A senha deve ter de 8 a 72 caracteres, com pelo menos uma letra e um número.';
  }
}
