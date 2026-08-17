import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.provider';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export interface TaskAccessRow {
  user_id: number | null;
  permission: 'view' | 'edit' | null;
}

@Injectable()
export class TasksRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAllByUserId(
    userId: number,
    is_completed?: string,
    sortBy?: string,
    order?: string,
  ): Promise<Task[]> {
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
    return res.rows;
  }

  /** Trả về user_id sở hữu + permission share (nếu có) của task, dùng để service tự quyết định quyền. */
  async checkAccess(
    taskId: number,
    userId: number,
  ): Promise<TaskAccessRow | undefined> {
    const res = await this.pool.query<TaskAccessRow>(
      `SELECT t.user_id, ts.permission
     FROM tasks t
     LEFT JOIN task_shares ts ON ts.task_id = t.id AND ts.shared_with_user_id = $2
     WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [taskId, userId],
    );
    return res.rows[0];
  }

  async findOneById(id: number): Promise<Task | undefined> {
    const res = await this.pool.query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return res.rows[0];
  }

  async insert(createTaskDto: CreateTaskDto, userId: number): Promise<Task> {
    const { title, description, priority, due_date } = createTaskDto;
    const res = await this.pool.query<Task>(
      'INSERT INTO tasks (title, description, user_id, priority, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, userId, priority ?? 'medium', due_date],
    );
    return res.rows[0];
  }

  async updateById(
    id: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task | undefined> {
    const { title, description, is_completed, priority, due_date } =
      updateTaskDto;
    const res = await this.pool.query<Task>(
      'UPDATE tasks SET title = COALESCE($1, title), description = COALESCE($2, description), is_completed = COALESCE($3, is_completed), priority=COALESCE($4,priority), due_date=COALESCE($5,due_date) WHERE id = $6 RETURNING *',
      [title, description, is_completed, priority, due_date, id],
    );
    return res.rows[0];
  }

  async softDeleteById(id: number): Promise<void> {
    await this.pool.query('UPDATE tasks SET deleted_at = now() WHERE id = $1', [
      id,
    ]);
  }

  /** Chỉ khôi phục được task đang bị xoá mềm và thuộc sở hữu của userId. */
  async restoreById(id: number, userId: number): Promise<Task | undefined> {
    const res = await this.pool.query<Task>(
      'UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING *',
      [id, userId],
    );
    return res.rows[0];
  }
}
