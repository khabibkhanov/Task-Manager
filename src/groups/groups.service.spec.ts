import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Role } from '@prisma/client';

describe('GroupsService', () => {
  let service: GroupsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    group: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userGroup: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createGroupDto: CreateGroupDto = {
      name: 'Test Group',
      description: 'Test Description',
    };

    it('should create a group successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const createdGroup = {
        id: 'group-id',
        ...createGroupDto,
        ownerId: userId,
        companyId: user.companyId,
        isDefault: false,
        owner: {
          id: userId,
          email: 'user@example.com',
          name: 'User',
        },
        _count: {
          tasks: 0,
          members: 0,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.create.mockResolvedValue(createdGroup as any);

      const result = await service.create(createGroupDto, userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prismaService.group.create).toHaveBeenCalledWith({
        data: {
          name: createGroupDto.name,
          description: createGroupDto.description,
          ownerId: userId,
          companyId: user.companyId,
          isDefault: false,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(createdGroup);
    });

    it('should throw ForbiddenException if SUPERADMIN tries to create', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
        companyId: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(service.create(createGroupDto, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaService.group.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all groups for SUPERADMIN', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
      };

      const groups = [
        {
          id: 'group-1',
          name: 'Group 1',
          companyId: 'company-1',
        },
        {
          id: 'group-2',
          name: 'Group 2',
          companyId: 'company-2',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findMany.mockResolvedValue(groups as any);

      const result = await service.findAll(userId);

      expect(prismaService.group.findMany).toHaveBeenCalled();
      expect(result).toEqual(groups);
    });

    it('should return only company groups for regular user', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const groups = [
        {
          id: 'group-1',
          name: 'Group 1',
          companyId: 'company-id',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findMany.mockResolvedValue(groups as any);

      const result = await service.findAll(userId);

      expect(prismaService.group.findMany).toHaveBeenCalledWith({
        where: { companyId: user.companyId },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toEqual(groups);
    });
  });

  describe('findOne', () => {
    it('should return group if user has access', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        name: 'Test Group',
        companyId: user.companyId,
        owner: {
          id: 'owner-id',
          email: 'owner@example.com',
          name: 'Owner',
        },
        company: {
          id: user.companyId,
          name: 'Test Company',
        },
        tasks: [],
        members: [],
        _count: {
          tasks: 0,
          members: 0,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);

      const result = await service.findOne(group.id, userId);

      expect(result).toEqual(group);
    });

    it('should throw ForbiddenException if group belongs to different company', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-1',
      };

      const group = {
        id: 'group-id',
        companyId: 'company-2',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);

      await expect(service.findOne(group.id, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateGroupDto: UpdateGroupDto = {
      name: 'Updated Group',
      description: 'Updated Description',
    };

    it('should update group successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        ownerId: userId,
        companyId: user.companyId,
        isDefault: false,
      };

      const updatedGroup = {
        ...group,
        ...updateGroupDto,
        owner: {
          id: userId,
          email: 'user@example.com',
          name: 'User',
        },
        _count: {
          tasks: 0,
          members: 0,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);
      mockPrismaService.group.update.mockResolvedValue(updatedGroup as any);

      const result = await service.update('group-id', updateGroupDto, userId);

      expect(prismaService.group.update).toHaveBeenCalled();
      expect(result.name).toBe(updateGroupDto.name);
    });

    it('should throw ForbiddenException if trying to rename default group', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        ownerId: userId,
        companyId: user.companyId,
        isDefault: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);

      await expect(
        service.update('group-id', updateGroupDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete group successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        ownerId: userId,
        companyId: user.companyId,
        isDefault: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);
      mockPrismaService.group.delete.mockResolvedValue(group as any);

      await service.remove('group-id', userId);

      expect(prismaService.group.delete).toHaveBeenCalledWith({
        where: { id: 'group-id' },
      });
    });

    it('should throw ForbiddenException if trying to delete default group', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        ownerId: userId,
        companyId: user.companyId,
        isDefault: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);

      await expect(service.remove('group-id', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addMember', () => {
    it('should add member to group successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        companyId: user.companyId,
      };

      const member = {
        id: 'member-id',
        companyId: user.companyId,
      };

      const userGroup = {
        userId: member.id,
        groupId: group.id,
        role: Role.USER,
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(user as any)
        .mockResolvedValueOnce(member as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);
      mockPrismaService.userGroup.upsert.mockResolvedValue(userGroup as any);

      const result = await service.addMember('group-id', 'member-id', userId);

      expect(prismaService.userGroup.upsert).toHaveBeenCalled();
      expect(result).toEqual(userGroup);
    });

    it('should throw ForbiddenException if member belongs to different company', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-1',
      };

      const group = {
        id: 'group-id',
        companyId: user.companyId,
      };

      const member = {
        id: 'member-id',
        companyId: 'company-2',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(user as any)
        .mockResolvedValueOnce(member as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);

      await expect(
        service.addMember('group-id', 'member-id', userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should remove member from group successfully', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const group = {
        id: 'group-id',
        ownerId: userId,
        companyId: user.companyId,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.group.findUnique.mockResolvedValue(group as any);
      mockPrismaService.userGroup.delete.mockResolvedValue({} as any);

      await service.removeMember('group-id', 'member-id', userId);

      expect(prismaService.userGroup.delete).toHaveBeenCalledWith({
        where: {
          userId_groupId: {
            userId: 'member-id',
            groupId: 'group-id',
          },
        },
      });
    });
  });
});
