import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { TaskStatus, TaskPriority } from '@prisma/client';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

  const mockTasksService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createChecklist: jest.fn(),
    updateChecklist: jest.fn(),
    deleteChecklist: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockCurrentUser = {
    userId: 'user-id',
    email: 'user@example.com',
    role: 'USER',
    companyId: 'company-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      };

      const expectedTask = {
        id: 'task-id',
        ...createTaskDto,
        assignees: [],
        checklists: [],
        files: [],
      };

      mockTasksService.create.mockResolvedValue(expectedTask as any);

      const result = await controller.create(createTaskDto, mockCurrentUser);

      expect(tasksService.create).toHaveBeenCalledWith(
        createTaskDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedTask);
    });
  });

  describe('findAll', () => {
    it('should return list of tasks', async () => {
      const filterDto: FilterTaskDto = {
        status: TaskStatus.TODO,
      };

      const expectedTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: TaskStatus.TODO,
        },
      ];

      mockTasksService.findAll.mockResolvedValue(expectedTasks as any);

      const result = await controller.findAll(filterDto, mockCurrentUser);

      expect(tasksService.findAll).toHaveBeenCalledWith(
        filterDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedTasks);
    });
  });

  describe('findOne', () => {
    it('should return task by id', async () => {
      const taskId = 'task-id';
      const expectedTask = {
        id: taskId,
        title: 'Test Task',
        status: TaskStatus.TODO,
        assignees: [],
        checklists: [],
        files: [],
      };

      mockTasksService.findOne.mockResolvedValue(expectedTask as any);

      const result = await controller.findOne(taskId, mockCurrentUser);

      expect(tasksService.findOne).toHaveBeenCalledWith(
        taskId,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedTask);
    });
  });

  describe('update', () => {
    it('should update task', async () => {
      const taskId = 'task-id';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        status: TaskStatus.IN_PROGRESS,
      };

      const updatedTask = {
        id: taskId,
        ...updateTaskDto,
        assignees: [],
        checklists: [],
        files: [],
      };

      mockTasksService.update.mockResolvedValue(updatedTask as any);

      const result = await controller.update(
        taskId,
        updateTaskDto,
        mockCurrentUser,
      );

      expect(tasksService.update).toHaveBeenCalledWith(
        taskId,
        updateTaskDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(updatedTask);
    });
  });

  describe('remove', () => {
    it('should delete task', async () => {
      const taskId = 'task-id';
      const deletedTask = {
        id: taskId,
        title: 'Deleted Task',
      };

      mockTasksService.remove.mockResolvedValue(deletedTask as any);

      const result = await controller.remove(taskId, mockCurrentUser);

      expect(tasksService.remove).toHaveBeenCalledWith(
        taskId,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(deletedTask);
    });
  });

  describe('createChecklist', () => {
    it('should create checklist item', async () => {
      const taskId = 'task-id';
      const createChecklistDto: CreateChecklistDto = {
        title: 'Checklist Item',
        isCompleted: false,
      };

      const expectedChecklist = {
        id: 'checklist-id',
        taskId,
        ...createChecklistDto,
        order: 0,
      };

      mockTasksService.createChecklist.mockResolvedValue(
        expectedChecklist as any,
      );

      const result = await controller.createChecklist(
        taskId,
        createChecklistDto,
        mockCurrentUser,
      );

      expect(tasksService.createChecklist).toHaveBeenCalledWith(
        taskId,
        createChecklistDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedChecklist);
    });
  });

  describe('updateChecklist', () => {
    it('should update checklist item', async () => {
      const taskId = 'task-id';
      const checklistId = 'checklist-id';
      const updateChecklistDto: UpdateChecklistDto = {
        title: 'Updated Checklist',
        isCompleted: true,
      };

      const updatedChecklist = {
        id: checklistId,
        ...updateChecklistDto,
      };

      mockTasksService.updateChecklist.mockResolvedValue(
        updatedChecklist as any,
      );

      const result = await controller.updateChecklist(
        taskId,
        checklistId,
        updateChecklistDto,
        mockCurrentUser,
      );

      expect(tasksService.updateChecklist).toHaveBeenCalledWith(
        taskId,
        checklistId,
        updateChecklistDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(updatedChecklist);
    });
  });

  describe('deleteChecklist', () => {
    it('should delete checklist item', async () => {
      const taskId = 'task-id';
      const checklistId = 'checklist-id';

      mockTasksService.deleteChecklist.mockResolvedValue({} as any);

      const result = await controller.deleteChecklist(
        taskId,
        checklistId,
        mockCurrentUser,
      );

      expect(tasksService.deleteChecklist).toHaveBeenCalledWith(
        taskId,
        checklistId,
        mockCurrentUser.userId,
      );
      expect(result).toEqual({});
    });
  });

  describe('uploadFile', () => {
    it('should upload file to task', async () => {
      const taskId = 'task-id';
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const expectedResult = {
        id: 'file-id',
        url: '/uploads/test.pdf',
      };

      mockTasksService.uploadFile.mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(
        taskId,
        mockFile,
        mockCurrentUser,
      );

      expect(tasksService.uploadFile).toHaveBeenCalledWith(
        taskId,
        mockFile,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteFile', () => {
    it('should delete file from task', async () => {
      const taskId = 'task-id';
      const fileId = 'file-id';

      mockTasksService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile(
        taskId,
        fileId,
        mockCurrentUser,
      );

      expect(tasksService.deleteFile).toHaveBeenCalledWith(
        taskId,
        fileId,
        mockCurrentUser.userId,
      );
      expect(result).toBeUndefined();
    });
  });
});
