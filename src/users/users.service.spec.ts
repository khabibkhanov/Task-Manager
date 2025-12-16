import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: Role.USER,
    };

    it('should create a user successfully as ADMIN', async () => {
      const currentUser = {
        id: 'admin-id',
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any) // Current user
        .mockResolvedValueOnce(null); // User doesn't exist

      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      const createdUser = {
        id: 'new-user-id',
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role,
        companyId: currentUser.companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'company-id',
          name: 'Test Company',
        },
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser as any);

      const result = await service.create(createUserDto, currentUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        10,
      );
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw ForbiddenException if user is not ADMIN/MANAGER', async () => {
      const currentUser = {
        id: 'user-id',
        role: Role.USER,
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(
        currentUser as any,
      );

      await expect(
        service.create(createUserDto, currentUser.id),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const currentUser = {
        id: 'admin-id',
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const existingUser = {
        id: 'existing-id',
        email: createUserDto.email,
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(existingUser as any);

      await expect(
        service.create(createUserDto, currentUser.id),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all users for SUPERADMIN', async () => {
      const currentUser = {
        id: 'superadmin-id',
        role: Role.SUPERADMIN,
      };

      const users = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: Role.USER,
          companyId: 'company-1',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          role: Role.ADMIN,
          companyId: 'company-2',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrismaService.user.findMany.mockResolvedValue(users as any);

      const result = await service.findAll({} as FilterUserDto, currentUser.id);

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    it('should return only company users for non-SUPERADMIN', async () => {
      const currentUser = {
        id: 'admin-id',
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const companyUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: Role.USER,
          companyId: 'company-id',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(currentUser as any);
      mockPrismaService.user.findMany.mockResolvedValue(companyUsers as any);

      const result = await service.findAll({} as FilterUserDto, currentUser.id);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { companyId: currentUser.companyId },
        select: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toEqual(companyUsers);
    });

    it('should return empty array if user has no company', async () => {
      const currentUser = {
        id: 'user-id',
        role: Role.USER,
        companyId: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(currentUser as any);

      const result = await service.findAll({} as FilterUserDto, currentUser.id);

      expect(result).toEqual([]);
      expect(prismaService.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return user if SUPERADMIN', async () => {
      const currentUser = {
        id: 'superadmin-id',
        role: Role.SUPERADMIN,
      };

      const targetUser = {
        id: 'target-id',
        email: 'target@example.com',
        name: 'Target User',
        role: Role.USER,
        companyId: 'company-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'company-id',
          name: 'Test Company',
          description: 'Test',
        },
        _count: {
          tasks: 0,
          ownedGroups: 0,
          groups: 0,
        },
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(targetUser as any);

      const result = await service.findOne(targetUser.id, currentUser.id);

      expect(result).toEqual(targetUser);
    });

    it('should throw ForbiddenException if accessing user from different company', async () => {
      const currentUser = {
        id: 'admin-id',
        role: Role.ADMIN,
        companyId: 'company-1',
      };

      const targetUser = {
        id: 'target-id',
        email: 'target@example.com',
        companyId: 'company-2',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(targetUser as any);

      await expect(
        service.findOne(targetUser.id, currentUser.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    it('should update user successfully', async () => {
      const currentUser = {
        id: 'admin-id',
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const targetUser = {
        id: 'target-id',
        email: 'target@example.com',
        companyId: 'company-id',
      };

      const updatedUser = {
        ...targetUser,
        name: updateUserDto.name,
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(targetUser as any);
      mockPrismaService.user.update.mockResolvedValue(updatedUser as any);

      const result = await service.update(
        targetUser.id,
        updateUserDto,
        currentUser.id,
      );

      expect(prismaService.user.update).toHaveBeenCalled();
      expect(result.name).toBe(updateUserDto.name);
    });

    it('should throw ForbiddenException if user cannot update', async () => {
      const currentUser = {
        id: 'user-id',
        role: Role.USER,
        companyId: 'company-id',
      };

      const targetUser = {
        id: 'target-id',
        email: 'target@example.com',
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(targetUser as any);

      await expect(
        service.update(targetUser.id, updateUserDto, currentUser.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updatePassword', () => {
    const updatePasswordDto: UpdatePasswordDto = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
    };

    it('should update password successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        email: 'user@example.com',
        password: 'hashed-old-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('hashed-new-password' as never);

      const updatedUser = {
        id: userId,
        email: user.email,
        name: 'User',
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser as any);

      const result = await service.updatePassword(
        userId,
        updatePasswordDto,
        userId,
      );

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        updatePasswordDto.currentPassword,
        user.password,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        updatePasswordDto.newPassword,
        10,
      );
      expect(prismaService.user.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if updating different user', async () => {
      await expect(
        service.updatePassword('other-id', updatePasswordDto, 'user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        password: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.updatePassword(userId, updatePasswordDto, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete user successfully as ADMIN', async () => {
      const currentUser = {
        id: 'admin-id',
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const targetUser = {
        id: 'target-id',
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(targetUser as any);
      mockPrismaService.user.delete.mockResolvedValue(targetUser as any);

      await service.remove(targetUser.id, currentUser.id);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: targetUser.id },
      });
    });

    it('should throw BadRequestException if trying to delete self', async () => {
      const currentUser = {
        id: 'user-id',
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(currentUser as any);

      await expect(
        service.remove(currentUser.id, currentUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if not ADMIN', async () => {
      const currentUser = {
        id: 'user-id',
        role: Role.USER,
        companyId: 'company-id',
      };

      const targetUser = {
        id: 'target-id',
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(currentUser as any)
        .mockResolvedValueOnce(targetUser as any);

      await expect(service.remove('target-id', currentUser.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMyProfile', () => {
    it('should return user profile', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        email: 'user@example.com',
        name: 'User',
        role: Role.USER,
        companyId: 'company-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        company: {
          id: 'company-id',
          name: 'Test Company',
          description: 'Test',
        },
        _count: {
          tasks: 5,
          ownedGroups: 2,
          groups: 3,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      const result = await service.getMyProfile(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.any(Object),
      });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
