import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { UploadAnswerSheetDto } from './dto/upload-answer-sheet.dto';
import * as fs from 'fs-extra';
import * as path from 'path';
import { uploadConfig } from '../config/upload.config';

@Injectable()
export class AnswerSheetService {
    constructor(
        private prisma: PrismaService,
        @InjectQueue('ocr-processing') private ocrQueue: Queue,
    ) { }

    async processUpload(
        file: Express.Multer.File,
        dto: UploadAnswerSheetDto,
        user: any,
    ) {
        // Validate file
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
            // Delete uploaded file
            await fs.remove(file.path);
            throw new BadRequestException('Invalid file type. Only PDF and images are allowed');
        }

        if (file.size > uploadConfig.maxFileSize) {
            await fs.remove(file.path);
            throw new BadRequestException(`File size exceeds ${uploadConfig.maxFileSize / 1024 / 1024}MB limit`);
        }

        // Get student profile
        const student = await this.prisma.student.findUnique({
            where: { userId: user.userId },
        });

        if (!student) {
            await fs.remove(file.path);
            throw new BadRequestException('Student profile not found');
        }

        // Create answer sheet record
        const answerSheet = await this.prisma.answerSheet.create({
            data: {
                studentId: student.id,
                subjectId: dto.subjectId,
                examScheduleId: dto.examScheduleId,
                assessmentType: 'PRACTICE',
                questionType: dto.questionType,
                filePath: file.path,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                uploadedAt: new Date(),
                processingStatus: 'PENDING',
                notes: dto.notes,
            },
        });

        // Add to OCR processing queue
        await this.ocrQueue.add('extract-text', {
            answerSheetId: answerSheet.id,
            filePath: file.path,
            fileType: file.mimetype,
        });

        return {
            id: answerSheet.id,
            fileName: answerSheet.fileName,
            status: answerSheet.processingStatus,
            uploadedAt: answerSheet.uploadedAt,
            message: 'File uploaded successfully. OCR processing started.',
        };
    }

    async getAnswerSheets(userId: string) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
        });

        if (!student) {
            throw new BadRequestException('Student profile not found');
        }

        return this.prisma.answerSheet.findMany({
            where: { studentId: student.id },
            include: {
                analysis: true,
            },
            orderBy: { uploadedAt: 'desc' },
        });
    }

    async getAnswerSheetById(id: string, userId: string) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
        });

        if (!student) {
            throw new BadRequestException('Student profile not found');
        }

        const answerSheet = await this.prisma.answerSheet.findFirst({
            where: {
                id,
                studentId: student.id,
            },
            include: {
                analysis: true,
            },
        });

        if (!answerSheet) {
            throw new BadRequestException('Answer sheet not found');
        }

        return answerSheet;
    }

    async deleteAnswerSheet(id: string, userId: string) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
        });

        if (!student) {
            throw new BadRequestException('Student profile not found');
        }

        const answerSheet = await this.prisma.answerSheet.findFirst({
            where: {
                id,
                studentId: student.id,
            },
        });

        if (!answerSheet) {
            throw new BadRequestException('Answer sheet not found');
        }

        // Delete file from filesystem
        if (answerSheet.filePath) {
            await fs.remove(answerSheet.filePath);
        }

        // Delete from database
        await this.prisma.answerSheet.delete({
            where: { id },
        });

        return { message: 'Answer sheet deleted successfully' };
    }
}
