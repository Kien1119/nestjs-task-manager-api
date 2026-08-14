import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LabelsService } from './labels.service';
import { CreateLabelsDto } from './dto/create-labels.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@ApiTags('labels')
@ApiBearerAuth()
@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @ApiOperation({ summary: 'Create a new label' })
  @Post()
  createLabel(
    @Body() dto: CreateLabelsDto,
    @CurrentUser() user: { userId: number; email: string },
  ) {
    return this.labelsService.create(dto.name, dto.color, user.userId);
  }

  @ApiOperation({ summary: 'Get all labels' })
  @Get()
  findAll(@CurrentUser() user: { userId: number; email: string }) {
    return this.labelsService.findAll(user.userId);
  }
}
