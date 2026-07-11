import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { trimStringTransformer } from '@common/transformers/trim-string.transformer';

export class RegisterDto {
  @IsEmail()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
