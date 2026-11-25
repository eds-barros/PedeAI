import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Papel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsuarioAutenticado } from '../../common/tenant/usuario-autenticado';
import { PERMISSOES_POR_PAPEL } from '../papeis/permissoes';
import { LimitadorAuth } from './limitador-auth';
import { MAIL_PORT, MailPort } from './mail.port';
import { Relogio } from './relogio';
import { compararSenha, hashSenha, hashSenhaDummy } from './senha';
import { gerarTokenOpaco, hashToken, novoId } from './tokens';

const MENSAGEM_LOGIN = 'E-mail ou senha inválidos.';
const MENSAGEM_SESSAO = 'Sessão inválida ou expirada.';
const MENSAGEM_TOKEN = 'Token inválido ou expirado.';
const DIA_MS = 24 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;

type EmpresaResumo = { id: string; nomeFantasia: string };
type VinculoAtivo = {
  empresaId: string;
  papel: Papel;
  empresa: EmpresaResumo;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly limitador: LimitadorAuth,
    private readonly relogio: Relogio,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  async login(email: string, senha: string, ip: string) {
    const emailNorm = email.trim().toLowerCase();
    this.limitador.verificarLogin(ip, emailNorm);

    const usuario = await this.prisma.usuario.findUnique({ where: { email: emailNorm } });
    const hash = usuario?.senhaHash ?? (await hashSenhaDummy());
    const senhaOk = await compararSenha(senha, hash);
    if (!usuario || !senhaOk || !usuario.ativo) {
      this.limitador.registrarFalhaLogin(ip, emailNorm);
      throw new UnauthorizedException(MENSAGEM_LOGIN);
    }

    const vinculos = await this.vinculosAtivos(usuario.id);
    if (vinculos.length === 0) {
      this.limitador.registrarFalhaLogin(ip, emailNorm);
      throw new UnauthorizedException(MENSAGEM_LOGIN);
    }

    const preferida = usuario.ultimaEmpresaId
      ? vinculos.find((vinculo) => vinculo.empresaId === usuario.ultimaEmpresaId)
      : undefined;
    const escolhido = preferida ?? vinculos[0];
    this.limitador.registrarSucessoLogin(ip, emailNorm);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimaEmpresaId: escolhido.empresaId },
    });
    const sessao = await this.prisma.sessao.create({
      data: { usuarioId: usuario.id, empresaAtivaId: escolhido.empresaId },
    });
    const tokens = await this.emitir({
      usuarioId: usuario.id,
      empresaId: escolhido.empresaId,
      papel: escolhido.papel,
      sessaoId: sessao.id,
    });

    return {
      ...tokens,
      user: { id: usuario.id, name: usuario.nome, email: usuario.email },
      companies: vinculos.map((vinculo) => ({
        id: vinculo.empresa.id,
        name: vinculo.empresa.nomeFantasia,
        role: vinculo.papel,
      })),
      activeCompanyId: escolhido.empresaId,
    };
  }

  async refresh(refreshToken: string) {
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { sessao: true },
    });
    if (!registro) throw new UnauthorizedException(MENSAGEM_SESSAO);
    if (registro.revogadoEm || registro.sessao.revogadaEm) {
      await this.revogarFamilia(registro.sessaoId);
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }
    if (registro.expiraEm.getTime() <= this.relogio.agora()) {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id: registro.usuarioId } });
    if (!usuario?.ativo) throw new UnauthorizedException(MENSAGEM_SESSAO);

    const empresaId = registro.sessao.empresaAtivaId;
    const vinculo = await this.prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId } },
    });
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!vinculo?.ativo || !empresa?.ativo) {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }

    const novoRefresh = gerarTokenOpaco();
    const jti = novoId();
    const agora = new Date(this.relogio.agora());
    const criado = await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        sessaoId: registro.sessaoId,
        tokenHash: hashToken(novoRefresh),
        accessJti: jti,
        expiraEm: registro.expiraEm,
      },
    });
    await this.prisma.refreshToken.update({
      where: { id: registro.id },
      data: { revogadoEm: agora, substituidoPorId: criado.id },
    });
    const accessToken = await this.assinar({
      sub: usuario.id,
      empresaId,
      papel: vinculo.papel,
      jti,
      sid: registro.sessaoId,
    });
    return { accessToken, refreshToken: novoRefresh };
  }

  async logout(usuarioId: string, refreshToken: string): Promise<void> {
    const registro = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!registro || registro.usuarioId !== usuarioId) {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }
    await this.revogarFamilia(registro.sessaoId);
  }

  async esqueciSenha(email: string, ip: string): Promise<void> {
    this.limitador.verificarEsqueciSenha(ip);
    const emailNorm = email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { email: emailNorm } });
    if (!usuario?.ativo) return;

    const vinculoAtivo = await this.prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: usuario.id, ativo: true, empresa: { ativo: true } },
    });
    if (!vinculoAtivo) return;

    const token = gerarTokenOpaco();
    const agora = new Date(this.relogio.agora());
    await this.prisma.tokenRedefinicaoSenha.updateMany({
      where: { usuarioId: usuario.id, usadoEm: null },
      data: { usadoEm: agora },
    });
    await this.prisma.tokenRedefinicaoSenha.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hashToken(token),
        expiraEm: new Date(this.relogio.agora() + HORA_MS),
      },
    });
    const base = this.config.get<string>('APP_URL') ?? 'http://localhost:3001';
    await this.mail.enviar({
      para: usuario.email,
      assunto: 'Redefinição de senha — PedeAI',
      texto: `Use o link para redefinir sua senha (válido por 1 hora): ${base}/redefinir-senha?token=${token}`,
      token,
    });
  }

  async redefinirSenha(token: string, novaSenha: string): Promise<void> {
    const registro = await this.prisma.tokenRedefinicaoSenha.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: true },
    });
    if (!registro || registro.usadoEm || registro.expiraEm.getTime() <= this.relogio.agora()) {
      throw new BadRequestException(MENSAGEM_TOKEN);
    }

    const vinculoAtivo = await this.prisma.usuarioEmpresa.findFirst({
      where: { usuarioId: registro.usuarioId, ativo: true, empresa: { ativo: true } },
    });
    const agora = new Date(this.relogio.agora());
    if (!registro.usuario.ativo || !vinculoAtivo) {
      await this.prisma.tokenRedefinicaoSenha.update({
        where: { id: registro.id },
        data: { usadoEm: agora },
      });
      throw new BadRequestException(MENSAGEM_TOKEN);
    }

    const senhaHash = await hashSenha(novaSenha);
    await this.prisma.$transaction([
      this.prisma.tokenRedefinicaoSenha.update({
        where: { id: registro.id },
        data: { usadoEm: agora },
      }),
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash },
      }),
      this.prisma.sessao.updateMany({
        where: { usuarioId: registro.usuarioId, revogadaEm: null },
        data: { revogadaEm: agora },
      }),
      this.prisma.refreshToken.updateMany({
        where: { usuarioId: registro.usuarioId, revogadoEm: null },
        data: { revogadoEm: agora },
      }),
    ]);
  }

  async trocarSenha(usuario: UsuarioAutenticado, atual: string, nova: string): Promise<void> {
    const registro = await this.prisma.usuario.findUnique({ where: { id: usuario.id } });
    if (!registro?.ativo) throw new UnauthorizedException(MENSAGEM_SESSAO);
    const ok = await compararSenha(atual, registro.senhaHash);
    if (!ok) throw new BadRequestException('Senha atual incorreta.');

    const senhaHash = await hashSenha(nova);
    const agora = new Date(this.relogio.agora());
    await this.prisma.$transaction([
      this.prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash } }),
      this.prisma.sessao.updateMany({
        where: { usuarioId: usuario.id, id: { not: usuario.sid }, revogadaEm: null },
        data: { revogadaEm: agora },
      }),
      this.prisma.refreshToken.updateMany({
        where: { usuarioId: usuario.id, sessaoId: { not: usuario.sid }, revogadoEm: null },
        data: { revogadoEm: agora },
      }),
    ]);
  }

  async trocarEmpresa(usuario: UsuarioAutenticado, companyId: string) {
    const vinculo = await this.prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId: companyId } },
      include: { empresa: true },
    });
    if (!vinculo?.ativo || !vinculo.empresa.ativo) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const sessao = await this.prisma.sessao.findUnique({ where: { id: usuario.sid } });
    if (!sessao || sessao.revogadaEm || sessao.usuarioId !== usuario.id) {
      throw new UnauthorizedException(MENSAGEM_SESSAO);
    }

    const atual = await this.prisma.refreshToken.findFirst({
      where: { sessaoId: sessao.id, revogadoEm: null },
      orderBy: { criadoEm: 'desc' },
    });
    const novoRefresh = gerarTokenOpaco();
    const jti = novoId();
    const agora = new Date(this.relogio.agora());
    const expiraEm =
      atual?.expiraEm ?? new Date(this.relogio.agora() + this.diasRefresh() * DIA_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.sessao.update({
        where: { id: sessao.id },
        data: { empresaAtivaId: companyId },
      });
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { ultimaEmpresaId: companyId },
      });
      const criado = await tx.refreshToken.create({
        data: {
          usuarioId: usuario.id,
          sessaoId: sessao.id,
          tokenHash: hashToken(novoRefresh),
          accessJti: jti,
          expiraEm,
        },
      });
      if (atual) {
        await tx.refreshToken.update({
          where: { id: atual.id },
          data: { revogadoEm: agora, substituidoPorId: criado.id },
        });
      }
    });

    const accessToken = await this.assinar({
      sub: usuario.id,
      empresaId: companyId,
      papel: vinculo.papel,
      jti,
      sid: sessao.id,
    });
    return {
      accessToken,
      refreshToken: novoRefresh,
      activeCompanyId: companyId,
      role: vinculo.papel,
    };
  }

  async eu(usuario: UsuarioAutenticado) {
    const registro = await this.prisma.usuario.findUnique({ where: { id: usuario.id } });
    if (!registro) throw new UnauthorizedException(MENSAGEM_SESSAO);
    const vinculos = await this.vinculosAtivos(usuario.id);
    return {
      user: { id: registro.id, name: registro.nome, email: registro.email },
      companies: vinculos.map((vinculo) => ({
        id: vinculo.empresa.id,
        name: vinculo.empresa.nomeFantasia,
        role: vinculo.papel,
      })),
      activeCompanyId: usuario.empresaId,
      role: usuario.papel,
      permissions: [...PERMISSOES_POR_PAPEL[usuario.papel]],
    };
  }

  private async vinculosAtivos(usuarioId: string): Promise<VinculoAtivo[]> {
    return this.prisma.usuarioEmpresa.findMany({
      where: { usuarioId, ativo: true, empresa: { ativo: true } },
      include: { empresa: { select: { id: true, nomeFantasia: true } } },
      orderBy: { empresa: { nomeFantasia: 'asc' } },
    });
  }

  private async emitir(dados: {
    usuarioId: string;
    empresaId: string;
    papel: Papel;
    sessaoId: string;
  }) {
    const jti = novoId();
    const refreshToken = gerarTokenOpaco();
    await this.prisma.refreshToken.create({
      data: {
        usuarioId: dados.usuarioId,
        sessaoId: dados.sessaoId,
        tokenHash: hashToken(refreshToken),
        accessJti: jti,
        expiraEm: new Date(this.relogio.agora() + this.diasRefresh() * DIA_MS),
      },
    });
    const accessToken = await this.assinar({
      sub: dados.usuarioId,
      empresaId: dados.empresaId,
      papel: dados.papel,
      jti,
      sid: dados.sessaoId,
    });
    return { accessToken, refreshToken };
  }

  private assinar(payload: {
    sub: string;
    empresaId: string;
    papel: Papel;
    jti: string;
    sid: string;
  }): Promise<string> {
    return this.jwt.signAsync(payload);
  }

  private diasRefresh(): number {
    return Number(this.config.get('JWT_REFRESH_TTL_DAYS') ?? 7);
  }

  private async revogarFamilia(sessaoId: string): Promise<void> {
    const agora = new Date(this.relogio.agora());
    await this.prisma.$transaction([
      this.prisma.sessao.update({ where: { id: sessaoId }, data: { revogadaEm: agora } }),
      this.prisma.refreshToken.updateMany({
        where: { sessaoId, revogadoEm: null },
        data: { revogadoEm: agora },
      }),
    ]);
  }
}
