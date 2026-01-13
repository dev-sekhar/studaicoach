import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectController {
    constructor(private prisma: PrismaService) { }

    @Get()
    @ApiOperation({ summary: 'Get all subjects' })
    async getSubjects(
        @Query('board') board?: string,
        @Query('grade') grade?: string,
    ) {
        console.log('📚 Fetching subjects with filters:', { board, grade });

        const where: any = {};
        if (board) where.board = board;
        if (grade) where.grade = parseInt(grade);

        console.log('🔍 Query where clause:', where);

        const subjects = await this.prisma.subject.findMany({
            where,
            orderBy: { name: 'asc' },
        });

        console.log(`✅ Found ${subjects.length} subjects`);
        if (subjects.length > 0) {
            console.log('📋 First subject:', subjects[0]);
        }

        return subjects;
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new subject (SUPER_ADMIN only)' })
    async createSubject(@Body() data: { name: string; code?: string; board: string; grade: number; syllabusUrl?: string }) {
        return this.prisma.subject.create({
            data: {
                name: data.name,
                code: data.code,
                board: data.board as any,
                grade: data.grade,
                syllabusUrl: data.syllabusUrl,
            },
        });
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a subject (SUPER_ADMIN only)' })
    async updateSubject(
        @Param('id') id: string,
        @Body() data: { name?: string; code?: string; board?: string; grade?: number; syllabusUrl?: string },
    ) {
        const updateData: any = {
            name: data.name,
            code: data.code,
            grade: data.grade,
            syllabusUrl: data.syllabusUrl,
        };
        if (data.board) {
            updateData.board = data.board as any;
        }
        return this.prisma.subject.update({
            where: { id },
            data: updateData,
        });
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a subject (SUPER_ADMIN only)' })
    async deleteSubject(@Param('id') id: string) {
        return this.prisma.subject.delete({
            where: { id },
        });
    }
}
