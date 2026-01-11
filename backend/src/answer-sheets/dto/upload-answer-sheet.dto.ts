import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadAnswerSheetDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    subjectId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    examScheduleId?: string;

    @ApiProperty({ enum: ['MCQ', 'SUBJECTIVE', 'MIXED'], example: 'SUBJECTIVE' })
    @IsEnum(['MCQ', 'SUBJECTIVE', 'MIXED'])
    questionType: 'MCQ' | 'SUBJECTIVE' | 'MIXED';

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
