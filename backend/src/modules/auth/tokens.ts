import { createHash, randomBytes, randomUUID } from 'crypto';

export function gerarTokenOpaco(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function novoId(): string {
  return randomUUID();
}
