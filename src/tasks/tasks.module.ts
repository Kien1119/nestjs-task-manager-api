import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { DatabaseModule } from '../database/database.module';
import { TasksGateway } from './tasks.gateway';

@Module({
  imports: [DatabaseModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository, TasksGateway],
  exports: [TasksService],
})
export class TasksModule {}
