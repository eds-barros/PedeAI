import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UsuarioAutenticado } from './usuario-autenticado';

export function extrairUsuarioAtual(_data: unknown, ctx: ExecutionContext): UsuarioAutenticado {
  const req = ctx.switchToHttp().getRequest<{ user?: UsuarioAutenticado }>();
  if (!req.user?.id || !req.user.empresaId || !req.user.sid || !req.user.jti) {
    throw new UnauthorizedException('Sessão inválida ou expirada.');
  }
  return req.user;
}

export const UsuarioAtual = createParamDecorator(extrairUsuarioAtual);
