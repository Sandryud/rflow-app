import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class CreateReleaseDto {
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

  @IsNotEmpty()
  @IsString()
  @Transform(trimStringTransformer)
  @MaxLength(50)
  version!: string;

  @IsUUID()
  @IsNotEmpty()
  environmentId!: string;

  @IsISO8601()
  @IsOptional()
  plannedReleaseAt?: string;
}
