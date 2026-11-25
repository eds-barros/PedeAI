import { Injectable } from '@nestjs/common';
import { MailPort, MensagemEmail } from './mail.port';

@Injectable()
export class InMemoryMailAdapter implements MailPort {
  private readonly mensagens: MensagemEmail[] = [];

  async enviar(mensagem: MensagemEmail): Promise<void> {
    this.mensagens.push(mensagem);
  }

  ultimaMensagemPara(email: string): MensagemEmail | undefined {
    const alvo = email.trim().toLowerCase();
    const encontradas = this.mensagens.filter((mensagem) => mensagem.para.toLowerCase() === alvo);
    return encontradas.at(-1);
  }

  limpar(): void {
    this.mensagens.length = 0;
  }
}
