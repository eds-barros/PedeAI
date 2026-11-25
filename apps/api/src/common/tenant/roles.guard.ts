import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '@prisma/client';
import { PAPEIS_KEY } from './papeis.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UsuarioAutenticado } from './usuario-autenticado';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publico) return true;

    const exigidos = this.reflector.getAllAndOverride<Papel[]>(PAPEIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!exigidos?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: UsuarioAutenticado }>();
    if (!req.user || !exigidos.includes(req.user.papel)) {
      throw new ForbiddenException('Você não tem permissão para esta ação.');
    }
    return true;
  }
}
