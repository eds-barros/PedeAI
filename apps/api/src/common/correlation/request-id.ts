import { randomUUID } from 'crypto';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IncomingMessage } from 'http';

export function gerarRequestId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];
  const valor = Array.isArray(header) ? header[0] : header;
  if (typeof valor === 'string' && valor.trim()) {
    return valor.trim();
  }
  return randomUUID();
}

export function criarAdaptadorFastify(): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: true,
    logger: false,
    genReqId: gerarRequestId,
  });
}

export function registrarCorrelacao(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (req, reply, done) => {
    reply.header('X-Request-Id', String(req.id));
    done();
  });
}
