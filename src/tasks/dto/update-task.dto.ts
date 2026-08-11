import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_completed?: boolean;

  @IsEnum(['low', 'medium', 'high'], {
    message: 'Priority must be low, medium, or high',
  })
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  @IsDateString()
  @IsOptional()
  due_date?: string;
}
