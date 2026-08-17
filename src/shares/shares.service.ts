import { CreateShareDto } from './dto/create-share.dto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from 'src/database/database.provider';
import { TasksService } from 'src/tasks/tasks.service';
import { UsersService } from 'src/users/users.service';
import { Shares } from './entities/shares.entity';

@Injectable()
export class SharesService {
  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    taskId: number,
    createShareDto: CreateShareDto,
    ownerId: number,
  ): Promise<Shares> {
    // xác minh quyền sở hữu - ném ra NotFoundException nếu tác vụ không tồn tại hoặc không thuộc sở hữu của ownerId
    await this.tasksService.findOne(taskId, ownerId);

    const { email, permission } = createShareDto;
    const targetUser = await this.usersService.findByEmail(email);
    if (!targetUser) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    if (targetUser.id === ownerId) {
      throw new BadRequestException('Cannot share a task with yourself');
    }

    const res = await this.pool.query<Shares>(
      `INSERT INTO task_shares (task_id, shared_with_user_id, permission)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_id, shared_with_user_id)
       DO UPDATE SET permission = EXCLUDED.permission
       RETURNING *`,
      [taskId, targetUser.id, permission ?? 'view'],
    );
    await this.tasksService.invalidateCache(targetUser.id);
    return res.rows[0];
  }

  async delete(
    taskId: number,
    targetUserId: number,
    ownerId: number,
  ): Promise<void> {
    // verify ownership - throws NotFoundException if task doesn't exist / isn't owned by ownerId
    await this.tasksService.findOne(taskId, ownerId);

    const res = await this.pool.query(
      'DELETE FROM task_shares WHERE task_id = $1 AND shared_with_user_id = $2',
      [taskId, targetUserId],
    );
    if ((res.rowCount ?? 0) === 0) {
      throw new NotFoundException('Share not found');
    }
    await this.tasksService.invalidateCache(targetUserId);
  }
}
