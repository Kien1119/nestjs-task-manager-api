import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;
}
