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

    @Process('extract-text')
    async handleOcrExtraction(job: Job<OcrJobData>) {
        const { answerSheetId, filePath, fileType } = job.data;

        console.log(`Processing OCR for answer sheet: ${answerSheetId}`);

        try {
            // Update status to PROCESSING
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: { processingStatus: 'PROCESSING' },
            });

            let imagePaths: string[] = [];

            // Convert PDF to images if needed
            if (fileType === 'application/pdf') {
                console.log('Converting PDF to images...');
                imagePaths = await this.pdfService.convertToImages(filePath);
            } else {
                // Already an image
                imagePaths = [filePath];
            }

            console.log(`Processing ${imagePaths.length} image(s)...`);

            // Process each page/image
            const ocrResults = [];

            for (let i = 0; i < imagePaths.length; i++) {
                const imagePath = imagePaths[i];
                console.log(`Extracting text from page ${i + 1}...`);

                const result = await this.ocrService.extractText(imagePath);
                ocrResults.push({
                    pageNumber: i + 1,
                    text: result.text,
                    confidence: result.confidence,
                    blocks: result.blocks,
                    isTrustworthy: result.isTrustworthy,
                });
            }

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
                    },
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

            // Clean up temporary image files (if PDF was converted)
            if (fileType === 'application/pdf' && imagePaths.length > 0) {
                await this.pdfService.cleanupImages(imagePaths);
            }

            console.log(`OCR processing completed for answer sheet: ${answerSheetId}`);

            return {
                success: true,
                analysisId: analysis.id,
                avgConfidence,
                isTrustworthy,
            };
        } catch (error) {
            console.error(`OCR processing failed for answer sheet: ${answerSheetId}`, error);

            // Update status to FAILED
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: { processingStatus: 'FAILED' },
            });

            throw error;
        }
    }
}
