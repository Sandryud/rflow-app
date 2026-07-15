import type { Prisma } from 'generated/prisma/client';

import type { createApprovalSelect } from './approvals.select';
import type { CreateApprovalDto } from './dto/create-approval.dto';
import type { RejectApprovalDto } from './dto/reject-approval.dto';

export type CreateApprovalResponse = Prisma.ApprovalGetPayload<{
  select: typeof createApprovalSelect;
}>;

export type ApprovalUserParams = {
  userId: string;
};

export type ApprovalReleaseParams = ApprovalUserParams & {
  releaseId: string;
};

export type ApprovalParams = ApprovalUserParams & {
  approvalId: string;
};

export type CreateApprovalParams = ApprovalReleaseParams & {
  dto: CreateApprovalDto;
};

export type GetApprovalsParams = ApprovalReleaseParams;

export type ApproveApprovalParams = ApprovalParams;

export type RejectApprovalParams = ApprovalParams & {
  dto: RejectApprovalDto;
};

export type RevokeApprovalParams = ApprovalParams;

export type DeleteApprovalParams = ApprovalParams;
