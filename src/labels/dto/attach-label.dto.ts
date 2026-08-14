import { IsInt } from 'class-validator';

export class AttachLabelDto {
  @IsInt()
  labelId!: number;
}
