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

    async onModuleInit() {
        console.log('🎯 OCR Processor initialized and ready to process jobs');
        await this.cleanupStuckJobs();
    }

    /**
     * Finds any jobs stuck in PROCESSING status (e.g., due to server crash)
     * and marks them as FAILED so they can be retried.
     */
    private async cleanupStuckJobs() {
        try {
            console.log('🧹 Checking for stuck OCR jobs...');
            const stuckJobs = await this.prisma.answerSheet.updateMany({
                where: {
                    processingStatus: 'PROCESSING',
                },
                data: {
                    processingStatus: 'FAILED',
                    notes: 'OCR Error: Processing was interrupted (server restart)',
                },
            });
            if (stuckJobs.count > 0) {
                console.log(`🧹 Marked ${stuckJobs.count} stuck jobs as FAILED`);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup stuck jobs:', error.message);
        }
    }

    @Process('extract-text')
    async handleOcrExtraction(job: Job<OcrJobData>) {
        const { answerSheetId, filePath, fileType } = job.data;

        // Set a timeout for the entire job to prevent infinite processing
        const jobTimeout = setTimeout(async () => {
            console.error(`🕒 Job for ${answerSheetId} timed out in processor`);
            try {
                await this.prisma.answerSheet.update({
                    where: { id: answerSheetId },
                    data: {
                        processingStatus: 'FAILED',
                        notes: 'OCR Error: Processing timed out (over 10 minutes)'
                    },
                });
            } catch (e) {
                console.error('Failed to update status on timeout:', e.message);
            }
        }, 600000); // 10 minutes

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

            // Fetch context for Analysis (Board, Grade, Subject)
            const answerSheetRequest = await this.prisma.answerSheet.findUnique({
                where: { id: answerSheetId },
                include: {
                    student: true,
                    subject: true
                }
            });

            const context = {
                board: answerSheetRequest?.student?.board?.toString(),
                grade: answerSheetRequest?.student?.grade?.toString(),
                subject: answerSheetRequest?.subject?.name,
                preprocess: true // Enable preprocessing by default for better quality
            };

            // Process the file directly (works for both PDFs and images)
            const result = await this.ocrService.extractText(filePath, {
                subject: context.subject,
                preprocess: context.preprocess
            });

            // NEW: Update status to indicate Analysis phase
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: { notes: "AI Coach is Analyzing Performance..." }
            });


            // NEW: Perform separate Analysis Step with Context
            const analysisResult = await this.ocrService.performAnalysis(filePath, context);

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

            // Save analysis to database (using upsert to avoid unique constraint errors on retries)
            const analysis = await this.prisma.answerSheetAnalysis.upsert({
                where: { answerSheetId },
                create: {
                    answerSheetId,
                    extractedText: ocrResults as any,
                    identifiedTopics: analysisResult.topics || [],
                    evaluation: analysisResult.evaluation || {},
                    recommendations: analysisResult.sections || [], // Storing sections in recommendations for now or separate field if available
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - job.timestamp,
                },
                update: {
                    extractedText: ocrResults as any,
                    identifiedTopics: analysisResult.topics || [],
                    evaluation: analysisResult.evaluation || {},
                    recommendations: analysisResult.sections || [],
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - job.timestamp,
                }
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

            clearTimeout(jobTimeout);
            return {
                success: true,
                analysisId: analysis.id,
                avgConfidence,
                isTrustworthy,
            };
        } catch (error) {
            clearTimeout(jobTimeout);
            console.error('❌ ========================================');
            console.error(`❌ OCR processing failed for answer sheet: ${answerSheetId}`);
            console.error('❌ Error details:');
            console.error(error);
            if (error.stack) {
                console.error('❌ Stack trace:');
                console.error(error.stack);
            }
            console.error('❌ ========================================');

            // Extract user-friendly error message
            let errorMessage = 'OCR processing failed';
            if (error.message) {
                // Extract the main error from Gemini/Python errors
                if (error.message.includes('quota exceeded')) {
                    errorMessage = 'API quota exceeded. Please wait and try again.';
                } else if (error.message.includes('404') || error.message.includes('not found')) {
                    errorMessage = 'OCR model not available. Please contact support.';
                } else if (error.message.includes('GEMINI_API_KEY')) {
                    errorMessage = 'API key not configured. Please contact administrator.';
                } else {
                    // Try to extract first line of error
                    const firstLine = error.message.split('\n')[0];
                    errorMessage = firstLine.substring(0, 200); // Limit length
                }
            }

            // Update status to FAILED with error message
            await this.prisma.answerSheet.update({
                where: { id: answerSheetId },
                data: {
                    processingStatus: 'FAILED',
                    notes: `OCR Error: ${errorMessage}`
                },
            });

            throw error;
        }
    }
}
