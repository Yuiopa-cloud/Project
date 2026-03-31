import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  const isProd = process.env.NODE_ENV === 'production';
  const fromEnv =
    process.env.FRONTEND_URL?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const explicitOrigins = Array.from(
    new Set([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...fromEnv,
    ]),
  );
  app.enableCors({
    // Dev: reflect any Origin (LAN IP, other ports) so direct API calls still work if needed.
    origin: isProd
      ? explicitOrigins.length
        ? explicitOrigins
        : true
      : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Atlas Auto Morocco API')
    .setDescription('E-commerce API — automotive accessories, MAD, COD-first.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
}

bootstrap();
