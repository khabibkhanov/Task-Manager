import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('FilesService', () => {
  let service: FilesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    taskFile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prismaService = module.get(PrismaService);

    // Setup path mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.extname.mockReturnValue('.pdf');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.unlinkSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveFile', () => {
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

    it('should save file successfully', async () => {
      const taskId = 'task-id';
      const taskFile = {
        id: 'file-id',
        taskId,
        filename: '1234567890-abc123.pdf',
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        fileType: FileType.DOCUMENT,
        url: '/uploads/1234567890-abc123.pdf',
      };

      mockPrismaService.taskFile.create.mockResolvedValue(taskFile as any);

      const result = await service.saveFile(mockFile, taskId);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(prismaService.taskFile.create).toHaveBeenCalled();
      expect(result).toEqual({
        id: taskFile.id,
        url: taskFile.url,
      });
    });

    it('should throw BadRequestException if no file provided', async () => {
      await expect(service.saveFile(null as any, 'task-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should determine file type correctly for images', async () => {
      const imageFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'image/jpeg',
        originalname: 'test.jpg',
      };

      const taskFile = {
        id: 'file-id',
        fileType: FileType.IMAGE,
        url: '/uploads/test.jpg',
      };

      mockPrismaService.taskFile.create.mockResolvedValue(taskFile as any);

      await service.saveFile(imageFile, 'task-id');

      expect(prismaService.taskFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileType: FileType.IMAGE,
        }),
      });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileId = 'file-id';
      const file = {
        id: fileId,
        filename: 'test.pdf',
        taskId: 'task-id',
      };

      mockPrismaService.taskFile.findUnique.mockResolvedValue(file as any);
      mockPrismaService.taskFile.delete.mockResolvedValue(file as any);

      await service.deleteFile(fileId);

      expect(prismaService.taskFile.findUnique).toHaveBeenCalledWith({
        where: { id: fileId },
      });
      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(prismaService.taskFile.delete).toHaveBeenCalledWith({
        where: { id: fileId },
      });
    });

    it('should throw BadRequestException if file not found', async () => {
      mockPrismaService.taskFile.findUnique.mockResolvedValue(null);

      await expect(service.deleteFile('non-existent-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle file not existing on disk gracefully', async () => {
      const fileId = 'file-id';
      const file = {
        id: fileId,
        filename: 'test.pdf',
        taskId: 'task-id',
      };

      mockPrismaService.taskFile.findUnique.mockResolvedValue(file as any);
      mockFs.existsSync.mockReturnValue(false);
      mockPrismaService.taskFile.delete.mockResolvedValue(file as any);

      await service.deleteFile(fileId);

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(prismaService.taskFile.delete).toHaveBeenCalled();
    });
  });

  describe('getTaskFiles', () => {
    it('should return all files for a task', async () => {
      const taskId = 'task-id';
      const files = [
        {
          id: 'file-1',
          filename: 'file1.pdf',
          taskId,
        },
        {
          id: 'file-2',
          filename: 'file2.jpg',
          taskId,
        },
      ];

      mockPrismaService.taskFile.findMany.mockResolvedValue(files as any);

      const result = await service.getTaskFiles(taskId);

      expect(prismaService.taskFile.findMany).toHaveBeenCalledWith({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(files);
    });
  });
});
