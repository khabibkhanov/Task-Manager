import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create(createTaskDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filters' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(@Query() filterDto: FilterTaskDto, @CurrentUser() user: any) {
    return this.tasksService.findAll(filterDto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.remove(id, user.userId);
  }

  // Checklist endpoints
  @Post(':id/checklists')
  @ApiOperation({ summary: 'Add checklist item to task' })
  @ApiResponse({ status: 201, description: 'Checklist item created' })
  createChecklist(
    @Param('id') id: string,
    @Body() createChecklistDto: CreateChecklistDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.createChecklist(
      id,
      createChecklistDto,
      user.userId,
    );
  }

  @Patch(':id/checklists/:checklistId')
  @ApiOperation({ summary: 'Update checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item updated' })
  updateChecklist(
    @Param('id') id: string,
    @Param('checklistId') checklistId: string,
    @Body() updateChecklistDto: UpdateChecklistDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.updateChecklist(
      id,
      checklistId,
      updateChecklistDto,
      user.userId,
    );
  }

  @Delete(':id/checklists/:checklistId')
  @ApiOperation({ summary: 'Delete checklist item' })
  @ApiResponse({ status: 200, description: 'Checklist item deleted' })
  deleteChecklist(
    @Param('id') id: string,
    @Param('checklistId') checklistId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteChecklist(id, checklistId, user.userId);
  }

  // File upload endpoints
  @Post(':id/files')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file to task' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.uploadFile(id, file, user.userId);
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ summary: 'Delete file from task' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.deleteFile(id, fileId, user.userId);
  }
}
