import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { DATABASE_POOL } from '../database/database.provider';
import { UpdateTaskDto } from './dto/update-task.dto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../database/redis.provider';
import { TasksGateway } from './tasks.gateway';

@Injectable()
export class TasksService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis, // thêm dòng này
    private readonly tasksGateWay: TasksGateway,
  ) {}
  /** Xác thực quyền truy cập task, trả về id chủ sở hữu nếu hợp lệ. */
  private async checkAccess(
    taskId: number,
    userId: number,
    requireEdit: boolean,
  ): Promise<number> {
    const res = await this.pool.query<{
      user_id: number | null;
      permission: 'view' | 'edit' | null;
    }>(
      `SELECT t.user_id, ts.permission
     FROM tasks t
     LEFT JOIN task_shares ts ON ts.task_id = t.id AND ts.shared_with_user_id = $2
     WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [taskId, userId],
    );

    const row = res.rows[0];
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
    let query = `SELECT t.* FROM tasks t WHERE (t.user_id = $1 OR EXISTS (
      SELECT 1 FROM task_shares ts WHERE ts.task_id = t.id AND ts.shared_with_user_id = $1
    )) AND t.deleted_at IS NULL`;
    const params: (number | boolean)[] = [userId];

    if (is_completed === 'true' || is_completed === 'false') {
      params.push(is_completed === 'true');
      query += ` AND is_completed = $${params.length}`;
    }

    const allowedSortFields = ['created_at', 'priority', 'due_date'];
    const allowedOrders = ['asc', 'desc'];

    if (
      sortBy &&
      order &&
      allowedSortFields.includes(sortBy) &&
      allowedOrders.includes(order)
    ) {
      query += ` ORDER BY ${sortBy} ${order.toUpperCase()}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    const res = await this.pool.query<Task>(query, params);

    await this.redis.set(cacheKey, JSON.stringify(res.rows), 'EX', 30);

    return res.rows;
  }

  /** Owner-only lookup — dùng để các module khác (labels, comments, shares) kiểm tra quyền sở hữu. */
  async findOne(id: number, userId: number): Promise<Task> {
    const res = await this.pool.query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId],
    );
    const task = res.rows[0];
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  /** Owner hoặc user được share (view/edit) đều xem được. */
  async findOneAccessible(id: number, userId: number): Promise<Task> {
    await this.checkAccess(id, userId, false);
    const res = await this.pool.query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return res.rows[0];
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    userId: number,
  ): Promise<Task> {
    const { title, description, is_completed, priority, due_date } =
      updateTaskDto;
    if (
      updateTaskDto.due_date &&
      new Date(updateTaskDto.due_date) < new Date()
    ) {
      throw new BadRequestException('Due date cannot be in the past');
    }
    // chỉ owner hoặc user có permission = 'edit' mới được sửa
    const ownerId = await this.checkAccess(id, userId, true);
    const res = await this.pool.query<Task>(
      'UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), is_completed = COALESCE($3, is_completed), priority=COALESCE($4,priority), due_date=COALESCE($5,due_date) WHERE id = $6 RETURNING *',
      [title, description, is_completed, priority, due_date, id],
    );
    const task = res.rows[0];
    await this.invalidateCache(ownerId);
    this.tasksGateWay.emitTaskUpdated(ownerId, task);
    return task;
  }

  async remove(id: number, userId: number): Promise<void> {
    // chỉ owner hoặc user có permission = 'edit' mới được xóa
    const ownerId = await this.checkAccess(id, userId, true);
    await this.pool.query('UPDATE tasks SET deleted_at = now() WHERE id = $1', [
      id,
    ]);
    await this.invalidateCache(ownerId);
    this.tasksGateWay.emitTaskDeleted(ownerId, id);
  }

  async create(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    const { title, description, priority, due_date } = createTaskDto;
    if (
      createTaskDto.due_date &&
      new Date(createTaskDto.due_date) < new Date()
    ) {
      throw new BadRequestException('Due date cannot be in the past');
    }
    const result = await this.pool.query<Task>(
      'INSERT INTO tasks (title, description, user_id, priority, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, userId, priority ?? 'medium', due_date],
    );
    const task = result.rows[0];
    await this.invalidateCache(userId);
    this.tasksGateWay.emitTaskCreated(userId, task);

    return task;
  }
  async restore(id: number, userId: number): Promise<Task> {
    // Chỉ owner mới khôi phục được (không cho share user restore)
    const res = await this.pool.query<Task>(
      'UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING *',
      [id, userId],
    );
    const task = res.rows[0];
    if (!task) {
      throw new NotFoundException('Task not found or not deleted');
    }
    await this.invalidateCache(userId);
    this.tasksGateWay.emitTaskRestored(userId, task);
    return task;
  }
}
