import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MuitasTentativasException } from '../../common/http/muitas-tentativas.exception';
import { Relogio } from './relogio';

const JANELA_ESQUECI_MS = 60 * 60 * 1000;
const MAX_ESQUECI = 5;

type BaldeFalha = { falhas: number[]; bloqueadoAte?: number };

type LimitesLogin = {
  maxFalhasEmail: number;
  maxFalhasIp: number;
  janelaMs: number;
};

@Injectable()
export class LimitadorAuth {
  private readonly falhas = new Map<string, BaldeFalha>();
  private readonly porIp = new Map<string, number[]>();
  private readonly esqueci = new Map<string, number[]>();

  constructor(
    private readonly relogio: Relogio,
    private readonly config?: ConfigService,
  ) {}

  verificarLogin(ip: string, email: string): void {
    const agora = this.relogio.agora();
    const limites = this.limites();
    const chave = this.chave(ip, email);
    const balde = this.falhas.get(chave);
    if (balde?.bloqueadoAte && balde.bloqueadoAte > agora) {
      throw new MuitasTentativasException(this.segundos(balde.bloqueadoAte - agora));
    }
    if (balde?.bloqueadoAte && balde.bloqueadoAte <= agora) {
      this.falhas.delete(chave);
    }

    const doIp = this.podar(this.porIp.get(ip) ?? [], agora, limites.janelaMs);
    this.porIp.set(ip, doIp);
    if (doIp.length >= limites.maxFalhasIp) {
      const libera = doIp[0] + limites.janelaMs;
      throw new MuitasTentativasException(this.segundos(libera - agora));
    }
  }

  registrarFalhaLogin(ip: string, email: string): void {
    const agora = this.relogio.agora();
    const limites = this.limites();
    const chave = this.chave(ip, email);
    const balde = this.falhas.get(chave) ?? { falhas: [] };
    balde.falhas = this.podar(balde.falhas, agora, limites.janelaMs);
    balde.falhas.push(agora);
    if (balde.falhas.length >= limites.maxFalhasEmail) {
      balde.bloqueadoAte = agora + limites.janelaMs;
    }
    this.falhas.set(chave, balde);

    const doIp = this.podar(this.porIp.get(ip) ?? [], agora, limites.janelaMs);
    doIp.push(agora);
    this.porIp.set(ip, doIp);
  }

  registrarSucessoLogin(ip: string, email: string): void {
    this.falhas.delete(this.chave(ip, email));
  }

  verificarEsqueciSenha(ip: string): void {
    const agora = this.relogio.agora();
    const registros = this.podar(this.esqueci.get(ip) ?? [], agora, JANELA_ESQUECI_MS);
    registros.push(agora);
    this.esqueci.set(ip, registros);
    if (registros.length > MAX_ESQUECI) {
      const libera = registros[0] + JANELA_ESQUECI_MS;
      throw new MuitasTentativasException(this.segundos(libera - agora));
    }
  }

  limpar(): void {
    this.falhas.clear();
    this.porIp.clear();
    this.esqueci.clear();
  }

  private limites(): LimitesLogin {
    const email = Number(this.config?.get('LOGIN_MAX_FALHAS_EMAIL') ?? 5);
    const ip = Number(this.config?.get('LOGIN_MAX_FALHAS_IP') ?? 20);
    const minutos = Number(this.config?.get('LOGIN_JANELA_MIN') ?? 15);
    return {
      maxFalhasEmail: Number.isFinite(email) && email > 0 ? email : 5,
      maxFalhasIp: Number.isFinite(ip) && ip > 0 ? ip : 20,
      janelaMs: (Number.isFinite(minutos) && minutos > 0 ? minutos : 15) * 60 * 1000,
    };
  }

  private chave(ip: string, email: string): string {
    return `${ip}\n${email}`;
  }

  private podar(valores: number[], agora: number, janela: number): number[] {
    return valores.filter((marca) => agora - marca < janela);
  }

  private segundos(ms: number): number {
    return Math.max(1, Math.ceil(ms / 1000));
  }
}
