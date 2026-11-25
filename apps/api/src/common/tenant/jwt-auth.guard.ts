import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AccessPayload, UsuarioAutenticado } from './usuario-autenticado';

export const MENSAGEM_SESSAO = 'Sessão inválida ou expirada.';

function bearer(authorization?: string): string | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice('Bearer '.length).trim();
  return token || undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publico) return true;

    const req = context.switchToHttp().getRequest();
    const token = bearer(req.headers?.authorization);
    if (!token) throw new UnauthorizedException(MENSAGEM_SESSAO);

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }

    if (!payload?.sub || !payload.empresaId || !payload.papel || !payload.jti || !payload.sid) {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }

    const sessao = await this.prisma.sessao.findUnique({ where: { id: payload.sid } });
    if (
      !sessao ||
      sessao.revogadaEm ||
      sessao.usuarioId !== payload.sub ||
      sessao.empresaAtivaId !== payload.empresaId
    ) {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario?.ativo) throw new UnauthorizedException(MENSAGEM_SESSAO);

    const vinculo = await this.prisma.usuarioEmpresa.findUnique({
      where: {
        usuarioId_empresaId: { usuarioId: usuario.id, empresaId: payload.empresaId },
      },
    });
    if (!vinculo?.ativo) throw new UnauthorizedException(MENSAGEM_SESSAO);

    const empresa = await this.prisma.empresa.findUnique({ where: { id: payload.empresaId } });
    if (!empresa?.ativo) throw new UnauthorizedException(MENSAGEM_SESSAO);

    const autenticado: UsuarioAutenticado = {
      id: usuario.id,
      email: usuario.email,
      empresaId: payload.empresaId,
      papel: vinculo.papel,
      jti: payload.jti,
      sid: payload.sid,
    };
    req.user = autenticado;
    return true;
  }
}
