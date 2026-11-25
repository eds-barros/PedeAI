import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { EmpresaAtual } from '../../common/tenant/empresa-atual.decorator';
import { Papeis } from '../../common/tenant/papeis.decorator';
import { UsuarioAtual } from '../../common/tenant/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../common/tenant/usuario-autenticado';
import { AtualizarUsuarioDto, CriarUsuarioDto, ListarUsuariosQueryDto, StatusUsuarioDto } from './dto/usuarios.dto';
import { UsuariosService } from './usuarios.service';

const UUID = new ParseUUIDPipe({
  version: '4',
  exceptionFactory: () => new BadRequestException('Identificador inválido.'),
});

const EXEMPLO_USUARIO = {
  id: '11111111-1111-4111-8111-000000000003',
  name: 'Caixa Pizzaria',
  email: 'caixa.pizzaria@pedeai.local',
  role: 'CAIXA',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

@ApiTags('Usuários')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @Papeis(Papel.ADMIN, Papel.GERENTE)
  @ApiOperation({ summary: 'Lista usuários da empresa ativa' })
  @ApiOkResponse({
    description: 'Lista vazia devolve data [] e meta.totalPages 0.',
    content: {
      'application/json': {
        examples: {
          comRegistros: {
            value: {
              data: [EXEMPLO_USUARIO],
              meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            },
          },
          vazia: {
            value: {
              data: [],
              meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            },
          },
        },
      },
    },
  })
  listar(@EmpresaAtual() empresaId: string, @Query() query: ListarUsuariosQueryDto) {
    return this.usuarios.listar(empresaId, query);
  }

  @Post()
  @Papeis(Papel.ADMIN)
  @ApiOperation({ summary: 'Cria usuário na empresa ativa' })
  @ApiCreatedResponse({ schema: { example: EXEMPLO_USUARIO } })
  criar(@EmpresaAtual() empresaId: string, @Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar(empresaId, dto);
  }

  @Get(':id')
  @Papeis(Papel.ADMIN, Papel.GERENTE)
  @ApiOperation({ summary: 'Consulta usuário da empresa ativa, inclusive desativado' })
  @ApiOkResponse({ schema: { example: EXEMPLO_USUARIO } })
  buscar(
    @EmpresaAtual() empresaId: string,
    @Param('id', UUID) id: string,
  ) {
    return this.usuarios.buscar(empresaId, id);
  }

  @Patch(':id')
  @Papeis(Papel.ADMIN)
  @ApiOperation({
    summary: 'Altera nome ou papel na empresa ativa',
    description:
      'Quem tenta mudar o próprio papel recebe 403, inclusive o último Admin. O 409 só ocorre se outro ator fosse rebaixar o último Admin ativo.',
  })
  @ApiOkResponse({ schema: { example: EXEMPLO_USUARIO } })
  @ApiForbiddenResponse({
    description: 'Auto-alteração de papel. A checagem roda antes da regra do último Admin.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Você não pode alterar o próprio papel ou status.',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Defesa em profundidade: outro ator rebaixaria o último Admin ativo.',
    schema: {
      example: {
        statusCode: 409,
        message: 'A empresa precisa ter ao menos um administrador ativo.',
      },
    },
  })
  atualizar(
    @EmpresaAtual() empresaId: string,
    @Param('id', UUID) id: string,
    @Body() dto: AtualizarUsuarioDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.usuarios.atualizar(empresaId, id, dto, usuario.id);
  }

  @Patch(':id/status')
  @Papeis(Papel.ADMIN)
  @ApiOperation({
    summary: 'Ativa ou desativa o vínculo na empresa ativa',
    description:
      'Quem tenta desativar o próprio vínculo recebe 403, inclusive o último Admin. O 409 só ocorre se outro ator fosse desativar o último Admin ativo.',
  })
  @ApiOkResponse({ schema: { example: { ...EXEMPLO_USUARIO, active: false } } })
  @ApiForbiddenResponse({
    description: 'Auto-desativação. A checagem roda antes da regra do último Admin.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Você não pode alterar o próprio papel ou status.',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Defesa em profundidade: outro ator desativaria o último Admin ativo.',
    schema: {
      example: {
        statusCode: 409,
        message: 'A empresa precisa ter ao menos um administrador ativo.',
      },
    },
  })
  status(
    @EmpresaAtual() empresaId: string,
    @Param('id', UUID) id: string,
    @Body() dto: StatusUsuarioDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.usuarios.alterarStatus(empresaId, id, dto.active, usuario.id);
  }
}
