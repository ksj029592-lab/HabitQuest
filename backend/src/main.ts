/**
 * 메인 애플리케이션 부트스트랩
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  });

  // 전역 파이프 (검증)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HabitQuest API')
      .setDescription('HabitQuest MVP 백엔드 API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  // 서버 시작
  const port = process.env.PORT || 3001;
  await app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📖 API Docs at http://localhost:${port}/api-docs`);
  });
}

bootstrap();
