import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassThrough } from 'stream';
import pino, { Logger } from 'pino';

const CAMINHOS_REDACT = [
  'password',
  'newPassword',
  'currentPassword',
  'refreshToken',
  'accessToken',
  'authorization',
  'token',
  '*.password',
  '*.newPassword',
  '*.currentPassword',
  '*.refreshToken',
  '*.accessToken',
  '*.authorization',
  '*.token',
  'body.password',
  'body.newPassword',
  'body.currentPassword',
  'body.refreshToken',
  'body.accessToken',
  'body.token',
  'headers.authorization',
  'req.headers.authorization',
];

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: Logger;
  private readonly linhas: string[] = [];

  constructor(config?: ConfigService) {
    const nivelSaida = config?.get<string>('LOG_LEVEL') ?? process.env.LOG_LEVEL ?? 'info';
    const captura = new PassThrough();
    captura.on('data', (pedaço: Buffer) => {
      this.linhas.push(pedaço.toString());
    });
    this.logger = pino(
      {
        level: 'debug',
        redact: { paths: CAMINHOS_REDACT, censor: '[Redacted]' },
      },
      pino.multistream([
        { level: nivelSaida as pino.Level, stream: process.stdout },
        { level: 'debug', stream: captura },
      ]),
    );
  }

  entradas(): string[] {
    return [...this.linhas];
  }

  limpar(): void {
    this.linhas.length = 0;
  }

  info(objeto: unknown, mensagem?: string): void {
    this.escrever('info', objeto, mensagem);
  }

  log(mensagem: unknown, ...opcional: unknown[]): void {
    this.escrever('info', mensagem, opcional[0]);
  }

  error(mensagem: unknown, ...opcional: unknown[]): void {
    this.escrever('error', mensagem, opcional[0]);
  }

  warn(mensagem: unknown, ...opcional: unknown[]): void {
    this.escrever('warn', mensagem, opcional[0]);
  }

  debug(mensagem: unknown, ...opcional: unknown[]): void {
    this.escrever('debug', mensagem, opcional[0]);
  }

  verbose(mensagem: unknown, ...opcional: unknown[]): void {
    this.escrever('debug', mensagem, opcional[0]);
  }

  private escrever(nivel: 'info' | 'error' | 'warn' | 'debug', objeto: unknown, mensagem?: unknown): void {
    const texto = typeof mensagem === 'string' ? mensagem : undefined;
    if (objeto instanceof Error) {
      this.logger[nivel]({ err: objeto }, texto ?? objeto.message);
      return;
    }
    if (typeof objeto === 'object' && objeto !== null) {
      this.logger[nivel](objeto, texto);
      return;
    }
    this.logger[nivel](texto ? `${String(objeto)} ${texto}` : String(objeto));
  }
}
