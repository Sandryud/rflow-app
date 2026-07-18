import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class UpdateCommentDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}
