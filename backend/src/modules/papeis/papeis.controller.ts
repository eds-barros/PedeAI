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
    description: 'Catálogo para o formulário de usuário.',
    schema: {
      example: [
        {
          role: 'ADMIN',
          label: 'Administrador',
          permissions: ['empresa:ler', 'empresa:editar', 'usuarios:gerenciar'],
        },
      ],
    },
  })
  listar() {
    return this.papeis.listar();
  }
}
