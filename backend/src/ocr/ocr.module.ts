import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { OcrService } from './ocr.service';
import { OcrProcessor } from './ocr.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        PdfModule,
        BullModule.registerQueue({
            name: 'ocr-processing',
        }),
    ],
    providers: [OcrService, OcrProcessor],
    exports: [OcrService, BullModule],
})
export class OcrModule { }
