import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Papel, Prisma, Usuario, UsuarioEmpresa } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { hashSenha } from '../auth/senha';
import { AtualizarUsuarioDto, CriarUsuarioDto, ListarUsuariosQueryDto } from './dto/usuarios.dto';

const MENSAGEM_EMAIL = 'Não foi possível cadastrar este e-mail.';
const MENSAGEM_ULTIMO_ADMIN = 'A empresa precisa ter ao menos um administrador ativo.';

type UsuarioResposta = {
  id: string;
  name: string;
  email: string;
  role: Papel;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const MENSAGEM_PROPRIO = 'Você não pode alterar o próprio papel ou status.';

type VinculoComUsuario = UsuarioEmpresa & { usuario: Usuario };

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: string, query: ListarUsuariosQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = this.filtro(empresaId, query);
    const [total, vinculos] = await this.prisma.$transaction([
      this.prisma.usuarioEmpresa.count({ where }),
      this.prisma.usuarioEmpresa.findMany({
        where,
        include: { usuario: true },
        orderBy: { usuario: { nome: 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      data: vinculos.map((vinculo) => this.mapear(vinculo)),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async buscar(empresaId: string, usuarioId: string): Promise<UsuarioResposta> {
    const vinculo = await this.obterVinculo(empresaId, usuarioId);
    return this.mapear(vinculo);
  }

  async criar(empresaId: string, dto: CriarUsuarioDto): Promise<UsuarioResposta> {
    const email = dto.email.trim().toLowerCase();
    const senhaHash = await hashSenha(dto.password);
    const existente = await this.prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      throw new ConflictException(MENSAGEM_EMAIL);
    }
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.name.trim(),
        email,
        senhaHash,
        ativo: true,
        vinculos: {
          create: { empresaId, papel: dto.role, ativo: true },
        },
      },
      include: { vinculos: true },
    });
    return this.mapear({ ...usuario.vinculos[0], usuario });
  }

  async atualizar(
    empresaId: string,
    usuarioId: string,
    dto: AtualizarUsuarioDto,
    atorId: string,
  ): Promise<UsuarioResposta> {
    const vinculo = await this.obterVinculo(empresaId, usuarioId);
    const mudaPapel = dto.role !== undefined && dto.role !== vinculo.papel;
    this.afirmarNaoAlteraASi(atorId, usuarioId, mudaPapel, false);
    if (mudaPapel) {
      await this.afirmarNaoEhUltimoAdmin(empresaId, vinculo, dto.role !== Papel.ADMIN);
    }
    if (dto.name !== undefined) {
      await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { nome: dto.name.trim() },
      });
    }
    if (dto.role !== undefined) {
      await this.prisma.usuarioEmpresa.update({
        where: { id: vinculo.id },
        data: { papel: dto.role },
      });
    }
    return this.buscar(empresaId, usuarioId);
  }

  async alterarStatus(
    empresaId: string,
    usuarioId: string,
    active: boolean,
    atorId: string,
  ): Promise<UsuarioResposta> {
    const vinculo = await this.obterVinculo(empresaId, usuarioId);
    this.afirmarNaoAlteraASi(atorId, usuarioId, false, !active);
    if (!active) {
      await this.afirmarNaoEhUltimoAdmin(empresaId, vinculo, true);
    }
    await this.prisma.usuarioEmpresa.update({
      where: { id: vinculo.id },
      data: { ativo: active },
    });
    return this.buscar(empresaId, usuarioId);
  }

  private filtro(empresaId: string, query: ListarUsuariosQueryDto): Prisma.UsuarioEmpresaWhereInput {
    const busca = query.search?.trim();
    const where: Prisma.UsuarioEmpresaWhereInput = { empresaId };
    if (query.role) where.papel = query.role;
    if (query.active === true) where.ativo = true;
    if (query.active === false) where.ativo = false;
    if (busca) {
      where.usuario = {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          { email: { contains: busca, mode: 'insensitive' } },
        ],
      };
    }
    return where;
  }

  private async obterVinculo(empresaId: string, usuarioId: string): Promise<VinculoComUsuario> {
    const vinculo = await this.prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
      include: { usuario: true },
    });
    if (!vinculo) throw new NotFoundException('Usuário não encontrado.');
    return vinculo;
  }

  private async afirmarNaoEhUltimoAdmin(
    empresaId: string,
    vinculo: VinculoComUsuario,
    deixaraDeSerAdminAtivo: boolean,
  ): Promise<void> {
    const eraAdminAtivo = vinculo.papel === Papel.ADMIN && vinculo.ativo && vinculo.usuario.ativo;
    if (!eraAdminAtivo || !deixaraDeSerAdminAtivo) return;
    const total = await this.prisma.usuarioEmpresa.count({
      where: {
        empresaId,
        papel: Papel.ADMIN,
        ativo: true,
        usuario: { ativo: true },
      },
    });
    if (total <= 1) throw new ConflictException(MENSAGEM_ULTIMO_ADMIN);
  }

  private afirmarNaoAlteraASi(atorId: string, usuarioId: string, mudaPapel: boolean, desativa: boolean): void {
    if (atorId === usuarioId && (mudaPapel || desativa)) {
      throw new ForbiddenException(MENSAGEM_PROPRIO);
    }
  }

  private mapear(vinculo: VinculoComUsuario): UsuarioResposta {
    const atualizado =
      vinculo.atualizadoEm > vinculo.usuario.atualizadoEm ? vinculo.atualizadoEm : vinculo.usuario.atualizadoEm;
    return {
      id: vinculo.usuario.id,
      name: vinculo.usuario.nome,
      email: vinculo.usuario.email,
      role: vinculo.papel,
      active: vinculo.ativo,
      createdAt: vinculo.usuario.criadoEm.toISOString(),
      updatedAt: atualizado.toISOString(),
    };
  }
}
