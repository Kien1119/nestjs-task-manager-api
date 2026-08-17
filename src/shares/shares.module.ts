import { Module } from '@nestjs/common';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { TasksModule } from 'src/tasks/tasks.module';
import { UsersModule } from 'src/users/users.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [SharesController],
  providers: [SharesService],
  imports: [DatabaseModule, TasksModule, UsersModule],
})
export class SharesModule {}
