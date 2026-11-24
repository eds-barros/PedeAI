import { Body, Controller, Get, HttpCode, Patch, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/tenant/public.decorator';
import { UsuarioAtual } from '../../common/tenant/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../common/tenant/usuario-autenticado';
import { AuthService } from './auth.service';
import {
  EsqueciSenhaDto,
  LoginDto,
  RedefinirSenhaDto,
  RefreshDto,
  TrocarEmpresaDto,
  TrocarSenhaDto,
} from './dto/auth.dto';
import { ipDaRequisicao } from './ip';

const EXEMPLO_LOGIN = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.exemplo',
  refreshToken: 'refresh-opaco-exemplo',
  user: { id: '11111111-1111-4111-8111-000000000001', name: 'Admin Pizzaria', email: 'admin.pizzaria@pedeai.local' },
  companies: [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Pizzaria Bella Napoli', role: 'ADMIN' },
  ],
  activeCompanyId: '11111111-1111-4111-8111-111111111111',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Entra com e-mail e senha' })
  @ApiOkResponse({ description: 'Tokens e empresas do usuário.', schema: { example: EXEMPLO_LOGIN } })
  @ApiUnauthorizedResponse({
    schema: { example: { statusCode: 401, message: 'E-mail ou senha inválidos.' } },
  })
  login(@Body() dto: LoginDto, @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> }) {
    return this.auth.login(dto.email, dto.password, ipDaRequisicao(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotaciona o refresh token' })
  @ApiOkResponse({
    schema: { example: { accessToken: 'novo-access', refreshToken: 'novo-refresh' } },
  })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoga a sessão do refresh token informado' })
  @ApiNoContentResponse({ description: 'Sessão revogada.' })
  logout(@UsuarioAtual() usuario: UsuarioAutenticado, @Body() dto: RefreshDto): Promise<void> {
    return this.auth.logout(usuario.id, dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Solicita redefinição de senha sem revelar se o e-mail existe' })
  @ApiNoContentResponse({ description: 'Sempre 204, exista ou não o e-mail.' })
  esqueci(
    @Body() dto: EsqueciSenhaDto,
    @Req() req: { ip?: string; headers?: Record<string, string | string[] | undefined> },
  ): Promise<void> {
    return this.auth.esqueciSenha(dto.email, ipDaRequisicao(req));
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @ApiOperation({ summary: 'Redefine a senha com o token enviado' })
  @ApiNoContentResponse({ description: 'Senha alterada e sessões revogadas.' })
  redefinir(@Body() dto: RedefinirSenhaDto): Promise<void> {
    return this.auth.redefinirSenha(dto.token, dto.newPassword);
  }

  @Patch('change-password')
  @HttpCode(204)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Troca a senha da sessão atual e revoga as demais' })
  @ApiNoContentResponse({ description: 'Senha alterada.' })
  trocarSenha(@UsuarioAtual() usuario: UsuarioAutenticado, @Body() dto: TrocarSenhaDto): Promise<void> {
    return this.auth.trocarSenha(usuario, dto.currentPassword, dto.newPassword);
  }

  @Post('switch-company')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Troca a empresa ativa da sessão e reemite os tokens' })
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'novo-access',
        refreshToken: 'novo-refresh',
        activeCompanyId: '22222222-2222-4222-8222-222222222222',
        role: 'GERENTE',
      },
    },
  })
  trocarEmpresa(@UsuarioAtual() usuario: UsuarioAutenticado, @Body() dto: TrocarEmpresaDto) {
    return this.auth.trocarEmpresa(usuario, dto.companyId);
  }
}

@ApiTags('Auth')
@ApiBearerAuth('access-token')
@Controller()
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Usuário autenticado, empresas, papel e permissões' })
  @ApiOkResponse({
    schema: {
      example: {
        user: { id: '11111111-1111-4111-8111-000000000001', name: 'Admin Pizzaria', email: 'admin.pizzaria@pedeai.local' },
        companies: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Pizzaria Bella Napoli', role: 'ADMIN' }],
        activeCompanyId: '11111111-1111-4111-8111-111111111111',
        role: 'ADMIN',
        permissions: ['empresa:ler', 'usuarios:gerenciar'],
      },
    },
  })
  me(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.auth.eu(usuario);
  }
}
