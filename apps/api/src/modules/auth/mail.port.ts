export const MAIL_PORT = Symbol('MAIL_PORT');

export type MensagemEmail = {
  para: string;
  assunto: string;
  texto: string;
  token?: string;
};

export interface MailPort {
  enviar(mensagem: MensagemEmail): Promise<void>;
  ultimaMensagemPara(email: string): MensagemEmail | undefined;
  limpar(): void;
}
