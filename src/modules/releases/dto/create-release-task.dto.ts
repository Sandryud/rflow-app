import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class CreateReleaseTaskDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trimStringTransformer)
  @MaxLength(50)
  key!: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Transform(trimStringTransformer)
  @MaxLength(400)
  description?: string;

  @IsUrl()
  @IsOptional()
  @IsNotEmpty()
  @Transform(trimStringTransformer)
  @MaxLength(400)
  url?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Transform(trimStringTransformer)
  @MaxLength(50)
  type?: string;
}
