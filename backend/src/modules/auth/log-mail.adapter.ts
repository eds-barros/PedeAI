import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../common/logger/app-logger.service';
import { MailPort, MensagemEmail } from './mail.port';

@Injectable()
export class LogMailAdapter implements MailPort {
  constructor(private readonly logger: AppLogger) {}

  async enviar(mensagem: MensagemEmail): Promise<void> {
    this.logger.info(
      { para: mensagem.para, assunto: mensagem.assunto, texto: mensagem.texto },
      'E-mail não enviado (stub). Conteúdo registrado apenas no log.',
    );
  }

  ultimaMensagemPara(): undefined {
    return undefined;
  }

  limpar(): void {
    return undefined;
  }
}
