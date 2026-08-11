import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['low', 'medium', 'high'], {
    message: 'Priority must be low, medium, or high',
  })
  @IsOptional()
  priority?: 'low' | 'medium' | 'high';

  @IsDateString()
  @IsOptional()
  due_date?: string;
}
