import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class CreateEnvironmentDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @Transform(trimStringTransformer)
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(400)
  description?: string;
}
