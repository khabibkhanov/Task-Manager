import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  findAll(
    @Query() filterDto: FilterNotificationDto,
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.findAll(user.userId, filterDto);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.findOne(id, user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, user.userId);
  }
}

