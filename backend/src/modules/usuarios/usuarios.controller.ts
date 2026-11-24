import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
    schema: {
      example: {
        data: [EXEMPLO_USUARIO],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
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
  @ApiOperation({ summary: 'Altera nome ou papel na empresa ativa' })
  @ApiOkResponse({ schema: { example: EXEMPLO_USUARIO } })
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
  @ApiOperation({ summary: 'Ativa ou desativa o vínculo na empresa ativa' })
  @ApiOkResponse({ schema: { example: { ...EXEMPLO_USUARIO, active: false } } })
  status(
    @EmpresaAtual() empresaId: string,
    @Param('id', UUID) id: string,
    @Body() dto: StatusUsuarioDto,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.usuarios.alterarStatus(empresaId, id, dto.active, usuario.id);
  }
}
