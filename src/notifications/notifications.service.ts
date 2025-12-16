import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { NotificationsGateway } from '../websocket/websocket.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly wsGateway: NotificationsGateway,
  ) {}

  async findAll(userId: string, filterDto: FilterNotificationDto) {
    const where: any = { userId };

    if (filterDto.read !== undefined) {
      where.read = filterDto.read;
    }

    if (filterDto.type) {
      where.type = filterDto.type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filterDto.limit || 50,
        skip: filterDto.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      limit: filterDto.limit || 50,
      offset: filterDto.offset || 0,
    };
  }

  async findOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  // Internal method to create notification (used by other services)
  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    taskId?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        taskId,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Emit real-time notification via WebSocket
    this.wsGateway.emitToUser(userId, 'notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      taskId: notification.taskId,
      read: notification.read,
      createdAt: notification.createdAt,
      task: notification.task,
    });

    return notification;
  }
}

