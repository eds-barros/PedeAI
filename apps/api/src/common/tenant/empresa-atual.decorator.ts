import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UsuarioAutenticado } from './usuario-autenticado';

export function extrairEmpresaAtual(_data: unknown, ctx: ExecutionContext): string {
  const req = ctx.switchToHttp().getRequest<{ user?: UsuarioAutenticado }>();
  if (!req.user?.empresaId) {
    throw new UnauthorizedException('Sessão inválida ou expirada.');
  }
  return req.user.empresaId;
}

export const EmpresaAtual = createParamDecorator(extrairEmpresaAtual);
