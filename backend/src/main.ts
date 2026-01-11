import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API Documentation
  if (process.env.ENABLE_API_DOCS === 'true') {
    const config = new DocumentBuilder()
      .setTitle('StudAICoach API')
      .setDescription('AI-native student assessment platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('students', 'Student operations')
      .addTag('answer-sheets', 'Answer sheet processing')
      .addTag('progress', 'Progress tracking')
      .addTag('feedback', 'User feedback system')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(process.env.SWAGGER_PATH || 'api/docs', app, document);
  }

  const port = process.env.API_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 StudAICoach API running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
