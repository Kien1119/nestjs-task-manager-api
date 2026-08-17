import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Email is not valid' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'User password',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
