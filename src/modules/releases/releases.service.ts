import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  ApprovalStatus,
  ChecklistItemStatus,
  ReleaseStatus,
} from 'generated/prisma/enums';

import { ErrorMessage } from '@common/constants/error-message';
import type { CreateAuditEventData } from '@modules/audit/audit.types';
import { ReleasesPolicy } from './releases.policy';
import { ReleasesRepository } from './releases.repository';
import type {
  ApproveReleaseParams,
  ApproveReleaseResponse,
  CreateReleaseParams,
  CreateReleaseResponse,
  CreateReleaseTaskParams,
  CreateReleaseTaskResponse,
  GetProjectReleasesParams,
  GetProjectReleasesResponse,
  GetReleaseParams,
  GetReleaseResponse,
  GetReleaseTasksParams,
  GetReleaseTasksResponse,
  MarkReleaseAsReleasedParams,
  MarkReleaseAsReleasedResponse,
  RejectReleaseParams,
  RejectReleaseResponse,
  ReopenReleaseParams,
  ReopenReleaseResponse,
  RequestReviewReleaseParams,
  RequestReviewReleaseResponse,
} from './releases.types';

const disallowedApproveStatuses: ApprovalStatus[] = [
  ApprovalStatus.PENDING,
  ApprovalStatus.REJECTED,
];

type ReleaseLifecycleAuditEventParams = {
  releaseId: string;
  actorUserId: string;
  organizationId: string;
  projectId: string;
  action: string;
  fromStatus: ReleaseStatus;
  toStatus: ReleaseStatus;
  approvalsReset?: true;
};

@Injectable()
export class ReleasesService {
  constructor(
    private readonly releasesRepository: ReleasesRepository,
    private readonly releasesPolicy: ReleasesPolicy,
  ) {}

  private buildTransitionAuditEvent({
    releaseId,
    actorUserId,
    organizationId,
    projectId,
    action,
    fromStatus,
    toStatus,
    approvalsReset,
  }: ReleaseLifecycleAuditEventParams): CreateAuditEventData {
    return {
      organizationId,
      projectId,
      releaseId,
      actorUserId,
      action,
      entityType: 'release',
      entityId: releaseId,
      metadata: {
        fromStatus,
        toStatus,
        ...(approvalsReset && { approvalsReset: true }),
      },
    };
  }

  async createRelease({
    userId,
    dto,
    projectId,
  }: CreateReleaseParams): Promise<CreateReleaseResponse> {
    const membership = await this.releasesRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanCreateRelease(membership.role);

    const env = await this.releasesRepository.findActiveEnvironment(
      projectId,
      dto.environmentId,
    );

    if (!env) {
      throw new NotFoundException(
        'The environment is not active for create release',
      );
    }

    const plannedReleaseAt = dto.plannedReleaseAt
      ? new Date(dto.plannedReleaseAt)
      : undefined;

    try {
      const release = await this.releasesRepository.createRelease({
        name: dto.name,
        description: dto.description,
        version: dto.version,
        environmentId: dto.environmentId,
        plannedReleaseAt,
        createdByUserId: userId,
        status: ReleaseStatus.DRAFT,
        projectId,
      });

      return release;
    } catch (error) {
      if (this.checkUniqueConstraintError(error)) {
        throw new ConflictException(
          'Release version already exists in this project',
        );
      }

      throw error;
    }
  }

  async getRelease({
    userId,
    releaseId,
  }: GetReleaseParams): Promise<GetReleaseResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const release = await this.releasesRepository.findReleaseById(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    return release;
  }

  async getProjectReleases({
    userId,
    projectId,
  }: GetProjectReleasesParams): Promise<GetProjectReleasesResponse> {
    const membership = await this.releasesRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const releases =
      await this.releasesRepository.findProjectReleases(projectId);

    return releases;
  }

  async createReleaseTask({
    releaseId,
    dto,
    userId,
  }: CreateReleaseTaskParams): Promise<CreateReleaseTaskResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanCreateReleaseTask(membership.role);

    const release =
      await this.releasesRepository.findReleaseStatusById(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException(
        `Release status ${release.status} does not meet the requirements to create a new release task`,
      );
    }

    try {
      const releaseTask = await this.releasesRepository.createReleaseTask({
        name: dto.name,
        key: dto.key,
        description: dto.description,
        url: dto.url,
        type: dto.type,
        releaseId,
      });

      return releaseTask;
    } catch (error) {
      if (this.checkUniqueConstraintError(error)) {
        throw new ConflictException(
          'Release task key already exists in this release',
        );
      }

      throw error;
    }
  }

  async getReleaseTasks({
    releaseId,
    userId,
  }: GetReleaseTasksParams): Promise<GetReleaseTasksResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const tasks = await this.releasesRepository.findReleaseTasks(releaseId);

    return tasks;
  }

  private checkUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async requestReview({
    userId,
    releaseId,
  }: RequestReviewReleaseParams): Promise<RequestReviewReleaseResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanRequestReview(membership.role);

    const releaseContext =
      await this.releasesRepository.findReleaseRequestReviewContext(releaseId);

    if (!releaseContext) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (releaseContext.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException(
        'Release must be in DRAFT status to request review',
      );
    }

    if (releaseContext.approvals.length === 0) {
      throw new ConflictException('Release must have at least one approval');
    }

    const hasNonCreatorReviewer = releaseContext.approvals.some(
      ({ reviewerUserId }) => reviewerUserId !== releaseContext.createdByUserId,
    );

    if (!hasNonCreatorReviewer) {
      throw new ConflictException(
        'Release creator cannot be the only reviewer',
      );
    }

    const allApprovalsPending = releaseContext.approvals.every(
      ({ status }) => status === ApprovalStatus.PENDING,
    );

    if (!allApprovalsPending) {
      throw new ConflictException('All approvals must be pending');
    }

    try {
      const updatedRelease = await this.releasesRepository.requestReview({
        releaseId,
        auditEvent: this.buildTransitionAuditEvent({
          releaseId,
          actorUserId: userId,
          organizationId: releaseContext.project.organizationId,
          projectId: releaseContext.projectId,
          action: 'release.review_requested',
          fromStatus: ReleaseStatus.DRAFT,
          toStatus: ReleaseStatus.IN_REVIEW,
        }),
      });
      return updatedRelease;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Release can no longer be sent to review');
      }

      throw error;
    }
  }

  async requestApprove({
    releaseId,
    userId,
  }: ApproveReleaseParams): Promise<ApproveReleaseResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanDecideRelease(membership.role);

    const releaseContext =
      await this.releasesRepository.findReleaseReviewDecisionContext(releaseId);

    if (!releaseContext) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (releaseContext.status !== ReleaseStatus.IN_REVIEW) {
      throw new ConflictException(
        'Release must be in IN_REVIEW status to request approve',
      );
    }

    const hasRequiredChecklist = releaseContext.checkListItems.find(
      (checklist) => checklist.status !== ChecklistItemStatus.DONE,
    );

    if (hasRequiredChecklist) {
      throw new ConflictException(
        'The required checklist items must be completed',
      );
    }

    const hasRejectOrPendingApproval = releaseContext.approvals.find(
      (approval) => disallowedApproveStatuses.includes(approval.status),
    );

    if (hasRejectOrPendingApproval) {
      throw new ConflictException(
        'The approval status must not be REJECT or PENDING',
      );
    }

    const hasApproved = releaseContext.approvals.find(
      (approval) => approval.status === ApprovalStatus.APPROVED,
    );

    if (!hasApproved) {
      throw new ConflictException('The release not be approved');
    }

    try {
      const updatedRelease = await this.releasesRepository.approveRelease({
        releaseId,
        auditEvent: this.buildTransitionAuditEvent({
          releaseId,
          actorUserId: userId,
          organizationId: releaseContext.project.organizationId,
          projectId: releaseContext.projectId,
          action: 'release.approved',
          fromStatus: ReleaseStatus.IN_REVIEW,
          toStatus: ReleaseStatus.APPROVED,
        }),
      });
      return updatedRelease;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Release can no longer be approved');
      }

      throw error;
    }
  }

  async requestReject({
    releaseId,
    userId,
  }: RejectReleaseParams): Promise<RejectReleaseResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanDecideRelease(membership.role);

    const releaseContext =
      await this.releasesRepository.findReleaseReviewDecisionContext(releaseId);

    if (!releaseContext) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (releaseContext.status !== ReleaseStatus.IN_REVIEW) {
      throw new ConflictException(
        'Release must be in IN_REVIEW status to request reject',
      );
    }

    const hasRejected = releaseContext.approvals.some(
      (approval) => approval.status === ApprovalStatus.REJECTED,
    );

    if (!hasRejected) {
      throw new ConflictException(
        'Release must have at least one rejected approval',
      );
    }

    try {
      const updatedRelease = await this.releasesRepository.rejectRelease({
        releaseId,
        auditEvent: this.buildTransitionAuditEvent({
          releaseId,
          actorUserId: userId,
          organizationId: releaseContext.project.organizationId,
          projectId: releaseContext.projectId,
          action: 'release.rejected',
          fromStatus: ReleaseStatus.IN_REVIEW,
          toStatus: ReleaseStatus.REJECTED,
        }),
      });
      return updatedRelease;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Release can no longer be rejected');
      }

      throw error;
    }
  }

  async requestReopen({
    userId,
    releaseId,
  }: ReopenReleaseParams): Promise<ReopenReleaseResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanDecideRelease(membership.role);

    const reopenContext =
      await this.releasesRepository.findReleaseReviewDecisionContext(releaseId);

    if (!reopenContext) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (reopenContext.status !== ReleaseStatus.REJECTED) {
      throw new ConflictException(
        'Release must be in REJECTED status to request reopen',
      );
    }

    const environment = await this.releasesRepository.findActiveEnvironment(
      reopenContext.projectId,
      reopenContext.environmentId,
    );

    if (!environment) {
      throw new NotFoundException(
        'The environment is not active for reopen release',
      );
    }

    try {
      const updatedRelease = await this.releasesRepository.reopenRelease({
        releaseId,
        auditEvent: this.buildTransitionAuditEvent({
          releaseId,
          actorUserId: userId,
          organizationId: reopenContext.project.organizationId,
          projectId: reopenContext.projectId,
          action: 'release.reopened',
          fromStatus: ReleaseStatus.REJECTED,
          toStatus: ReleaseStatus.DRAFT,
          approvalsReset: true,
        }),
      });

      return updatedRelease;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Release can no longer be reopened');
      }

      throw error;
    }
  }

  async requestRelease({
    userId,
    releaseId,
  }: MarkReleaseAsReleasedParams): Promise<MarkReleaseAsReleasedResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanDecideRelease(membership.role);

    const releaseContext =
      await this.releasesRepository.findReleaseReviewDecisionContext(releaseId);

    if (!releaseContext) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (releaseContext.status !== ReleaseStatus.APPROVED) {
      throw new ConflictException(
        'Release must be in APPROVED status to request release',
      );
    }

    const environment = await this.releasesRepository.findActiveEnvironment(
      releaseContext.projectId,
      releaseContext.environmentId,
    );

    if (!environment) {
      throw new NotFoundException(
        'The environment is not active for release status',
      );
    }

    try {
      const updatedRelease = await this.releasesRepository.requestRelease({
        releaseId,
        auditEvent: this.buildTransitionAuditEvent({
          releaseId,
          actorUserId: userId,
          organizationId: releaseContext.project.organizationId,
          projectId: releaseContext.projectId,
          action: 'release.released',
          fromStatus: ReleaseStatus.APPROVED,
          toStatus: ReleaseStatus.RELEASED,
        }),
      });

      return updatedRelease;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('Release can no longer be released');
      }

      throw error;
    }
  }
}
