import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Role } from '@prisma/client';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    group: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createCompanyDto: CreateCompanyDto = {
      name: 'Test Company',
      description: 'Test Description',
    };

    it('should create company and default groups successfully', async () => {
      const userId = 'user-id';
      const company = {
        id: 'company-id',
        ...createCompanyDto,
        createdAt: new Date(),
      };

      mockPrismaService.company.create.mockResolvedValue(company as any);
      mockPrismaService.user.update.mockResolvedValue({} as any);
      mockPrismaService.group.create.mockResolvedValue({} as any);

      const result = await service.create(createCompanyDto, userId);

      expect(prismaService.company.create).toHaveBeenCalledWith({
        data: {
          name: createCompanyDto.name,
          description: createCompanyDto.description,
        },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          companyId: company.id,
          role: Role.ADMIN,
        },
      });
      expect(prismaService.group.create).toHaveBeenCalledTimes(3); // 3 default groups
      expect(result).toEqual(company);
    });
  });

  describe('findAll', () => {
    it('should return all companies for SUPERADMIN', async () => {
      const userId = 'superadmin-id';
      const user = {
        id: userId,
        role: Role.SUPERADMIN,
      };

      const companies = [
        {
          id: 'company-1',
          name: 'Company 1',
          users: [],
          groups: [],
          _count: {
            users: 0,
            groups: 0,
          },
        },
        {
          id: 'company-2',
          name: 'Company 2',
          users: [],
          groups: [],
          _count: {
            users: 0,
            groups: 0,
          },
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.company.findMany.mockResolvedValue(companies as any);

      const result = await service.findAll(userId);

      expect(prismaService.company.findMany).toHaveBeenCalled();
      expect(result).toEqual(companies);
    });

    it('should return only user company for regular user', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const companies = [
        {
          id: 'company-id',
          name: 'Test Company',
          users: [],
          groups: [],
          _count: {
            users: 0,
            groups: 0,
          },
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.company.findMany.mockResolvedValue(companies as any);

      const result = await service.findAll(userId);

      expect(prismaService.company.findMany).toHaveBeenCalledWith({
        where: { id: user.companyId },
        include: expect.any(Object),
      });
      expect(result).toEqual(companies);
    });
  });

  describe('findOne', () => {
    it('should return company if user has access', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      const company = {
        id: 'company-id',
        name: 'Test Company',
        users: [],
        groups: [],
        _count: {
          users: 0,
          groups: 0,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.company.findUnique.mockResolvedValue(company as any);

      const result = await service.findOne('company-id', userId);

      expect(result).toEqual(company);
    });

    it('should throw ForbiddenException if accessing different company', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(service.findOne('company-2', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateCompanyDto: UpdateCompanyDto = {
      name: 'Updated Company',
      description: 'Updated Description',
    };

    it('should update company successfully as ADMIN', async () => {
      const userId = 'admin-id';
      const user = {
        id: userId,
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const updatedCompany = {
        id: 'company-id',
        ...updateCompanyDto,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.company.update.mockResolvedValue(updatedCompany as any);

      const result = await service.update(
        'company-id',
        updateCompanyDto,
        userId,
      );

      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-id' },
        data: updateCompanyDto,
      });
      expect(result).toEqual(updatedCompany);
    });

    it('should throw ForbiddenException if not ADMIN', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(
        service.update('company-id', updateCompanyDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete company successfully as ADMIN', async () => {
      const userId = 'admin-id';
      const user = {
        id: userId,
        role: Role.ADMIN,
        companyId: 'company-id',
      };

      const company = {
        id: 'company-id',
        name: 'Test Company',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockPrismaService.company.delete.mockResolvedValue(company as any);

      await service.remove('company-id', userId);

      expect(prismaService.company.delete).toHaveBeenCalledWith({
        where: { id: 'company-id' },
      });
    });

    it('should throw ForbiddenException if not ADMIN', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        role: Role.USER,
        companyId: 'company-id',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      await expect(service.remove('company-id', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
