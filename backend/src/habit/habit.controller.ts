import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { HabitInput, HabitService } from './habit.service';

class SaveHabitDto implements HabitInput {
  @IsString() @MaxLength(80) name: string;
  @IsString() @MaxLength(500) description: string;
  @IsString() @MaxLength(500) note: string;
  @IsBoolean() active: boolean;
  @IsIn(['daily', 'weekdays', 'weekly']) mode: 'daily' | 'weekdays' | 'weekly';
  @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) weekdays: number[];
  @IsInt() @Min(1) @Max(7) weeklyTarget: number;
}
@Controller('habits')
export class HabitController {
  constructor(private readonly habits: HabitService) {}
  @Get()
  async list(@Headers('x-user-id') userId: string, @Query('habitId') habitId?: string) { return { success: true, data: await this.habits.overview(userId, habitId) }; }
  @Post()
  async create(@Headers('x-user-id') userId: string, @Body() input: SaveHabitDto) { return { success: true, data: await this.habits.save(userId, input) }; }
  @Post(':id')
  async update(@Headers('x-user-id') userId: string, @Param('id') id: string, @Body() input: SaveHabitDto) { return { success: true, data: await this.habits.save(userId, input, id) }; }
  @Post(':id/archive')
  async archive(@Headers('x-user-id') userId: string, @Param('id') id: string) { return { success: true, data: await this.habits.archive(userId, id) }; }
}
