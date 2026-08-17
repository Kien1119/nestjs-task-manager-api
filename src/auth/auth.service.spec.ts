import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../database/redis.provider';

// bcrypt là native binding, jest.spyOn không redefine được property của nó -> mock cả module
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;

  // Mock cho UsersService
  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updatePassword: jest.fn(),
  };

  // Mock cho JwtService
  const mockJwtService = {
    signAsync: jest.fn(),
  };

  // Mock cho Redis - cần set (dùng bởi login để lưu refresh token)
  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset lại mock trước mỗi test, tránh test trước ảnh hưởng test sau
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('đăng ký thành công khi email chưa tồn tại', async () => {
      mockUsersService.findByEmail.mockResolvedValue(undefined);
      const createdUser = {
        id: 1,
        email: 'new@example.com',
        created_at: new Date(),
      };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'new@example.com',
        'hashed-password',
      );
    });

    it('throw lỗi khi email đã tồn tại (code hiện tại throw Error thường, không phải ConflictException)', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'exist@example.com',
        password: 'hashed',
        roles: ['user'],
        created_at: new Date(),
      });

      await expect(
        service.register({
          email: 'exist@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow('User already exists');
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const user = {
      id: 1,
      email: 'user@example.com',
      password: 'hashed-password',
      roles: ['user'],
      created_at: new Date(),
    };

    it('login thành công, trả accessToken và gọi jwtService.signAsync', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.login({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed-jwt-token');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { userId: 1, email: 'user@example.com', roles: ['user'] },
        { expiresIn: '15m' },
      );
    });

    it('throw UnauthorizedException khi sai password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throw UnauthorizedException khi email không tồn tại', async () => {
      mockUsersService.findByEmail.mockResolvedValue(undefined);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
