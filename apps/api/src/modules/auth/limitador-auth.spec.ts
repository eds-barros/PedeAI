import { MuitasTentativasException } from '../../common/http/muitas-tentativas.exception';
import { LimitadorAuth } from './limitador-auth';
import { Relogio } from './relogio';

describe('LimitadorAuth', () => {
  let agora = 0;
  let limitador: LimitadorAuth;

  beforeEach(() => {
    agora = 1_000_000;
    limitador = new LimitadorAuth({ agora: () => agora } as Relogio);
  });

  it('bloqueia depois de 5 falhas e libera após 15 minutos', () => {
    for (let i = 0; i < 5; i += 1) limitador.registrarFalhaLogin('1.1.1.1', 'a@b.c');
    expect(() => limitador.verificarLogin('1.1.1.1', 'a@b.c')).toThrow(MuitasTentativasException);
    try {
      limitador.verificarLogin('1.1.1.1', 'a@b.c');
    } catch (erro) {
      expect((erro as MuitasTentativasException).retryAfterSeconds).toBeGreaterThan(0);
    }
    agora += 15 * 60 * 1000 + 1;
    expect(() => limitador.verificarLogin('1.1.1.1', 'a@b.c')).not.toThrow();
  });

  it('sucesso zera as falhas', () => {
    limitador.registrarFalhaLogin('1.1.1.1', 'a@b.c');
    limitador.registrarSucessoLogin('1.1.1.1', 'a@b.c');
    for (let i = 0; i < 4; i += 1) limitador.registrarFalhaLogin('1.1.1.1', 'a@b.c');
    expect(() => limitador.verificarLogin('1.1.1.1', 'a@b.c')).not.toThrow();
  });

  it('bloqueia o IP depois de 20 falhas, sem contar login bem-sucedido', () => {
    for (let i = 0; i < 30; i += 1) {
      limitador.verificarLogin('9.9.9.9', 'ok@b.c');
      limitador.registrarSucessoLogin('9.9.9.9', 'ok@b.c');
    }
    expect(() => limitador.verificarLogin('9.9.9.9', 'novo@b.c')).not.toThrow();

    for (let i = 0; i < 20; i += 1) limitador.registrarFalhaLogin('9.9.9.9', `u${i}@b.c`);
    expect(() => limitador.verificarLogin('9.9.9.9', 'novo@b.c')).toThrow(MuitasTentativasException);
  });

  it('limita esqueci-senha a 5 por hora', () => {
    for (let i = 0; i < 5; i += 1) limitador.verificarEsqueciSenha('2.2.2.2');
    expect(() => limitador.verificarEsqueciSenha('2.2.2.2')).toThrow(MuitasTentativasException);
    agora += 60 * 60 * 1000 + 1;
    expect(() => limitador.verificarEsqueciSenha('2.2.2.2')).not.toThrow();
  });

  it('limpar zera os contadores', () => {
    for (let i = 0; i < 5; i += 1) limitador.registrarFalhaLogin('1.1.1.1', 'a@b.c');
    limitador.limpar();
    expect(() => limitador.verificarLogin('1.1.1.1', 'a@b.c')).not.toThrow();
  });
});
