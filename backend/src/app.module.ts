import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AnswerSheetModule } from './answer-sheets/answer-sheet.module';
import { SubjectModule } from './subjects/subject.module';
import { BoardModule } from './boards/board.module';
import { QueueModule } from './queue/queue.module';
import { OcrModule } from './ocr/ocr.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
        limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      },
    ]),

    // Database
    PrismaModule,

    // Queue
    QueueModule,

    // Feature modules
    AuthModule,
    AnswerSheetModule,
    SubjectModule,
    BoardModule,
    OcrModule, // Added OCR module to register the processor
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
