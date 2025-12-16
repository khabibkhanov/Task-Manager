import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: Role.USER,
    };

    it('should register a new user successfully', async () => {
      // Mock user not exists
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Mock user creation
      const createdUser = {
        id: 'user-id',
        email: registerDto.email,
        name: registerDto.name,
        role: registerDto.role,
        companyId: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser as any);

      // Mock JWT sign
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Mock bcrypt.hash
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      const result = await service.register(registerDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          password: 'hashed-password',
          name: registerDto.name,
          role: registerDto.role,
          companyId: registerDto.companyId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true,
          createdAt: true,
        },
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
    });

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = {
        id: 'existing-id',
        email: registerDto.email,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should use default role USER if not provided', async () => {
      const registerDtoWithoutRole: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      const createdUser = {
        id: 'user-id',
        email: registerDtoWithoutRole.email,
        name: registerDtoWithoutRole.name,
        role: Role.USER,
        companyId: null,
        createdAt: new Date(),
      };
      mockPrismaService.user.create.mockResolvedValue(createdUser as any);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      await service.register(registerDtoWithoutRole);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: Role.USER,
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully with valid credentials', async () => {
      const user = {
        id: 'user-id',
        email: loginDto.email,
        password: 'hashed-password',
        name: 'Test User',
        role: Role.USER,
        companyId: 'company-id',
        company: {
          id: 'company-id',
          name: 'Test Company',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: { company: true },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const user = {
        id: 'user-id',
        email: loginDto.email,
        password: 'hashed-password',
        name: 'Test User',
        role: Role.USER,
        companyId: 'company-id',
        company: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user data if user exists', async () => {
      const userId = 'user-id';
      const user = {
        id: userId,
        email: 'test@example.com',
        role: Role.USER,
        companyId: 'company-id',
        company: {
          id: 'company-id',
          name: 'Test Company',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user as any);

      const result = await service.validateUser(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { company: true },
      });
      expect(result).toEqual({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('non-existent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
