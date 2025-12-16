import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Role } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    updatePassword: jest.fn(),
    remove: jest.fn(),
    getMyProfile: jest.fn(),
  };

  const mockCurrentUser = {
    userId: 'user-id',
    email: 'user@example.com',
    role: Role.USER,
    companyId: 'company-id',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: Role.USER,
      };

      const expectedUser = {
        id: 'new-user-id',
        ...createUserDto,
        companyId: 'company-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(expectedUser as any);

      const result = await controller.create(createUserDto, mockCurrentUser);

      expect(usersService.create).toHaveBeenCalledWith(
        createUserDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedUser);
    });
  });

  describe('findAll', () => {
    it('should return list of users', async () => {
      const filterDto: FilterUserDto = {
        role: Role.USER,
      };

      const expectedUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          role: Role.USER,
          companyId: 'company-id',
        },
      ];

      mockUsersService.findAll.mockResolvedValue(expectedUsers as any);

      const result = await controller.findAll(filterDto, mockCurrentUser);

      expect(usersService.findAll).toHaveBeenCalledWith(
        filterDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const userId = 'target-user-id';
      const expectedUser = {
        id: userId,
        email: 'target@example.com',
        name: 'Target User',
        role: Role.USER,
        companyId: 'company-id',
      };

      mockUsersService.findOne.mockResolvedValue(expectedUser as any);

      const result = await controller.findOne(userId, mockCurrentUser);

      expect(usersService.findOne).toHaveBeenCalledWith(
        userId,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedUser);
    });
  });

  describe('getMyProfile', () => {
    it('should return current user profile', async () => {
      const expectedProfile = {
        id: mockCurrentUser.userId,
        email: mockCurrentUser.email,
        name: 'Current User',
        role: mockCurrentUser.role,
        companyId: mockCurrentUser.companyId,
      };

      mockUsersService.getMyProfile.mockResolvedValue(expectedProfile as any);

      const result = await controller.getMyProfile(mockCurrentUser);

      expect(usersService.getMyProfile).toHaveBeenCalledWith(
        mockCurrentUser.userId,
      );
      expect(result).toEqual(expectedProfile);
    });
  });

  describe('updateMe', () => {
    it('should update current user', async () => {
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = {
        id: mockCurrentUser.userId,
        ...updateUserDto,
        email: mockCurrentUser.email,
        role: mockCurrentUser.role,
      };

      mockUsersService.update.mockResolvedValue(updatedUser as any);

      const result = await controller.updateMe(updateUserDto, mockCurrentUser);

      expect(usersService.update).toHaveBeenCalledWith(
        mockCurrentUser.userId,
        updateUserDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('update', () => {
    it('should update user by id', async () => {
      const userId = 'target-user-id';
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
      };

      const updatedUser = {
        id: userId,
        ...updateUserDto,
        email: 'target@example.com',
      };

      mockUsersService.update.mockResolvedValue(updatedUser as any);

      const result = await controller.update(
        userId,
        updateUserDto,
        mockCurrentUser,
      );

      expect(usersService.update).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userId = 'user-id';
      const updatePasswordDto: UpdatePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      const updatedUser = {
        id: userId,
        email: 'user@example.com',
        name: 'User',
        updatedAt: new Date(),
      };

      mockUsersService.updatePassword.mockResolvedValue(updatedUser as any);

      const result = await controller.updatePassword(
        userId,
        updatePasswordDto,
        mockCurrentUser,
      );

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        userId,
        updatePasswordDto,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const userId = 'target-user-id';
      const deletedUser = {
        id: userId,
        email: 'target@example.com',
      };

      mockUsersService.remove.mockResolvedValue(deletedUser as any);

      const result = await controller.remove(userId, mockCurrentUser);

      expect(usersService.remove).toHaveBeenCalledWith(
        userId,
        mockCurrentUser.userId,
      );
      expect(result).toEqual(deletedUser);
    });
  });
});
