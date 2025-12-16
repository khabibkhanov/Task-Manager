import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilterActivityDto } from './dto/filter-activity.dto';
import { TasksService } from '../tasks/tasks.service';
import { Role } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  async findAll(taskId: string, filterDto: FilterActivityDto, userId: string) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    const where: any = { taskId };

    if (filterDto.action) {
      where.action = filterDto.action;
    }

    return this.prisma.taskActivity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filterDto.limit || 50,
      skip: filterDto.offset || 0,
    });
  }

  async findOne(taskId: string, activityId: string, userId: string) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    const activity = await this.prisma.taskActivity.findUnique({
      where: { id: activityId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.taskId !== taskId) {
      throw new NotFoundException('Activity not found for this task');
    }

    return activity;
  }

  // Internal method to create activity (used by other services)
  async createActivity(
    taskId: string,
    userId: string,
    action: string,
    oldValue: string | null = null,
    newValue: string | null = null,
    metadata?: any,
  ) {
    return this.prisma.taskActivity.create({
      data: {
        taskId,
        userId,
        action,
        oldValue,
        newValue,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}

