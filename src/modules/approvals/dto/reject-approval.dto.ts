import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class RejectApprovalDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(400)
  comment!: string;
}
