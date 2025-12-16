import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { FilesService } from '../files/files.service';
import { Role } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot create tasks (must belong to a company)
    // Others must belong to a company
    if (user.role !== Role.SUPERADMIN && !user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    // SUPERADMIN cannot create tasks
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot create tasks');
    }

    // Verify group belongs to user's company
    if (createTaskDto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: createTaskDto.groupId },
      });

      if (!group) {
        throw new NotFoundException('Group not found');
      }

      if (group.companyId !== user.companyId) {
        throw new ForbiddenException('Group does not belong to your company');
      }
    }

    // Verify assignees belong to user's company
    if (createTaskDto.assigneeIds && createTaskDto.assigneeIds.length > 0) {
      const assignees = await this.prisma.user.findMany({
        where: {
          id: { in: createTaskDto.assigneeIds },
        },
      });

      if (assignees.length !== createTaskDto.assigneeIds.length) {
        throw new BadRequestException('Some assignees not found');
      }

      const invalidAssignees = assignees.filter(
        (a) => a.companyId !== user.companyId,
      );
      if (invalidAssignees.length > 0) {
        throw new ForbiddenException(
          'All assignees must belong to your company',
        );
      }
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status ?? 'TODO',
        priority: createTaskDto.priority ?? 'MEDIUM',
        dueDate: createTaskDto.dueDate
          ? new Date(createTaskDto.dueDate)
          : undefined,
        groupId: createTaskDto.groupId,
        assignees: createTaskDto.assigneeIds
          ? {
              create: createTaskDto.assigneeIds.map((assigneeId) => ({
                userId: assigneeId,
              })),
            }
          : undefined,
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        checklists: true,
        files: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return task;
  }

  async findAll(filterDto: FilterTaskDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    // Build where clause
    const where: any = {};

    // SUPERADMIN can see all tasks from all companies
    if (user.role === Role.SUPERADMIN) {
      // No company filter for SUPERADMIN
    } else if (user.companyId) {
      // Get all groups for user's company
      const companyGroups = await this.prisma.group.findMany({
        where: { companyId: user.companyId },
        select: { id: true },
      });
      const groupIds = companyGroups.map((g) => g.id);
      where.groupId = { in: groupIds };
    } else {
      return [];
    }

    if (filterDto.status) {
      where.status = filterDto.status;
    }

    if (filterDto.priority) {
      where.priority = filterDto.priority;
    }

    if (filterDto.groupId) {
      where.groupId = filterDto.groupId;
    }

    if (filterDto.assigneeId) {
      where.assignees = {
        some: {
          userId: filterDto.assigneeId,
        },
      };
    }

    if (filterDto.dueDateFrom || filterDto.dueDateTo) {
      where.dueDate = {};
      if (filterDto.dueDateFrom) {
        where.dueDate.gte = new Date(filterDto.dueDateFrom);
      }
      if (filterDto.dueDateTo) {
        where.dueDate.lte = new Date(filterDto.dueDateTo);
      }
    }

    if (filterDto.search) {
      where.OR = [
        { title: { contains: filterDto.search, mode: 'insensitive' } },
        {
          description: { contains: filterDto.search, mode: 'insensitive' },
        },
      ];
    }

    return this.prisma.task.findMany({
      where,
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        checklists: {
          orderBy: { order: 'asc' },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        checklists: {
          orderBy: { order: 'asc' },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
        group: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // SUPERADMIN can see any task
    // Others can only see tasks from their company
    if (
      user.role !== Role.SUPERADMIN &&
      task.group &&
      task.group.companyId !== user.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot update tasks (must belong to a company)
    if (user.role !== Role.SUPERADMIN && !user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    // SUPERADMIN cannot update tasks
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot update tasks');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Others can only update tasks from their company
    if (task.group && task.group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    // Verify new group if provided
    if (updateTaskDto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: updateTaskDto.groupId },
      });

      if (!group || group.companyId !== user.companyId) {
        throw new ForbiddenException('Group does not belong to your company');
      }
    }

    // Handle assignees update
    if (updateTaskDto.assigneeIds !== undefined) {
      // Delete existing assignees
      await this.prisma.taskAssignee.deleteMany({
        where: { taskId: id },
      });

      // Verify new assignees
      if (updateTaskDto.assigneeIds.length > 0) {
        const assignees = await this.prisma.user.findMany({
          where: {
            id: { in: updateTaskDto.assigneeIds },
          },
        });

        const invalidAssignees = assignees.filter(
          (a) => a.companyId !== user.companyId,
        );
        if (invalidAssignees.length > 0) {
          throw new ForbiddenException(
            'All assignees must belong to your company',
          );
        }

        // Create new assignees
        await this.prisma.taskAssignee.createMany({
          data: updateTaskDto.assigneeIds.map((assigneeId) => ({
            taskId: id,
            userId: assigneeId,
          })),
        });
      }
    }

    // Update task
    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        title: updateTaskDto.title,
        description: updateTaskDto.description,
        status: updateTaskDto.status,
        priority: updateTaskDto.priority,
        dueDate: updateTaskDto.dueDate
          ? new Date(updateTaskDto.dueDate)
          : undefined,
        groupId: updateTaskDto.groupId,
      },
      include: {
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        checklists: {
          orderBy: { order: 'asc' },
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return updatedTask;
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot delete tasks (must belong to a company)
    if (user.role !== Role.SUPERADMIN && !user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    // SUPERADMIN cannot delete tasks
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot delete tasks');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { group: true, files: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Others can only delete tasks from their company
    if (task.group && task.group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    // Delete associated files
    for (const file of task.files) {
      await this.filesService.deleteFile(file.id);
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }

  // Checklist methods
  async createChecklist(
    taskId: string,
    createChecklistDto: CreateChecklistDto,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot create checklists
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot create checklists');
    }

    const task = await this.findOne(taskId, userId);

    // Get max order
    const maxOrder = await this.prisma.taskChecklist.aggregate({
      where: { taskId },
      _max: { order: true },
    });

    return this.prisma.taskChecklist.create({
      data: {
        taskId,
        title: createChecklistDto.title,
        isCompleted: createChecklistDto.isCompleted ?? false,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
  }

  async updateChecklist(
    taskId: string,
    checklistId: string,
    updateChecklistDto: UpdateChecklistDto,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot update checklists
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot update checklists');
    }

    await this.findOne(taskId, userId);

    return this.prisma.taskChecklist.update({
      where: { id: checklistId },
      data: updateChecklistDto,
    });
  }

  async deleteChecklist(
    taskId: string,
    checklistId: string,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot delete checklists
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot delete checklists');
    }

    await this.findOne(taskId, userId);

    return this.prisma.taskChecklist.delete({
      where: { id: checklistId },
    });
  }

  // File upload
  async uploadFile(
    taskId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot upload files
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot upload files');
    }

    await this.findOne(taskId, userId);
    return this.filesService.saveFile(file, taskId);
  }

  async deleteFile(taskId: string, fileId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot delete files
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot delete files');
    }

    await this.findOne(taskId, userId);
    return this.filesService.deleteFile(fileId);
  }
}
