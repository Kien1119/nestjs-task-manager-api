import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.provider';
import { TasksService } from '../tasks/tasks.service';
import { Comment } from './entities/comments.entity';

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly tasksService: TasksService,
  ) {}

  async createComment(
    userId: number,
    taskId: number,
    content: string,
  ): Promise<Comment> {
    // verify ownership - throw NotFoundException nếu task không tồn tại / không phải của user
    await this.tasksService.findOne(taskId, userId);

    const res = await this.pool.query<Comment>(
      'INSERT INTO comments (content, task_id, user_id) VALUES ($1, $2, $3) RETURNING *',
      [content, taskId, userId],
    );
    return res.rows[0];
  }

  async findByTaskId(taskId: number, userId: number): Promise<Comment[]> {
    await this.tasksService.findOne(taskId, userId);

    const res = await this.pool.query<Comment>(
      'SELECT * FROM comments WHERE task_id = $1 ORDER BY created_at ASC',
      [taskId],
    );
    return res.rows;
  }
}
