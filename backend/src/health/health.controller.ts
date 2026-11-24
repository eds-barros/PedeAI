import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/tenant/public.decorator';

@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Saúde da API' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
