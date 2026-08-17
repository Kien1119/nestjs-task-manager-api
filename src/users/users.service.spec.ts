import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DATABASE_POOL } from '../database/database.provider';

describe('UsersService', () => {
  let service: UsersService;

  // Mock cho Pool - chỉ cần method `query` vì đó là method duy nhất Service dùng
  const mockPool = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DATABASE_POOL, useValue: mockPool }],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Reset lại mock trước mỗi test, tránh test trước ảnh hưởng test sau
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('trả về đúng user khi tìm thấy', async () => {
      const user = { id: 1, email: 'user@example.com', password: 'hashed' };
      mockPool.query.mockResolvedValue({ rows: [user] });

      const result = await service.findByEmail('user@example.com');

      expect(result).toEqual(user);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['user@example.com'],
      );
    });

    it('trả về undefined khi không tìm thấy (không throw)', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('trả về đúng user khi tìm thấy', async () => {
      const user = { id: 1, email: 'user@example.com', password: 'hashed' };
      mockPool.query.mockResolvedValue({ rows: [user] });

      const result = await service.findById(1);

      expect(result).toEqual(user);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
    });

    it('trả về undefined khi không tìm thấy (không throw)', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('insert user và trả về đúng user vừa tạo', async () => {
      const createdUser = {
        id: 1,
        email: 'new@example.com',
        created_at: new Date(),
      };
      mockPool.query.mockResolvedValue({ rows: [createdUser] });

      const result = await service.create('new@example.com', 'hashed-password');

      expect(result).toEqual(createdUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
        ['new@example.com', 'hashed-password'],
      );
    });
  });

  describe('updatePassword', () => {
    it('gọi query UPDATE đúng tham số', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await service.updatePassword(1, 'new-hashed-password');

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET password = $1 WHERE id = $2',
        ['new-hashed-password', 1],
      );
    });
  });
});
