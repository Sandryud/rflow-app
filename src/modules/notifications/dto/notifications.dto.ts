import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  @Min(1)
  limit = 50;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cursor?: string;

  @IsOptional()
  @IsNotEmpty()
  @Transform((params: TransformFnParams) => {
    const value: unknown = params.value;

    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  })
  @IsBoolean()
  unreadOnly = false;
}
