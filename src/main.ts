import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // ── Security Headers ───────────────────────────────────────
  app.use(helmet());

  // ── Serve uploaded files ───────────────────────────────────
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // ── Global API prefix (/api/*) ─────────────────────────────
  app.setGlobalPrefix('api');

  // ── Global Validation Pipe ─────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── CORS (configurable via env) ─────────────────────────────
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string>('CORS_ORIGINS', '');
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3003',
        'https://hazeclue.netlify.app',
      ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // ── Port from env ──────────────────────────────────────────
  const port = config.get<number>('PORT', 3001);

  await app.listen(port);
  logger.log(`🚀 Haze Clue API running on http://localhost:${port}/api`);
}
bootstrap();
