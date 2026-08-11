import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.provider';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}
  async findByEmail(email: string): Promise<User | undefined> {
    const res = await this.pool.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return res.rows[0];
  }
  async create(email: string, hashedPassword: string): Promise<User> {
    const res = await this.pool.query<User>(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashedPassword],
    );
    return res.rows[0];
  }
}
