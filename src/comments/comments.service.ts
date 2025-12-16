import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Role } from '@prisma/client';
import { TasksService } from '../tasks/tasks.service';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(taskId: string, createCommentDto: CreateCommentDto, userId: string) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    // Create comment
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        userId,
        content: createCommentDto.content,
      },
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

    // Create activity log
    await this.activitiesService.createActivity(
      taskId,
      userId,
      'COMMENT_ADDED',
      null,
      null,
      { commentId: comment.id },
    );

    // Create notifications for task assignees
    await this.notifyTaskAssignees(taskId, userId, 'COMMENT_ADDED', comment.id);

    return comment;
  }

  async findAll(taskId: string, userId: string) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(taskId: string, commentId: string, userId: string) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.taskId !== taskId) {
      throw new NotFoundException('Comment not found for this task');
    }

    return comment;
  }

  async update(
    taskId: string,
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
  ) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.taskId !== taskId) {
      throw new NotFoundException('Comment not found for this task');
    }

    // Only comment owner can update
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content: updateCommentDto.content,
        editedAt: new Date(),
      },
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
  }

  async remove(taskId: string, commentId: string, userId: string) {
    // Verify task access
    await this.tasksService.findOne(taskId, userId);

    const comment = await this.prisma.taskComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.taskId !== taskId) {
      throw new NotFoundException('Comment not found for this task');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Only comment owner, ADMIN, or MANAGER can delete
    const canDelete =
      comment.userId === userId ||
      user?.role === Role.ADMIN ||
      user?.role === Role.MANAGER ||
      user?.role === Role.SUPERADMIN;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    return this.prisma.taskComment.delete({
      where: { id: commentId },
    });
  }

  private async notifyTaskAssignees(
    taskId: string,
    authorId: string,
    type: string,
    commentId: string,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true },
    });

    if (!task) return;

    // Notify all assignees except the comment author
    const assigneeIds = task.assignees
      .map((a) => a.userId)
      .filter((id) => id !== authorId);

    if (assigneeIds.length === 0) return;

    // Create notifications for each assignee
    await Promise.all(
      assigneeIds.map((assigneeId) =>
        this.notificationsService.createNotification(
          assigneeId,
          type,
          'New comment on task',
          `A new comment was added to task: ${task.title}`,
          taskId,
        ),
      ),
    );
  }
}

