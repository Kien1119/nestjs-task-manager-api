import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateShareDto } from './dto/create-share.dto';

@ApiTags('task-shares')
@ApiBearerAuth()
@Controller('tasks/:id/share')
@UseGuards(JwtAuthGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @ApiOperation({ summary: 'Share a task with another user' })
  @Post()
  create(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() dto: CreateShareDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.sharesService.create(taskId, dto, user.userId);
  }

  @ApiOperation({ summary: "Revoke a user's share access to a task" })
  @Delete(':userId')
  @HttpCode(204)
  remove(
    @Param('id', ParseIntPipe) taskId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.sharesService.delete(taskId, targetUserId, user.userId);
  }
}
