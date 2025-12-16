import { PartialType, OmitType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { Role } from '@prisma/client';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiProperty({ required: false, minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
