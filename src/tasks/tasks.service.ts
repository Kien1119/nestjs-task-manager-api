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
  private getCacheKey(userId: number): string {
    // thêm hàm này
    return `tasks:user:${userId}`;
  }
  async findAll(userId: number): Promise<Task[]> {
    const cacheKey = this.getCacheKey(userId);
    const cached = await this.redis.get(cacheKey);

    // 1. Kiểm tra cache trước
    if (cached) {
      console.log('cache HIT');
      return JSON.parse(cached) as Task[];
    }

    // 2. Cache miss -> query DB
    console.log('💾 Cache MISS - querying DB');

    const res = await this.pool.query<Task>(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );

    await this.redis.set(cacheKey, JSON.stringify(res.rows), 'EX', 30);

    return res.rows;
  }

  async findOne(id: number, userId: number): Promise<Task> {
    const res = await this.pool.query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    const task = res.rows[0];
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
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
    const res = await this.pool.query<Task>(
      'UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), is_completed = COALESCE($3, is_completed), priority=COALESCE($4,priority), due_date=COALESCE($5,due_date) WHERE id = $6 AND user_id = $7 RETURNING *',
      [title, description, is_completed, priority, due_date, id, userId],
    );
    const task = res.rows[0];
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    await this.redis.del(this.getCacheKey(userId));
    this.tasksGateWay.emitTaskUpdated(userId, task);
    return task;
  }

  async remove(id: number, userId: number): Promise<void> {
    const res = await this.pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );
    if ((res.rowCount ?? 0) === 0) {
      throw new NotFoundException('Task not found');
    }
    await this.redis.del(this.getCacheKey(userId));
    this.tasksGateWay.emitTaskDeleted(userId, id);
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
    await this.redis.del(this.getCacheKey(userId));
    this.tasksGateWay.emitTaskCreated(userId, task);

    return task;
  }
}
