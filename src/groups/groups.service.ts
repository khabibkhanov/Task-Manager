import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Role } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createGroupDto: CreateGroupDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SUPERADMIN cannot create groups (must belong to a company)
    // Others must belong to a company
    if (user.role !== Role.SUPERADMIN && !user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }

    // SUPERADMIN cannot create groups without company
    if (user.role === Role.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot create groups');
    }

    return this.prisma.group.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        ownerId: userId,
        companyId: user.companyId,
        isDefault: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    // SUPERADMIN can see all groups from all companies
    if (user.role === Role.SUPERADMIN) {
      return this.prisma.group.findMany({
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    }

    // Others see only their company groups
    if (!user.companyId) {
      return [];
    }

    return this.prisma.group.findMany({
      where: { companyId: user.companyId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
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
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // SUPERADMIN can see any group
    // Others can only see groups from their company
    if (user.role !== Role.SUPERADMIN && group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // SUPERADMIN can update any group
    // Others can only update groups from their company
    if (user.role !== Role.SUPERADMIN && group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    // SUPERADMIN, owner, ADMIN, or MANAGER can update
    const canUpdate =
      user.role === Role.SUPERADMIN ||
      group.ownerId === userId ||
      user.role === Role.ADMIN ||
      user.role === Role.MANAGER;

    if (!canUpdate) {
      throw new ForbiddenException(
        'Only owner, admin, or manager can update group',
      );
    }

    // Prevent updating default groups
    if (group.isDefault && updateGroupDto.name) {
      throw new ForbiddenException('Cannot rename default groups');
    }

    return this.prisma.group.update({
      where: { id },
      data: {
        name: updateGroupDto.name,
        description: updateGroupDto.description,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // SUPERADMIN can delete any group
    // Others can only delete groups from their company
    if (user.role !== Role.SUPERADMIN && group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    // Prevent deleting default groups
    if (group.isDefault) {
      throw new ForbiddenException('Cannot delete default groups');
    }

    // SUPERADMIN, owner, or ADMIN can delete
    const canDelete =
      user.role === Role.SUPERADMIN ||
      group.ownerId === userId ||
      user.role === Role.ADMIN;

    if (!canDelete) {
      throw new ForbiddenException('Only owner or admin can delete group');
    }

    return this.prisma.group.delete({
      where: { id },
    });
  }

  async addMember(groupId: string, memberId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // SUPERADMIN can add members to any group
    // Others can only add to groups from their company
    if (user.role !== Role.SUPERADMIN && group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if member belongs to same company (or SUPERADMIN)
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // SUPERADMIN can add any user, others can only add users from same company
    if (user.role !== Role.SUPERADMIN && member.companyId !== user.companyId) {
      throw new ForbiddenException('Member must belong to same company');
    }

    return this.prisma.userGroup.upsert({
      where: {
        userId_groupId: {
          userId: memberId,
          groupId: groupId,
        },
      },
      update: {},
      create: {
        userId: memberId,
        groupId: groupId,
        role: Role.USER,
      },
    });
  }

  async removeMember(groupId: string, memberId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // SUPERADMIN can remove members from any group
    // Others can only remove from groups in their company
    if (user.role !== Role.SUPERADMIN && group.companyId !== user.companyId) {
      throw new ForbiddenException('Access denied');
    }

    // SUPERADMIN, owner, ADMIN, or MANAGER can remove members
    const canRemove =
      user.role === Role.SUPERADMIN ||
      group.ownerId === userId ||
      user.role === Role.ADMIN ||
      user.role === Role.MANAGER;

    if (!canRemove) {
      throw new ForbiddenException(
        'Only owner, admin, or manager can remove members',
      );
    }

    return this.prisma.userGroup.delete({
      where: {
        userId_groupId: {
          userId: memberId,
          groupId: groupId,
        },
      },
    });
  }
}
