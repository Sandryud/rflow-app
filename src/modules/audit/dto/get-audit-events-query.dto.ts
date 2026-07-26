import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetAuditEventsQueryDto {
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
}
