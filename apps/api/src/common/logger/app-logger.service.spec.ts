import { ConfigService } from '@nestjs/config';
import { AppLogger } from './app-logger.service';

describe('AppLogger', () => {
  it('redige senha, token e authorization', async () => {
    const logger = new AppLogger({ get: () => 'silent' } as unknown as ConfigService);
    logger.info(
      {
        password: 'segredo',
        body: { newPassword: 'Nova1', refreshToken: 'abc', name: 'Ana' },
        headers: { authorization: 'Bearer xyz' },
      },
      'teste',
    );
    logger.error(new Error('falhou'));
    logger.warn('aviso');
    logger.debug('depure');
    logger.log('linha');
    await new Promise((resolve) => setImmediate(resolve));
    const texto = logger.entradas().join('');
    expect(texto).not.toContain('segredo');
    expect(texto).not.toContain('Nova1');
    expect(texto).not.toContain('Bearer xyz');
    expect(texto).toContain('[Redacted]');
    expect(texto).toContain('Ana');
    logger.limpar();
    expect(logger.entradas()).toHaveLength(0);
  });
});
