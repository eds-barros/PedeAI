import { Papel } from '@prisma/client';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { InMemoryMailAdapter } from './in-memory-mail.adapter';
import { LogMailAdapter } from './log-mail.adapter';
import { Relogio } from './relogio';
import { AppLogger } from '../../common/logger/app-logger.service';
import { EmpresasController } from '../empresas/empresas.controller';
import { EmpresasService } from '../empresas/empresas.service';
import { UsuariosController } from '../usuarios/usuarios.controller';
import { UsuariosService } from '../usuarios/usuarios.service';

describe('controllers da Sprint 1', () => {
  const auth = {
    login: jest.fn().mockResolvedValue({ accessToken: 'a' }),
    refresh: jest.fn().mockResolvedValue({ accessToken: 'b' }),
    logout: jest.fn().mockResolvedValue(undefined),
    esqueciSenha: jest.fn().mockResolvedValue(undefined),
    redefinirSenha: jest.fn().mockResolvedValue(undefined),
    trocarSenha: jest.fn().mockResolvedValue(undefined),
    trocarEmpresa: jest.fn().mockResolvedValue({ role: Papel.GERENTE }),
    eu: jest.fn().mockResolvedValue({ role: Papel.ADMIN }),
  };
  const usuario = {
    id: 'u',
    email: 'a@b.c',
    empresaId: 'e',
    papel: Papel.ADMIN,
    jti: 'j',
    sid: 's',
  };
  const controller = new AuthController(auth as unknown as AuthService);
  const me = new MeController(auth as unknown as AuthService);

  it('encaminha auth e /me', async () => {
    const req = { headers: { 'x-forwarded-for': '8.8.8.8' }, ip: '127.0.0.1' };
    await controller.login({ email: 'a@b.c', password: 'Senha123' }, req);
    await controller.refresh({ refreshToken: 'r' });
    await controller.logout(usuario, { refreshToken: 'r' });
    await controller.esqueci({ email: 'a@b.c' }, req);
    await controller.redefinir({ token: 't', newPassword: 'NovaSenha1' });
    await controller.trocarSenha(usuario, { currentPassword: 'a', newPassword: 'NovaSenha1' });
    await controller.trocarEmpresa(usuario, { companyId: 'e2' });
    await me.me(usuario);
    expect(auth.login).toHaveBeenCalledWith('a@b.c', 'Senha123', '8.8.8.8');
    expect(auth.eu).toHaveBeenCalledWith(usuario);
  });

  it('encaminha empresa e usuários', async () => {
    const empresas = { atual: jest.fn().mockResolvedValue({ id: 'e' }), atualizar: jest.fn().mockResolvedValue({ id: 'e' }) };
    const empresasController = new EmpresasController(empresas as unknown as EmpresasService);
    await empresasController.atual('e', usuario);
    await empresasController.atualizar('e', { nomeFantasia: 'Nova' });
    expect(empresas.atual).toHaveBeenCalledWith('e', Papel.ADMIN);

    const usuarios = {
      listar: jest.fn().mockResolvedValue({ data: [] }),
      criar: jest.fn().mockResolvedValue({ id: 'u' }),
      buscar: jest.fn().mockResolvedValue({ id: 'u' }),
      atualizar: jest.fn().mockResolvedValue({ id: 'u' }),
      alterarStatus: jest.fn().mockResolvedValue({ id: 'u' }),
    };
    const usuariosController = new UsuariosController(usuarios as unknown as UsuariosService);
    await usuariosController.listar('e', {});
    await usuariosController.criar('e', { name: 'A', email: 'a@b.c', password: 'Senha123', role: Papel.CAIXA });
    await usuariosController.buscar('e', 'u');
    await usuariosController.atualizar('e', 'u', { name: 'B' }, usuario);
    await usuariosController.status('e', 'u', { active: false }, usuario);
    expect(usuarios.listar).toHaveBeenCalledWith('e', {});
    expect(usuarios.alterarStatus).toHaveBeenCalledWith('e', 'u', false, 'u');
  });
});

describe('adaptadores de e-mail e relógio', () => {
  it('guarda a última mensagem em memória', async () => {
    const memoria = new InMemoryMailAdapter();
    await memoria.enviar({ para: 'A@B.c', assunto: 'a', texto: 'um', token: '1' });
    await memoria.enviar({ para: 'a@b.c', assunto: 'b', texto: 'dois', token: '2' });
    expect(memoria.ultimaMensagemPara('a@b.c')?.token).toBe('2');
    memoria.limpar();
    expect(memoria.ultimaMensagemPara('a@b.c')).toBeUndefined();
  });

  it('registra o stub de e-mail sem devolver mensagem', async () => {
    const linhas: unknown[] = [];
    const logger = { info: (entrada: unknown) => linhas.push(entrada) } as unknown as AppLogger;
    const adaptador = new LogMailAdapter(logger);
    await adaptador.enviar({ para: 'a@b.c', assunto: 's', texto: 'corpo', token: 't' });
    expect(linhas[0]).toMatchObject({ para: 'a@b.c', texto: 'corpo' });
    expect(adaptador.ultimaMensagemPara()).toBeUndefined();
    adaptador.limpar();
  });

  it('lê o relógio do sistema', () => {
    expect(new Relogio().agora()).toBeGreaterThan(0);
  });
});
