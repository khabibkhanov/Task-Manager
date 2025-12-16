import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { FilterActivityDto } from './dto/filter-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('tasks/:taskId/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get activity feed for a task' })
  @ApiResponse({ status: 200, description: 'List of activities' })
  findAll(
    @Param('taskId') taskId: string,
    @Query() filterDto: FilterActivityDto,
    @CurrentUser() user: any,
  ) {
    return this.activitiesService.findAll(taskId, filterDto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiResponse({ status: 200, description: 'Activity details' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  findOne(
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.activitiesService.findOne(taskId, id, user.userId);
  }
}

