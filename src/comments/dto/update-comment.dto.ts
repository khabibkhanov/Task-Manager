import { PartialType } from '@nestjs/mapped-types';
import { CreateCommentDto } from './create-comment.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;
}

