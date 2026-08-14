import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('tasks/:id/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiOperation({ summary: 'Create a new comment for a specific task' })
  @Post()
  createComment(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.commentsService.createComment(
      user.userId,
      taskId,
      createCommentDto.content,
    );
  }

  @ApiOperation({ summary: 'Get comments for a specific task' })
  @Get()
  getCommentsByTaskId(
    @Param('id', ParseIntPipe) taskId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.commentsService.findByTaskId(taskId, user.userId);
  }
}
