import { IsUUID } from 'class-validator';

export class CreateApprovalDto {
  @IsUUID()
  reviewerUserId!: string;
}
