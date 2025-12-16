import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: jest.Mocked<PrismaService>;
  let filesService: jest.Mocked<FilesService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    taskAssignee: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    taskChecklist: {
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taskFile: {
      findMany: jest.fn(),
    },
  };

  const mockFilesService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get(PrismaService);
    filesService = module.get(FilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTaskDto: CreateTaskDto = {
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      groupId: 'group-id',
    };

    it('should create a task successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const group = {
        id: createTaskDto.groupId,
        companyId: user.companyId,
      };

      const createdTask = {
        id: 'task-id',
        ...createTaskDto,
        assignees: [],
        checklists: [],
        files: [],
        group: {
          id: group.id,
          name: 'Test Group',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);
      mockPrismaService.task.create.mockResolvedValue(createdTask as any);

      const result = await service.create(createTaskDto, userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaService.group.findUnique).toHaveBeenCalledWith({
        where: { id: createTaskDto.groupId },
      });
      expect(prismaService.task.create).toHaveBeenCalled();
      expect(result).toEqual(createdTask);
    });

    it('should throw ForbiddenException if SUPERADMIN tries to create task', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
        companyId: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(service.create(createTaskDto, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaService.task.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if group belongs to different company', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-1',
      };

      const group = {
        id: createTaskDto.groupId,
        companyId: 'company-2',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);

      await expect(service.create(createTaskDto, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all tasks for SUPERADMIN', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
      };

      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: TaskStatus.TODO,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findMany.mockResolvedValue(tasks as any);

      const result = await service.findAll({} as FilterTaskDto, userId);

      expect(prismaService.task.findMany).toHaveBeenCalled();
      expect(result).toEqual(tasks);
    });

    it('should return filtered tasks for regular user', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const groups = [{ id: 'group-1' }, { id: 'group-2' }];
      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: TaskStatus.TODO,
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findMany.mockResolvedValue(groups as any);
      mockPrismaService.task.findMany.mockResolvedValue(tasks as any);

      const filterDto: FilterTaskDto = {
        status: TaskStatus.TODO,
      };

      const result = await service.findAll(filterDto, userId);

      expect(prismaService.group.findMany).toHaveBeenCalled();
      expect(prismaService.task.findMany).toHaveBeenCalled();
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('should return task if user has access', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        title: 'Test Task',
        group: {
          id: 'group-id',
          name: 'Test Group',
          companyId: user.companyId,
        },
        assignees: [],
        checklists: [],
        files: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findUnique.mockResolvedValue(task as any);

      const result = await service.findOne(task.id, userId);

      expect(result).toEqual(task);
    });

    it('should throw ForbiddenException if task belongs to different company', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-1',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: 'company-2',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findUnique.mockResolvedValue(task as any);

      await expect(service.findOne(task.id, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if task not found', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateTaskDto: UpdateTaskDto = {
      title: 'Updated Task',
      status: TaskStatus.IN_PROGRESS,
    };

    it('should update task successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
      };

      const updatedTask = {
        ...task,
        ...updateTaskDto,
        assignees: [],
        checklists: [],
        files: [],
        group: {
          id: task.group.id,
          name: 'Test Group',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findUnique.mockResolvedValue(task as any);
      mockPrismaService.task.update.mockResolvedValue(updatedTask as any);

      const result = await service.update('task-id', updateTaskDto, userId);

      expect(prismaService.task.update).toHaveBeenCalled();
      expect(result.title).toBe(updateTaskDto.title);
    });

    it('should throw ForbiddenException if SUPERADMIN tries to update', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
        companyId: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(
        service.update('task-id', updateTaskDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete task and associated files', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
        files: [
          { id: 'file-1', filename: 'file1.pdf' },
          { id: 'file-2', filename: 'file2.jpg' },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findUnique.mockResolvedValue(task as any);
      mockFilesService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.task.delete.mockResolvedValue(task as any);

      await service.remove('task-id', userId);

      expect(filesService.deleteFile).toHaveBeenCalledTimes(2);
      expect(prismaService.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-id' },
      });
    });
  });

  describe('createChecklist', () => {
    const createChecklistDto: CreateChecklistDto = {
      title: 'Checklist Item',
      isCompleted: false,
    };

    it('should create checklist item successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
      };

      const checklist = {
        id: 'checklist-id',
        taskId: 'task-id',
        ...createChecklistDto,
        order: 0,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.task.findUnique.mockResolvedValue(task as any);
      mockPrismaService.taskChecklist.aggregate.mockResolvedValue({
        _max: { order: -1 },
      } as any);
      mockPrismaService.taskChecklist.create.mockResolvedValue(
        checklist as any,
      );

      // Mock findOne method
      jest.spyOn(service, 'findOne').mockResolvedValue(task as any);

      const result = await service.createChecklist(
        'task-id',
        createChecklistDto,
        userId,
      );

      expect(prismaService.taskChecklist.create).toHaveBeenCalled();
      expect(result).toEqual(checklist);
    });

    it('should throw ForbiddenException if SUPERADMIN tries to create checklist', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(
        service.createChecklist('task-id', createChecklistDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateChecklist', () => {
    const updateChecklistDto: UpdateChecklistDto = {
      title: 'Updated Checklist',
      isCompleted: true,
    };

    it('should update checklist item successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
      };

      const updatedChecklist = {
        id: 'checklist-id',
        ...updateChecklistDto,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(task as any);
      mockPrismaService.taskChecklist.update.mockResolvedValue(
        updatedChecklist as any,
      );

      const result = await service.updateChecklist(
        'task-id',
        'checklist-id',
        updateChecklistDto,
        userId,
      );

      expect(prismaService.taskChecklist.update).toHaveBeenCalled();
      expect(result).toEqual(updatedChecklist);
    });
  });

  describe('deleteChecklist', () => {
    it('should delete checklist item successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(task as any);
      mockPrismaService.taskChecklist.delete.mockResolvedValue({} as any);

      await service.deleteChecklist('task-id', 'checklist-id', userId);

      expect(prismaService.taskChecklist.delete).toHaveBeenCalledWith({
        where: { id: 'checklist-id' },
      });
    });
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test content'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('should upload file successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
      };

      const fileResult = {
        id: 'file-id',
        url: '/uploads/test.pdf',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(task as any);
      mockFilesService.saveFile.mockResolvedValue(fileResult);

      const result = await service.uploadFile('task-id', mockFile, userId);

      expect(filesService.saveFile).toHaveBeenCalledWith(mockFile, 'task-id');
      expect(result).toEqual(fileResult);
    });

    it('should throw ForbiddenException if SUPERADMIN tries to upload', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(
        service.uploadFile('task-id', mockFile, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const task = {
        id: 'task-id',
        group: {
          id: 'group-id',
          companyId: user.companyId,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      jest.spyOn(service, 'findOne').mockResolvedValue(task as any);
      mockFilesService.deleteFile.mockResolvedValue(undefined);

      await service.deleteFile('task-id', 'file-id', userId);

      expect(filesService.deleteFile).toHaveBeenCalledWith('file-id');
    });
  });
});
