import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BoardController],
})
export class BoardModule { }
