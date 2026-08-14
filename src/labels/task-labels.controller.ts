import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { AttachLabelDto } from './dto/attach-label.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('task-labels')
@ApiBearerAuth()
@Controller('tasks/:id/labels')
@UseGuards(JwtAuthGuard)
export class TaskLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @ApiOperation({ summary: 'Attach a label to a task' })
  @Post()
  attachLabelToTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() dto: AttachLabelDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.labelsService.attachLabelToTask(
      taskId,
      dto.labelId,
      user.userId,
    );
  }

  @ApiOperation({ summary: 'Detach a label from a task' })
  @Delete(':labelId')
  detachLabelFromTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Param('labelId', ParseIntPipe) labelId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.labelsService.detachLabelFromTask(taskId, labelId, user.userId);
  }

  @ApiOperation({ summary: 'Get all labels of a task' })
  @Get()
  getLabelsOfTask(
    @Param('id', ParseIntPipe) taskId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.labelsService.getLabelsOfTask(taskId, user.userId);
  }
}
