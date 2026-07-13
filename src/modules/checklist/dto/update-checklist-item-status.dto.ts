import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ChecklistItemStatus } from 'generated/prisma/enums';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class UpdateChecklistItemStatusDto {
  @IsEnum(ChecklistItemStatus)
  status!: ChecklistItemStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  comment?: string;
}
