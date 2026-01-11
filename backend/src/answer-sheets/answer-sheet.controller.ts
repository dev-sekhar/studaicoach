import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/tenant.decorator';
import { AnswerSheetService } from './answer-sheet.service';
import { UploadAnswerSheetDto } from './dto/upload-answer-sheet.dto';
import { uploadConfig } from '../config/upload.config';
import * as path from 'path';
import * as fs from 'fs-extra';

@ApiTags('answer-sheets')
@Controller('answer-sheets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnswerSheetController {
    constructor(private answerSheetService: AnswerSheetService) { }

    @Post('upload')
    @ApiOperation({ summary: 'Upload answer sheet for OCR processing' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file or request' })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: async (req, file, cb) => {
                    const uploadPath = uploadConfig.destination;
                    await fs.ensureDir(uploadPath);
                    cb(null, uploadPath);
                },
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    cb(null, `${uniqueSuffix}${ext}`);
                },
            }),
            limits: {
                fileSize: uploadConfig.maxFileSize,
            },
        }),
    )
    async uploadAnswerSheet(
        @UploadedFile() file: Express.Multer.File,
        @Body() dto: UploadAnswerSheetDto,
        @CurrentUser() user: any,
    ) {
        return this.answerSheetService.processUpload(file, dto, user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all answer sheets for current user' })
    @ApiResponse({ status: 200, description: 'Answer sheets retrieved' })
    async getAnswerSheets(@CurrentUser() user: any) {
        return this.answerSheetService.getAnswerSheets(user.userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get answer sheet by ID' })
    @ApiResponse({ status: 200, description: 'Answer sheet retrieved' })
    @ApiResponse({ status: 404, description: 'Answer sheet not found' })
    async getAnswerSheetById(@Param('id') id: string, @CurrentUser() user: any) {
        return this.answerSheetService.getAnswerSheetById(id, user.userId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete answer sheet' })
    @ApiResponse({ status: 200, description: 'Answer sheet deleted' })
    @ApiResponse({ status: 404, description: 'Answer sheet not found' })
    async deleteAnswerSheet(@Param('id') id: string, @CurrentUser() user: any) {
        return this.answerSheetService.deleteAnswerSheet(id, user.userId);
    }
}
