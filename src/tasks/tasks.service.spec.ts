import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { REDIS_CLIENT } from '../database/redis.provider';
import { TasksGateway } from './tasks.gateway';

describe('TasksService', () => {
  let service: TasksService;

  // Mock cho TasksRepository - toàn bộ query giờ nằm ở đây, service chỉ gọi qua interface này
  const mockTasksRepository = {
    findAllByUserId: jest.fn(),
    checkAccess: jest.fn(),
    findOneById: jest.fn(),
    insert: jest.fn(),
    updateById: jest.fn(),
    softDeleteById: jest.fn(),
    restoreById: jest.fn(),
  };

  // Mock cho Redis - cần get, set, del, keys (dùng bởi invalidateCache)
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue(['tasks:user:1']),
  };

  // Mock cho Gateway - cần 4 hàm emit
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
        { provide: TasksRepository, useValue: mockTasksRepository },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: TasksGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    // Reset lại mock trước mỗi test, tránh test trước ảnh hưởng test sau
    jest.clearAllMocks();
    mockRedis.keys.mockResolvedValue(['tasks:user:1']);
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
      expect(mockTasksRepository.findAllByUserId).not.toHaveBeenCalled();
    });

    it('query DB và set cache khi cache MISS', async () => {
      const dbTasks = [{ id: 1, title: 'from db' }];
      mockRedis.get.mockResolvedValue(null);
      mockTasksRepository.findAllByUserId.mockResolvedValue(dbTasks);

      const result = await service.findAll(1);

      expect(result).toEqual(dbTasks);
      expect(mockTasksRepository.findAllByUserId).toHaveBeenCalledWith(
        1,
        undefined,
        undefined,
        undefined,
      );
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
      mockTasksRepository.findOneById.mockResolvedValue(undefined);

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('throw NotFoundException khi task không thuộc sở hữu của userId', async () => {
      mockTasksRepository.findOneById.mockResolvedValue({
        id: 1,
        title: 'task 1',
        user_id: 2,
      });

      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('trả về task khi tìm thấy và đúng owner', async () => {
      const task = { id: 1, title: 'task 1', user_id: 1 };
      mockTasksRepository.findOneById.mockResolvedValue(task);

      const result = await service.findOne(1, 1);

      expect(result).toEqual(task);
    });
  });

  describe('create', () => {
    it('insert task, xoá cache và emit event', async () => {
      const task = { id: 1, title: 'new task' };
      mockTasksRepository.insert.mockResolvedValue(task);

      const result = await service.create(
        { title: 'new task', description: '' },
        1,
      );

      expect(result).toEqual(task);
      expect(mockTasksRepository.insert).toHaveBeenCalledWith(
        { title: 'new task', description: '' },
        1,
      );
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskCreated).toHaveBeenCalledWith(1, task);
    });
  });

  describe('update', () => {
    it('throw NotFoundException khi task không tồn tại', async () => {
      mockTasksRepository.checkAccess.mockResolvedValue(undefined);

      await expect(service.update(1, { title: 'updated' }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throw NotFoundException khi user chỉ có quyền view (không được sửa)', async () => {
      mockTasksRepository.checkAccess.mockResolvedValueOnce({
        user_id: 2,
        permission: 'view',
      });

      await expect(service.update(1, { title: 'updated' }, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('update task khi là owner, xoá cache và emit event', async () => {
      const task = { id: 1, title: 'updated' };
      mockTasksRepository.checkAccess.mockResolvedValueOnce({
        user_id: 1,
        permission: null,
      });
      mockTasksRepository.updateById.mockResolvedValueOnce(task);

      const result = await service.update(1, { title: 'updated' }, 1);

      expect(result).toEqual(task);
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskUpdated).toHaveBeenCalledWith(1, task);
    });

    it('update task khi user được share permission = edit', async () => {
      const task = { id: 1, title: 'updated' };
      mockTasksRepository.checkAccess.mockResolvedValueOnce({
        user_id: 2,
        permission: 'edit',
      });
      mockTasksRepository.updateById.mockResolvedValueOnce(task);

      const result = await service.update(1, { title: 'updated' }, 1);

      expect(result).toEqual(task);
      // cache/socket phải nhắm vào chủ task (userId 2), không phải người đang sửa (userId 1)
      expect(mockRedis.keys).toHaveBeenCalledWith('tasks:user:2*');
      expect(mockGateway.emitTaskUpdated).toHaveBeenCalledWith(2, task);
    });
  });

  describe('remove', () => {
    it('throw NotFoundException khi task không tồn tại', async () => {
      mockTasksRepository.checkAccess.mockResolvedValue(undefined);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('throw NotFoundException khi user chỉ có quyền view (không được xoá)', async () => {
      mockTasksRepository.checkAccess.mockResolvedValueOnce({
        user_id: 2,
        permission: 'view',
      });

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('xoá cache và emit event khi xoá thành công (owner)', async () => {
      mockTasksRepository.checkAccess.mockResolvedValueOnce({
        user_id: 1,
        permission: null,
      });

      await service.remove(1, 1);

      expect(mockTasksRepository.softDeleteById).toHaveBeenCalledWith(1);
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskDeleted).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('restore', () => {
    it('throw NotFoundException khi task không tồn tại/không bị xoá/không phải owner', async () => {
      mockTasksRepository.restoreById.mockResolvedValue(undefined);

      await expect(service.restore(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('khôi phục task, xoá cache và emit event', async () => {
      const task = { id: 1, title: 'restored', deleted_at: null };
      mockTasksRepository.restoreById.mockResolvedValue(task);

      const result = await service.restore(1, 1);

      expect(result).toEqual(task);
      expect(mockRedis.del).toHaveBeenCalledWith('tasks:user:1');
      expect(mockGateway.emitTaskRestored).toHaveBeenCalledWith(1, task);
    });
  });
});
