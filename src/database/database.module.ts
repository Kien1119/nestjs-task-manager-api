import { Module } from '@nestjs/common';
import { databaseProviders } from './database.provider';
import { redisProvider } from './redis.provider';

@Module({
  providers: [...databaseProviders, ...redisProvider],
  exports: [...databaseProviders, ...redisProvider],
})
export class DatabaseModule {}
