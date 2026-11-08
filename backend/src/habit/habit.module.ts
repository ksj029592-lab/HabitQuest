import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { HabitService } from './habit.service';
import { HabitController } from './habit.controller';
@Module({ imports: [PrismaModule], providers: [HabitService], controllers: [HabitController], exports: [HabitService] })
export class HabitModule {}
