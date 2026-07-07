import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class CreateProjectDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Transform(trimStringTransformer)
  @MaxLength(400)
  description?: string;
}
