import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DATABASE_POOL } from '../database/database.provider';
import { REDIS_CLIENT } from '../database/redis.provider';
import { TasksGateway } from './tasks.gateway';

describe('TasksService', () => {
  let service: TasksService;

  // Mock cho Pool - chỉ cần method `query` vì đó là method duy nhất Service dùng
  const mockPool = {
    query: jest.fn(),
  };

  // Mock cho Redis - cần get, set, del, keys (dùng bởi invalidateCache)
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue(['tasks:user:1']),
  };

  // Mock cho Gateway - cần 3 hàm emit
  const mockGateway = {
    emitTaskCreated: jest.fn(),
    emitTaskUpdated: jest.fn(),
    emitTaskDeleted: jest.fn(),
    emitTaskRestored: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: DATABASE_POOL, useValue: mockPool },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: TasksGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    // Reset lại mock trước mỗi test, tránh test trước ảnh hưởng test sau
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('trả về từ cache khi cache HIT, không query DB', async () => {
      const cachedTasks = [{ id: 1, title: 'cached' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedTasks));

      const result = await service.findAll(1);

      expect(result).toEqual(cachedTasks);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('query DB và set cache khi cache MISS', async () => {
      const dbTasks = [{ id: 1, title: 'from db' }];
      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: dbTasks });

      const result = await service.findAll(1);

      expect(result).toEqual(dbTasks);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'tasks:user:1',
        JSON.stringify(dbTasks),
        'EX',
        30,
      );
    });
  });

  describe('findOne', () => {
    it('throw NotFoundException khi không tìm thấy task', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('trả về task khi tìm thấy', async () => {
      const task = { id: 1, title: 'task 1' };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await service.findOne(1, 1);

      expect(result).toEqual(task);
    });
  });

  describe('create', () => {
    it('insert task, xoá cache và emit event', async () => {
      const task = { id: 1, title: 'new task' };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await service.create(
        { title: 'new task', description: '' },
        1,
      );

      expect(result).toEqual(task);
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskCreated).toHaveBeenCalledWith(1, task);
    });
  });

  describe('update', () => {
    it('throw NotFoundException khi task không tồn tại', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(service.update(1, { title: 'updated' }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throw NotFoundException khi user chỉ có quyền view (không được sửa)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 2, permission: 'view' }],
      });

      await expect(service.update(1, { title: 'updated' }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('update task khi là owner, xoá cache và emit event', async () => {
      const task = { id: 1, title: 'updated' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 1, permission: null }] }) // checkAccess: owner
        .mockResolvedValueOnce({ rows: [task] }); // UPDATE ... RETURNING *

      const result = await service.update(1, { title: 'updated' }, 1);

      expect(result).toEqual(task);
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskUpdated).toHaveBeenCalledWith(1, task);
    });

    it('update task khi user được share permission = edit', async () => {
      const task = { id: 1, title: 'updated' };
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 2, permission: 'edit' }] }) // checkAccess: shared editor
        .mockResolvedValueOnce({ rows: [task] });

      const result = await service.update(1, { title: 'updated' }, 1);

      expect(result).toEqual(task);
      // cache/socket phải nhắm vào chủ task (userId 2), không phải người đang sửa (userId 1)
      expect(mockRedis.keys).toHaveBeenCalledWith('tasks:user:2*');
      expect(mockGateway.emitTaskUpdated).toHaveBeenCalledWith(2, task);
    });
  });

  describe('remove', () => {
    it('throw NotFoundException khi task không tồn tại', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('throw NotFoundException khi user chỉ có quyền view (không được xoá)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 2, permission: 'view' }],
      });

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('xoá cache và emit event khi xoá thành công (owner)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ user_id: 1, permission: null }] }) // checkAccess: owner
        .mockResolvedValueOnce({ rowCount: 1 }); // DELETE

      await service.remove(1, 1);

      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskDeleted).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('restore', () => {
    it('throw NotFoundException khi task không tồn tại/không bị xoá/không phải owner', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(service.restore(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('khôi phục task, xoá cache và emit event', async () => {
      const task = { id: 1, title: 'restored', deleted_at: null };
      mockPool.query.mockResolvedValue({ rows: [task] });

      const result = await service.restore(1, 1);

      expect(result).toEqual(task);
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskRestored).toHaveBeenCalledWith(1, task);
    });
  });
});
