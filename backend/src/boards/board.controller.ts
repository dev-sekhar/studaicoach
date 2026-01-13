import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('boards')
@Controller('boards')
export class BoardController {
    constructor(private prisma: PrismaService) { }

    @Get('custom')
    @ApiOperation({ summary: 'Get all custom boards' })
    async getCustomBoards() {
        return this.prisma.customBoard.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    @Post('custom')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a custom board (SUPER_ADMIN only)' })
    async createCustomBoard(@Body() data: {
        name: string;
        code: string;
        country?: string;
        description?: string;
        websiteUrl?: string;
    }) {
        return this.prisma.customBoard.create({ data });
    }

    @Put('custom/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a custom board (SUPER_ADMIN only)' })
    async updateCustomBoard(
        @Param('id') id: string,
        @Body() data: {
            name?: string;
            code?: string;
            country?: string;
            description?: string;
            websiteUrl?: string;
            isActive?: boolean;
        },
    ) {
        return this.prisma.customBoard.update({
            where: { id },
            data,
        });
    }

    @Delete('custom/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a custom board (SUPER_ADMIN only)' })
    async deleteCustomBoard(@Param('id') id: string) {
        return this.prisma.customBoard.delete({
            where: { id },
        });
    }
}
