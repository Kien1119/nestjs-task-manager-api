import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Get all tasks of the current user' })
  @Get()
  findAll(@CurrentUser() user: { userId: number; email: string }) {
    return this.tasksService.findAll(user.userId);
  }

  @ApiOperation({ summary: 'Get a task by id' })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.tasksService.findOne(id, user.userId);
  }

  @ApiOperation({ summary: 'Create a new task' })
  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.tasksService.create(createTaskDto, user.userId);
  }

  @ApiOperation({ summary: 'Update a task' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.tasksService.update(id, updateTaskDto, user.userId);
  }

  @ApiOperation({ summary: 'Delete a task' })
  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.tasksService.remove(id, user.userId);
  }
}
