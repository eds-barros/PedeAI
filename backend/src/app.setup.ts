import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { registrarCorrelacao } from './common/correlation/request-id';

export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  const config = app.get(ConfigService);
  const origens = String(config.get('CORS_ORIGIN') ?? '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origens.includes('*') ? true : origens,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });
  registrarCorrelacao(app as NestFastifyApplication);

  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('PedeAI API')
      .setDescription('API de gestão para estabelecimentos alimentícios. Sprint 1.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, documento, {
    ui: process.env.NODE_ENV !== 'test',
  });
}
