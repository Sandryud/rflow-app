import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class CreateChecklistItemDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @Transform(trimStringTransformer)
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(400)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsUUID()
  @IsNotEmpty()
  @IsOptional()
  assignedToUserId?: string;
}
