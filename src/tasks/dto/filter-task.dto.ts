import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class FilterTaskDto {
  @ApiProperty({ enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ required: false, example: '2025-01-31' })
  @IsOptional()
  @IsISO8601()
  dueDateFrom?: string;

  @ApiProperty({ required: false, example: '2025-01-31' })
  @IsOptional()
  @IsISO8601()
  dueDateTo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}

