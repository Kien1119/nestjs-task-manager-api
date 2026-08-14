import { Module } from '@nestjs/common';
import { LabelsController } from './labels.controller';
import { TaskLabelsController } from './task-labels.controller';
import { LabelsService } from './labels.service';
import { TasksModule } from '../tasks/tasks.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  controllers: [LabelsController, TaskLabelsController],
  providers: [LabelsService],
  imports: [DatabaseModule, TasksModule],
})
export class LabelsModule {}
