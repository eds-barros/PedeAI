import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { EmpresaAtual } from '../../common/tenant/empresa-atual.decorator';
import { Papeis } from '../../common/tenant/papeis.decorator';
import { UsuarioAtual } from '../../common/tenant/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../common/tenant/usuario-autenticado';
import { AtualizarEmpresaDto } from './dto/empresas.dto';
import { EmpresasService } from './empresas.service';

@ApiTags('Empresas')
@ApiBearerAuth('access-token')
@Controller('companies')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  @Get('current')
  @ApiOperation({ summary: 'Empresa ativa. O cadastro completo só vai para Admin e Gerente.' })
  @ApiOkResponse({
    description: 'Caixa, garçom e cozinha recebem só id, nomeFantasia, slug e logoUrl.',
    schema: {
      example: {
        id: '11111111-1111-4111-8111-111111111111',
        nomeFantasia: 'Pizzaria Bella Napoli',
        slug: 'pizzaria-bella-napoli',
        logoUrl: null,
        razaoSocial: 'Pizzaria Bella Napoli Ltda',
        cnpj: '11222333000181',
        telefone: '1133334444',
        email: 'contato@pizzaria.local',
        endereco: 'Rua das Pizzas, 100',
      },
    },
  })
  atual(@EmpresaAtual() empresaId: string, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.empresas.atual(empresaId, usuario.papel);
  }

  @Patch('current')
  @Papeis(Papel.ADMIN)
  @ApiOperation({ summary: 'Atualiza o cadastro da empresa ativa. CNPJ e slug não mudam.' })
  @ApiOkResponse({ description: 'Cadastro atualizado.' })
  atualizar(@EmpresaAtual() empresaId: string, @Body() dto: AtualizarEmpresaDto) {
    return this.empresas.atualizar(empresaId, dto);
  }
}
