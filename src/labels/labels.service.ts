import { Labels } from './entities/labels.entities';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.provider';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class LabelsService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly tasksService: TasksService,
  ) {}

  async create(name: string, color?: string, userId?: number): Promise<Labels> {
    const res = await this.pool.query<Labels>(
      'INSERT INTO labels (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, color, userId],
    );
    return res.rows[0];
  }

  async findAll(userId: number): Promise<Labels[]> {
    const res = await this.pool.query<Labels>(
      'SELECT * FROM labels WHERE user_id = $1',
      [userId],
    );
    return res.rows;
  }

  async attachLabelToTask(
    taskId: number,
    labelId: number,
    userId: number,
  ): Promise<void> {
    // verify ownership - ném NotFoundException nếu task không tồn tại / không phải của user
    await this.tasksService.findOne(taskId, userId);

    const labelCheck = await this.pool.query(
      'SELECT * FROM labels WHERE id = $1 AND user_id = $2',
      [labelId, userId],
    );

    if (labelCheck.rows.length === 0) {
      throw new NotFoundException('Label not found');
    }

    await this.pool.query(
      'INSERT INTO task_labels (task_id, label_id) VALUES ($1, $2) ',
      [taskId, labelId],
    );
  }

  async detachLabelFromTask(
    taskId: number,
    labelId: number,
    userId: number,
  ): Promise<void> {
    await this.tasksService.findOne(taskId, userId);

    const labelCheck = await this.pool.query(
      'SELECT * FROM labels WHERE id = $1 AND user_id = $2',
      [labelId, userId],
    );

    if (labelCheck.rows.length === 0) {
      throw new NotFoundException('Label not found');
    }

    await this.pool.query(
      'DELETE FROM task_labels WHERE task_id = $1 AND label_id = $2',
      [taskId, labelId],
    );
  }

  async getLabelsOfTask(taskId: number, userId: number): Promise<Labels[]> {
    await this.tasksService.findOne(taskId, userId);

    const res = await this.pool.query<Labels>(
      'SELECT l.* FROM labels l INNER JOIN task_labels tl ON l.id = tl.label_id WHERE tl.task_id = $1',
      [taskId],
    );
    return res.rows;
  }
}
