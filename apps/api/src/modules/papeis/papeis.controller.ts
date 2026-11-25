import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { Papeis } from '../../common/tenant/papeis.decorator';
import { PapeisService } from './papeis.service';

@ApiTags('Papéis')
@ApiBearerAuth('access-token')
@Controller('roles')
export class PapeisController {
  constructor(private readonly papeis: PapeisService) {}

  @Get()
  @Papeis(Papel.ADMIN, Papel.GERENTE)
  @ApiOperation({ summary: 'Lista papéis e permissões do catálogo' })
  @ApiOkResponse({
    description: 'Array JSON. Cada item tem role, label e permissions. Não vem embrulhado em {data}.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['role', 'label', 'permissions'],
        properties: {
          role: { type: 'string', example: 'ADMIN' },
          label: { type: 'string', example: 'Administrador' },
          permissions: { type: 'array', items: { type: 'string' } },
        },
      },
      example: [
        {
          role: 'ADMIN',
          label: 'Administrador',
          permissions: ['empresa:ler', 'empresa:editar', 'usuarios:gerenciar'],
        },
        {
          role: 'GERENTE',
          label: 'Gerente',
          permissions: ['empresa:ler', 'usuarios:ler'],
        },
        {
          role: 'CAIXA',
          label: 'Caixa',
          permissions: ['empresa:ler', 'pdv:operar', 'caixa:operar'],
        },
        {
          role: 'GARCOM',
          label: 'Garçom',
          permissions: ['empresa:ler', 'pedidos:gerenciar'],
        },
        {
          role: 'COZINHA',
          label: 'Cozinha',
          permissions: ['empresa:ler', 'cozinha:operar'],
        },
      ],
    },
  })
  listar() {
    return this.papeis.listar();
  }
}
