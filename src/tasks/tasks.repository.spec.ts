import { Test, TestingModule } from '@nestjs/testing';
import { TasksRepository } from './tasks.repository';
import { DATABASE_POOL } from '../database/database.provider';

describe('TasksRepository', () => {
  let repository: TasksRepository;

  // Mock cho Pool - chỉ cần method `query` vì đó là method duy nhất Repository dùng
  const mockPool = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksRepository,
        { provide: DATABASE_POOL, useValue: mockPool },
      ],
    }).compile();

    repository = module.get<TasksRepository>(TasksRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAllByUserId', () => {
    it('query task sở hữu + task được share, lọc task đã xoá mềm', async () => {
      const tasks = [{ id: 1, title: 'task 1' }];
      mockPool.query.mockResolvedValue({ rows: tasks });

      const result = await repository.findAllByUserId(1);

      expect(result).toEqual(tasks);
      const [query, params] = mockPool.query.mock.calls[0] as [
        string,
        unknown[],
      ];
      expect(query).toContain('task_shares');
      expect(query).toContain('deleted_at IS NULL');
      expect(params).toEqual([1]);
    });

    it('thêm điều kiện is_completed khi có truyền vào', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findAllByUserId(1, 'true');

      const [query, params] = mockPool.query.mock.calls[0] as [
        string,
        unknown[],
      ];
      expect(query).toContain('is_completed');
      expect(params).toEqual([1, true]);
    });
  });

  describe('checkAccess', () => {
    it('trả về undefined khi task không tồn tại (đã bị xoá mềm hoặc không có)', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.checkAccess(1, 1);

      expect(result).toBeUndefined();
    });

    it('trả về user_id + permission khi tìm thấy', async () => {
      const row = { user_id: 1, permission: null };
      mockPool.query.mockResolvedValue({ rows: [row] });

      const result = await repository.checkAccess(1, 1);

      expect(result).toEqual(row);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [1, 1]);
    });
  });

  describe('findOneById', () => {
    it('trả về undefined khi không tìm thấy', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findOneById(1);

      expect(result).toBeUndefined();
    });

    it('trả về task khi tìm thấy', async () => {
      const task = { id: 1, title: 'task 1' };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await repository.findOneById(1);

      expect(result).toEqual(task);
    });
  });

  describe('insert', () => {
    it('insert task với giá trị mặc định priority = medium khi không truyền', async () => {
      const task = { id: 1, title: 'new task' };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await repository.insert({ title: 'new task' }, 1);

      expect(result).toEqual(task);
      const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(params).toEqual(['new task', undefined, 1, 'medium', undefined]);
    });
  });

  describe('updateById', () => {
    it('gọi query UPDATE với đúng tham số', async () => {
      const task = { id: 1, title: 'updated' };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await repository.updateById(1, { title: 'updated' });

      expect(result).toEqual(task);
      const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(params).toEqual([
        'updated',
        undefined,
        undefined,
        undefined,
        undefined,
        1,
      ]);
    });
  });

  describe('softDeleteById', () => {
    it('gọi query UPDATE deleted_at = now()', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      await repository.softDeleteById(1);

      const [query, params] = mockPool.query.mock.calls[0] as [
        string,
        unknown[],
      ];
      expect(query).toContain('deleted_at = now()');
      expect(params).toEqual([1]);
    });
  });

  describe('restoreById', () => {
    it('trả về undefined khi task không tồn tại/không bị xoá/không phải owner', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.restoreById(1, 1);

      expect(result).toBeUndefined();
    });

    it('trả về task khi restore thành công', async () => {
      const task = { id: 1, title: 'restored', deleted_at: null };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await repository.restoreById(1, 1);

      expect(result).toEqual(task);
      expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [1, 1]);
    });
  });
});
