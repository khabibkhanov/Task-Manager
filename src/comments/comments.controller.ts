import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add comment to task' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  create(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.create(taskId, createCommentDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  findAll(@Param('taskId') taskId: string, @CurrentUser() user: any) {
    return this.commentsService.findAll(taskId, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment details' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findOne(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.findOne(taskId, id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  update(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.update(
      taskId,
      id,
      updateCommentDto,
      user.userId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  remove(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.remove(taskId, id, user.userId);
  }
}

