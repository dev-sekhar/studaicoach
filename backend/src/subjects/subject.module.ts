import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SubjectController],
})
export class SubjectModule { }
