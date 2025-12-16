import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterNotificationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  read?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

