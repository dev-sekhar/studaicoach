import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { OcrService } from '../ocr/ocr.service';

export interface OcrJobData {
    answerSheetId: string;
    filePath: string;
    fileType: string;
}

@Processor('ocr-processing')
@Injectable()
export class OcrProcessor {
    constructor(
        private prisma: PrismaService,
        private pdfService: PdfService,
        private ocrService: OcrService,
    ) { }

    onModuleInit() {
        console.log('🎯 OCR Processor initialized and ready to process jobs');
    }

    @Process('extract-text')
    async handleOcrExtraction(job: Job<OcrJobData>) {
        const { answerSheetId, filePath, fileType } = job.data;

        console.log('📝 ========================================');
        console.log(`📝 Starting OCR job for answer sheet: ${answerSheetId}`);
        console.log(`📝 File path: ${filePath}`);
        console.log(`📝 File type: ${fileType}`);
        console.log('📝 ========================================');

        try {
            // Update status to PROCESSING
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: { processingStatus: 'PROCESSING' },
            });
            console.log('✅ Updated status to PROCESSING');

            // Google Cloud Vision can process PDFs directly - no need to convert!
            console.log(`📄 Processing file: ${filePath} (${fileType})`);

            // Process the file directly (works for both PDFs and images)
            const result = await this.ocrService.extractText(filePath);

            const ocrResults = [{
                pageNumber: 1,
                text: result.text,
                confidence: result.confidence,
                blocks: result.blocks,
                isTrustworthy: result.isTrustworthy,
            }];

            // Calculate overall confidence
            const avgConfidence = ocrResults.reduce((sum, r) => sum + r.confidence, 0) / ocrResults.length;
            const isTrustworthy = ocrResults.every(r => r.isTrustworthy);

            console.log(`OCR completed. Average confidence: ${avgConfidence.toFixed(2)}, Trustworthy: ${isTrustworthy}`);

            // Save analysis to database
            const analysis = await this.prisma.answerSheetAnalysis.create({
                data: {
                    answerSheetId,
                    extractedText: {
                        pages: ocrResults,
                        avgConfidence,
                        isTrustworthy,
                    } as any, // Cast to any for Prisma JSON field
                    identifiedTopics: [],
                    evaluation: {},
                    recommendations: {},
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - job.timestamp,
                },
            });

            // Update answer sheet
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: {
                    processingStatus: 'COMPLETED',
                    analysisId: analysis.id,
                },
            });

            console.log(`OCR processing completed for answer sheet: ${answerSheetId}`);

            return {
                success: true,
                analysisId: analysis.id,
                avgConfidence,
                isTrustworthy,
            };
        } catch (error) {
            console.error('❌ ========================================');
            console.error(`❌ OCR processing failed for answer sheet: ${answerSheetId}`);
            console.error('❌ Error details:');
            console.error(error);
            if (error.stack) {
                console.error('❌ Stack trace:');
                console.error(error.stack);
            }
            console.error('❌ ========================================');

            // Update status to FAILED
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: { processingStatus: 'FAILED' },
            });

            throw error;
        }
    }
}
