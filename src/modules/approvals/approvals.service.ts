import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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
  GetApprovalsResponse,
  RejectApprovalParams,
  RevokeApprovalParams,
  UpdateApprovalResponse,
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

    this.policy.assertCanManageApproval(membership.role);

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

  async getApprovals({
    userId,
    releaseId,
  }: GetApprovalsParams): Promise<GetApprovalsResponse> {
    const membership = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const approvals = await this.repository.findApprovals(releaseId);

    return approvals;
  }

  async approveApproval({
    userId,
    approvalId,
  }: ApproveApprovalParams): Promise<UpdateApprovalResponse> {
    const approval = await this.repository.findApprovalById(approvalId);

    if (!approval) {
      throw new NotFoundException('The current approval not found');
    }

    const membership = await this.repository.findReleaseMembership(
      userId,
      approval.releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    if (approval.reviewerUserId !== userId) {
      throw new ForbiddenException('You are not a reviewer user');
    }

    if (approval.release.status !== ReleaseStatus.IN_REVIEW) {
      throw new ConflictException('Release status is not IN_REVIEW');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('Approval status is not PENDING');
    }

    try {
      const updatedApproval = await this.repository.updateApprovalStatus({
        data: {
          comment: null,
          decidedAt: new Date(),
          status: ApprovalStatus.APPROVED,
        },
        userId,
        approvalId,
        currentStatus: approval.status,
      });

      return updatedApproval;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Approval can no longer be updated');
      }

      throw error;
    }
  }

  async rejectApproval({
    userId,
    approvalId,
    dto,
  }: RejectApprovalParams): Promise<UpdateApprovalResponse> {
    const approval = await this.repository.findApprovalById(approvalId);

    if (!approval) {
      throw new NotFoundException('The current approval not found');
    }

    const membership = await this.repository.findReleaseMembership(
      userId,
      approval.releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    if (approval.reviewerUserId !== userId) {
      throw new ForbiddenException('You are not a reviewer user');
    }

    if (approval.release.status !== ReleaseStatus.IN_REVIEW) {
      throw new ConflictException('Release status is not IN_REVIEW');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('Approval status is not PENDING');
    }

    try {
      const updatedApproval = await this.repository.updateApprovalStatus({
        data: {
          comment: dto.comment,
          decidedAt: new Date(),
          status: ApprovalStatus.REJECTED,
        },
        userId,
        approvalId,
        currentStatus: approval.status,
      });

      return updatedApproval;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Approval can no longer be updated');
      }

      throw error;
    }
  }

  async revokeApproval({
    userId,
    approvalId,
  }: RevokeApprovalParams): Promise<UpdateApprovalResponse> {
    const approval = await this.repository.findApprovalById(approvalId);

    if (!approval) {
      throw new NotFoundException('The current approval not found');
    }

    const membership = await this.repository.findReleaseMembership(
      userId,
      approval.releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    if (approval.reviewerUserId !== userId) {
      throw new ForbiddenException('You are not a reviewer user');
    }

    if (approval.release.status !== ReleaseStatus.IN_REVIEW) {
      throw new ConflictException('Release status is not IN_REVIEW');
    }

    if (approval.status === ApprovalStatus.PENDING) {
      throw new ConflictException('Approval status is already PENDING');
    }

    try {
      const updatedApproval = await this.repository.updateApprovalStatus({
        data: {
          comment: null,
          decidedAt: null,
          status: ApprovalStatus.PENDING,
        },
        userId,
        approvalId,
        currentStatus: approval.status,
      });

      return updatedApproval;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Approval can no longer be updated');
      }

      throw error;
    }
  }

  async deleteApproval({
    approvalId,
    userId,
  }: DeleteApprovalParams): Promise<void> {
    const approval = await this.repository.findApprovalById(approvalId);

    if (!approval) {
      throw new NotFoundException('The current approval not found');
    }

    const membership = await this.repository.findReleaseMembership(
      userId,
      approval.releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.policy.assertCanManageApproval(membership.role);

    if (approval.release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException('Release status is not DRAFT');
    }

    const release = await this.repository.findRelease(approval.releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    const isReleaseCreator =
      approval.reviewerUserId === release.createdByUserId;

    if (!isReleaseCreator) {
      const creatorApproval = await this.repository.findReviewerApproval(
        release.id,
        release.createdByUserId,
      );

      if (creatorApproval) {
        const hasOtherReviewer =
          await this.repository.hasRemainingNonCreatorReviewer(
            release.id,
            release.createdByUserId,
            approval.id,
          );

        if (!hasOtherReviewer) {
          throw new ConflictException(
            'Release creator cannot be the only reviewer',
          );
        }
      }
    }

    try {
      await this.repository.deleteApproval(approvalId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Approval can no longer be deleted');
      }

      throw error;
    }
  }
}
