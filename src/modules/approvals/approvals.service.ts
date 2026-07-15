import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ApprovalStatus, ReleaseStatus } from 'generated/prisma/enums';

import { ErrorMessage } from '@common/constants/error-message';
import { ApprovalsPolicy } from './approvals.policy';
import { ApprovalsRepository } from './approvals.repository';
import type {
  ApproveApprovalParams,
  CreateApprovalParams,
  CreateApprovalResponse,
  DeleteApprovalParams,
  GetApprovalsParams,
  RejectApprovalParams,
  RevokeApprovalParams,
} from './approvals.types';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repository: ApprovalsRepository,
    private readonly policy: ApprovalsPolicy,
  ) {}

  async createApproval({
    dto,
    releaseId,
    userId,
  }: CreateApprovalParams): Promise<CreateApprovalResponse> {
    const membership = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.policy.assertCanCreateApproval(membership.role);

    const release = await this.repository.findRelease(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    const isReleaseStatusAllowed = release.status === ReleaseStatus.DRAFT;

    if (!isReleaseStatusAllowed) {
      throw new ConflictException(
        'Approval can only be created while the release is in draft status',
      );
    }

    const reviewerMembership = await this.repository.findReleaseMembership(
      dto.reviewerUserId,
      releaseId,
    );

    if (!reviewerMembership) {
      throw new NotFoundException(
        'Reviewer is not a member of this organization',
      );
    }

    const isReleaseCreator = dto.reviewerUserId === release.createdByUserId;

    if (isReleaseCreator) {
      const otherReviewer = await this.repository.findOtherReviewer(
        releaseId,
        release.createdByUserId,
      );

      if (!otherReviewer) {
        throw new ConflictException(
          'Release creator cannot be the only reviewer',
        );
      }
    }

    try {
      const createdApproval = await this.repository.createApproval({
        release: { connect: { id: releaseId } },
        reviewer: { connect: { id: dto.reviewerUserId } },
        status: ApprovalStatus.PENDING,
      });

      return createdApproval;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Reviewer already has an approval for this release',
        );
      }

      throw error;
    }
  }

  getApprovals(params: GetApprovalsParams): never {
    void params;
    throw new NotImplementedException();
  }

  approveApproval(params: ApproveApprovalParams): never {
    void params;
    throw new NotImplementedException();
  }

  rejectApproval(params: RejectApprovalParams): never {
    void params;
    throw new NotImplementedException();
  }

  revokeApproval(params: RevokeApprovalParams): never {
    void params;
    throw new NotImplementedException();
  }

  deleteApproval(params: DeleteApprovalParams): never {
    void params;
    throw new NotImplementedException();
  }
}
