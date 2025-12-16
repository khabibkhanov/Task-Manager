import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  create(
    @Body() createGroupDto: CreateGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.groupsService.create(createGroupDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups for user company' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  findAll(@CurrentUser() user: any) {
    return this.groupsService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by ID' })
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.groupsService.update(id, updateGroupDto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.groupsService.remove(id, user.userId);
  }

  @Post(':id/members/:memberId')
  @ApiOperation({ summary: 'Add member to group' })
  @ApiResponse({ status: 200, description: 'Member added' })
  addMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.groupsService.addMember(id, memberId, user.userId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from group' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.groupsService.removeMember(id, memberId, user.userId);
  }
}
