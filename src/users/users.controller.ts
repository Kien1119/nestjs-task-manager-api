import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard) // Sử dụng JwtAuthGuard và RolesGuard để bảo vệ route
  @Roles('admin') // Chỉ cho phép người dùng có vai trò 'admin' truy cập
  @Get()
  async findAll() {
    return this.userService.findAll();
  }
}
