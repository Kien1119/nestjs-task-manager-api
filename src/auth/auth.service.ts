import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/database/redis.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create(email, hashedPassword);

    return user;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles || ['user'], // Thêm roles vào payload của JWT
      },
      {
        expiresIn: '15m', // Thời gian sống của access token
      },
    );

    const refreshToken = crypto.randomBytes(32).toString('hex'); // chuỗi hex 64 ký tự
    await this.redis.set(
      `refresh:token:${refreshToken}`,
      user.id.toString(),
      'EX',
      7 * 24 * 60 * 60, // Thời gian sống của refresh token (7 ngày)
    );

    return {
      accessToken,
      refreshToken, // Trả về refresh token
      user: { id: user.id, email: user.email, roles: user.roles || ['user'] }, // Trả về roles cùng với thông tin user
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const userId = await this.redis.get(`refresh:token:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(Number(userId));
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const newAccessToken = await this.jwtService.signAsync(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles || ['user'], // Thêm roles vào payload của JWT
      },
      {
        expiresIn: '15m', // Thời gian sống của access token
      },
    );

    return { accessToken: newAccessToken };
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid old password');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedNewPassword);
  }

  async forgotPassword(
    email: string,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.usersService.findByEmail(email);
    // Không tiết lộ email có tồn tại hay không -> luôn trả message giống nhau

    if (!user) {
      return { message: 'If this email exists, a reset link has been sent' };
    }
    const token = crypto.randomBytes(32).toString('hex'); // chuỗi hex 64 ký tự
    await this.redis.set(
      `reset:token:${token}`,
      user.id.toString(),
      'EX',
      3600,
    ); // Lưu token vào Redis với thời gian sống 15p
    return {
      message: 'If this email exists, a reset link has been sent',
      resetToken: token,
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redis.get(`reset:token:${token}`);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(Number(userId), hashedNewPassword);
    await this.redis.del(`reset:token:${token}`); // Xóa token sau khi reset thành công
  }
}
