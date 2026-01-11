import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AnswerSheetController } from './answer-sheet.controller';
import { AnswerSheetService } from './answer-sheet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OcrModule } from '../ocr/ocr.module';

@Module({
    imports: [
        PrismaModule,
        OcrModule,
        BullModule.registerQueue({
            name: 'ocr-processing',
        }),
    ],
    controllers: [AnswerSheetController],
    providers: [AnswerSheetService],
    exports: [AnswerSheetService],
})
export class AnswerSheetModule { }
