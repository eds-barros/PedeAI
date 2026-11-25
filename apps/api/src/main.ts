import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';
import { criarAdaptadorFastify } from './common/correlation/request-id';
import { AppLogger } from './common/logger/app-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, criarAdaptadorFastify(), {
    rawBody: true,
  });
  configurarApp(app);
  app.useLogger(app.get(AppLogger));
  const porta = app.get(ConfigService).get<number>('PORT') ?? 3000;
  await app.listen(porta, '0.0.0.0');
}

void bootstrap();
