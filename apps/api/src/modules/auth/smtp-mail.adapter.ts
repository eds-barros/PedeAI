import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../common/logger/app-logger.service';
import { MailPort, MensagemEmail } from './mail.port';

@Injectable()
export class SmtpMailAdapter implements MailPort {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  async enviar(mensagem: MensagemEmail): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn(
        { para: mensagem.para, assunto: mensagem.assunto },
        'SMTP_HOST ausente; e-mail não enviado.',
      );
      return;
    }
    const nodemailer = await import('nodemailer');
    const usuario = this.config.get<string>('SMTP_USER');
    const transporte = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: usuario
        ? { user: usuario, pass: this.config.get<string>('SMTP_PASS') ?? '' }
        : undefined,
    });
    await transporte.sendMail({
      from: this.config.get<string>('SMTP_FROM') ?? 'nao-responda@pedeai.local',
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
    });
  }

  ultimaMensagemPara(): undefined {
    return undefined;
  }

  limpar(): void {
    return undefined;
  }
}
