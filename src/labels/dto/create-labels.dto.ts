import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLabelsDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}
