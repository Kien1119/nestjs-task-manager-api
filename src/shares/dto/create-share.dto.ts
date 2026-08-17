import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateShareDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email!: string;

  @IsEnum(['view', 'edit'], {
    message: 'Shares must be view or edit',
  })
  @IsOptional()
  permission?: 'view' | 'edit';
}
