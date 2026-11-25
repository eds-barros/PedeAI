import { Papel } from '@prisma/client';

export type UsuarioAutenticado = {
  id: string;
  email: string;
  empresaId: string;
  papel: Papel;
  jti: string;
  sid: string;
};

export type AccessPayload = {
  sub: string;
  empresaId: string;
  papel: Papel;
  jti: string;
  sid: string;
};
