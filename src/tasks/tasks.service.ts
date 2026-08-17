import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { UpdateTaskDto } from './dto/update-task.dto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../database/redis.provider';
import { TasksGateway } from './tasks.gateway';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis, // thêm dòng này
    private readonly tasksGateWay: TasksGateway,
  ) {}

  /** Xác thực quyền truy cập task, trả về id chủ sở hữu nếu hợp lệ. */
  private async checkAccess(
    taskId: number,
    userId: number,
    requireEdit: boolean,
  ): Promise<number> {
    const row = await this.tasksRepository.checkAccess(taskId, userId);

    if (!row) {
      throw new NotFoundException('Task not found');
    }

    const isOwner = row.user_id === userId;
    const hasEditPermission = row.permission === 'edit';

    if (!isOwner && row.permission === null) {
      throw new NotFoundException('Task not found'); // không share, không sở hữu
    }

    if (!isOwner && !hasEditPermission && requireEdit) {
      throw new NotFoundException('Task not found'); // vẫn 404, không lộ thông tin
    }

    return row.user_id as number;
  }

  private getCacheKey(userId: number): string {
    // thêm hàm này
    return `tasks:user:${userId}`;
  }

  async invalidateCache(userId: number): Promise<void> {
    const keys = await this.redis.keys(`${this.getCacheKey(userId)}*`);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  async findAll(
    userId: number,
    is_completed?: string,
    sortBy?: string,
    order?: string,
  ): Promise<Task[]> {
    const cacheKey =
      this.getCacheKey(userId) +
      (is_completed !== undefined ? `:is_completed:${is_completed}` : '') +
      (sortBy ? `:sortBy:${sortBy}` : '') +
      (order ? `:order:${order}` : '');
    const cached = await this.redis.get(cacheKey);

    // 1. Kiểm tra cache trước
    if (cached) {
      return JSON.parse(cached) as Task[];
    }

    // 2. Cache miss -> query DB
    const tasks = await this.tasksRepository.findAllByUserId(
      userId,
      is_completed,
      sortBy,
      order,
    );

    await this.redis.set(cacheKey, JSON.stringify(tasks), 'EX', 30);

    return tasks;
  }

  /** Owner-only lookup — dùng để các module khác (labels, comments, shares) kiểm tra quyền sở hữu. */
  async findOne(id: number, userId: number): Promise<Task> {
    const task = await this.tasksRepository.findOneById(id);
    if (!task || task.user_id !== userId) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  /** Owner hoặc user được share (view/edit) đều xem được. */
  async findOneAccessible(id: number, userId: number): Promise<Task> {
    await this.checkAccess(id, userId, false);
    // checkAccess đã xác nhận task tồn tại nên record chắc chắn có
    return (await this.tasksRepository.findOneById(id)) as Task;
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: number,
  ): Promise<Task> {
    if (
      updateTaskDto.due_date &&
      new Date(updateTaskDto.due_date) < new Date()
    ) {
      throw new BadRequestException('Due date cannot be in the past');
    }
    // chỉ owner hoặc user có permission = 'edit' mới được sửa
    const ownerId = await this.checkAccess(id, userId, true);
    const task = (await this.tasksRepository.updateById(
      id,
      updateTaskDto,
    )) as Task;
    await this.invalidateCache(ownerId);
    this.tasksGateWay.emitTaskUpdated(ownerId, task);
    return task;
  }

  async remove(id: number, userId: number): Promise<void> {
    // chỉ owner hoặc user có permission = 'edit' mới được xóa
    const ownerId = await this.checkAccess(id, userId, true);
    await this.tasksRepository.softDeleteById(id);
    await this.invalidateCache(ownerId);
    this.tasksGateWay.emitTaskDeleted(ownerId, id);
  }

  async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    if (
      createTaskDto.due_date &&
      new Date(createTaskDto.due_date) < new Date()
    ) {
      throw new BadRequestException('Due date cannot be in the past');
    }
    const task = await this.tasksRepository.insert(createTaskDto, userId);
    await this.invalidateCache(userId);
    this.tasksGateWay.emitTaskCreated(userId, task);

    return task;
  }

  async restore(id: number, userId: number): Promise<Task> {
    // Chỉ owner mới khôi phục được (không cho share user restore)
    const task = await this.tasksRepository.restoreById(id, userId);
    if (!task) {
      throw new NotFoundException('Task not found or not deleted');
    }
    await this.invalidateCache(userId);
    this.tasksGateWay.emitTaskRestored(userId, task);
    return task;
  }
}
