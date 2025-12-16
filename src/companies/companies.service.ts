import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Role } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto, userId: string) {
    // Create company
    const company = await this.prisma.company.create({
      data: {
        name: createCompanyDto.name,
        description: createCompanyDto.description,
      },
    });

    // Update user to be admin of this company
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        companyId: company.id,
        role: Role.ADMIN,
      },
    });

    // Create default groups for the company
    const defaultGroups = [
      { name: 'Todo', description: 'Tasks to be done', isDefault: true },
      { name: 'In Progress', description: 'Tasks in progress', isDefault: true },
      { name: 'Done', description: 'Completed tasks', isDefault: true },
    ];

    await Promise.all(
      defaultGroups.map((group) =>
        this.prisma.group.create({
          data: {
            ...group,
            companyId: company.id,
            ownerId: userId,
          },
        }),
      ),
    );

    return company;
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN can see all companies
    if (user.role === Role.SUPERADMIN) {
      return this.prisma.company.findMany({
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          groups: true,
          _count: {
            select: {
              users: true,
              groups: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Company admin and others see only their company
    if (!user.companyId) {
      return [];
    }

    return this.prisma.company.findMany({
      where: { id: user.companyId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        groups: true,
        _count: {
          select: {
            users: true,
            groups: true,
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN can see any company
    // Others can only see their own company
    if (user.role !== Role.SUPERADMIN && user.companyId !== id) {
      throw new ForbiddenException('Access denied');
    }

    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        groups: {
          include: {
            _count: {
              select: {
                tasks: true,
                members: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            groups: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN can update any company
    // Company ADMIN can only update their own company
    if (user.role === Role.SUPERADMIN) {
      // SUPERADMIN can update any company
    } else if (user.role === Role.ADMIN && user.companyId === id) {
      // Company admin can update their own company
    } else {
      throw new ForbiddenException('Only admin can update company');
    }

    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN can delete any company
    // Company ADMIN can only delete their own company
    if (user.role === Role.SUPERADMIN) {
      // SUPERADMIN can delete any company
    } else if (user.role === Role.ADMIN && user.companyId === id) {
      // Company admin can delete their own company
    } else {
      throw new ForbiddenException('Only admin can delete company');
    }

    return this.prisma.company.delete({
      where: { id },
    });
  }
}

