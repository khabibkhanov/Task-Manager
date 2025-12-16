import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // SUPERADMIN can create users in any company
    // Others must belong to a company
    if (currentUser.role !== Role.SUPERADMIN && !currentUser.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    // Only SUPERADMIN, ADMIN and MANAGER can create users
    if (
      currentUser.role !== Role.SUPERADMIN &&
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.MANAGER
    ) {
      throw new ForbiddenException(
        'Only Admin and Manager can create users',
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // SUPERADMIN can create users without company (for future use)
    // Others use their own company
    const companyId = currentUser.companyId || null;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        role: createUserDto.role ?? Role.USER,
        companyId: companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return user;
  }

  async findAll(filterDto: FilterUserDto, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Build where clause
    const where: any = {};

    // SUPERADMIN can see all users from all companies
    // Others can only see users from their company
    if (currentUser.role === Role.SUPERADMIN) {
      // SUPERADMIN can see all users
    } else if (currentUser.companyId) {
      where.companyId = currentUser.companyId;
    } else {
      // Users without company see nothing
      return [];
    }

    if (filterDto.role) {
      where.role = filterDto.role;
    }

    if (filterDto.companyId) {
      // SUPERADMIN can filter by any company
      if (currentUser.role === Role.SUPERADMIN) {
        where.companyId = filterDto.companyId;
      } else if (filterDto.companyId !== currentUser.companyId) {
        throw new ForbiddenException(
          'You can only view users from your company',
        );
      }
    }

    if (filterDto.search) {
      where.OR = [
        { email: { contains: filterDto.search, mode: 'insensitive' } },
        { name: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            ownedGroups: true,
            groups: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            ownedGroups: true,
            groups: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN can view any user
    // Others can only view users from their company (or themselves)
    if (
      currentUser.role !== Role.SUPERADMIN &&
      user.id !== currentUserId &&
      user.companyId !== currentUser.companyId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN can update any user
    // Users can update themselves, or ADMIN/MANAGER can update users in their company
    const canUpdate =
      currentUser.role === Role.SUPERADMIN ||
      user.id === currentUserId ||
      (currentUser.role === Role.ADMIN &&
        user.companyId === currentUser.companyId) ||
      (currentUser.role === Role.MANAGER &&
        user.companyId === currentUser.companyId &&
        user.role !== Role.ADMIN);

    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update this user');
    }

    // Only SUPERADMIN and ADMIN can change roles
    if (
      updateUserDto.role &&
      currentUser.role !== Role.SUPERADMIN &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Only Admin can change user roles');
    }

    // Hash password if provided
    const updateData: any = {};
    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.name !== undefined) updateData.name = updateUserDto.name;
    if (
      updateUserDto.role &&
      (currentUser.role === Role.SUPERADMIN || currentUser.role === Role.ADMIN)
    ) {
      updateData.role = updateUserDto.role;
    }
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
    currentUserId: string,
  ) {
    // Users can only update their own password
    if (id !== currentUserId) {
      throw new ForbiddenException('You can only update your own password');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);

    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, currentUserId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-deletion
    if (user.id === currentUserId) {
      throw new BadRequestException('You cannot delete yourself');
    }

    // SUPERADMIN can delete any user
    // Company ADMIN can only delete users from their company
    if (currentUser.role === Role.SUPERADMIN) {
      // SUPERADMIN can delete any user
    } else if (currentUser.role === Role.ADMIN) {
      // Company admin can only delete users from their company
      if (user.companyId !== currentUser.companyId) {
        throw new ForbiddenException(
          'You can only delete users from your company',
        );
      }
    } else {
      throw new ForbiddenException('Only Admin can delete users');
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            ownedGroups: true,
            groups: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
