import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { InMemoryMailAdapter } from './in-memory-mail.adapter';
import { LimitadorAuth } from './limitador-auth';
import { LogMailAdapter } from './log-mail.adapter';
import { afirmarMailAdapterPermitido, resolverMailAdapter } from './mail-selecao';
import { MAIL_PORT, MailPort } from './mail.port';
import { Relogio } from './relogio';
import { SmtpMailAdapter } from './smtp-mail.adapter';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_TTL') ?? '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    LimitadorAuth,
    Relogio,
    InMemoryMailAdapter,
    LogMailAdapter,
    SmtpMailAdapter,
    {
      provide: MAIL_PORT,
      useFactory: (memoria: InMemoryMailAdapter, log: LogMailAdapter, smtp: SmtpMailAdapter): MailPort => {
        const tipo = resolverMailAdapter(process.env.NODE_ENV);
        afirmarMailAdapterPermitido(tipo, process.env.NODE_ENV);
        if (tipo === 'memory') return memoria;
        if (tipo === 'smtp') return smtp;
        return log;
      },
      inject: [InMemoryMailAdapter, LogMailAdapter, SmtpMailAdapter],
    },
  ],
  exports: [AuthService, JwtModule, MAIL_PORT, LimitadorAuth],
})
export class AuthModule {}
