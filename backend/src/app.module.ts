import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { validarAmbiente } from './config/ambiente';
import { CorrelationIdInterceptor } from './common/correlation/correlation-id.interceptor';
import { FiltroExcecaoHttp } from './common/http/filtro-excecao-http';
import { PipeValidacao } from './common/http/pipe-validacao';
import { LoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/tenant/jwt-auth.guard';
import { RolesGuard } from './common/tenant/roles.guard';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { PapeisModule } from './modules/papeis/papeis.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validarAmbiente,
    }),
    LoggerModule,
    PrismaModule,
    AuthModule,
    EmpresasModule,
    UsuariosModule,
    PapeisModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: PipeValidacao },
    { provide: APP_FILTER, useClass: FiltroExcecaoHttp },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
