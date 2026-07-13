import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ChecklistItemStatus, ReleaseStatus } from 'generated/prisma/enums';

import { ErrorMessage } from '@common/constants/error-message';
import { ChecklistPolicy } from './checklist.policy';
import { ChecklistRepository } from './checklist.repository';
import {
  ChecklistReleaseParams,
  CreateChecklistParams,
  CreateChecklistResponse,
  GetChecklistItems,
  UpdateChecklistStatusParams,
  UpdateChecklistStatusResponse,
} from './checklist.types';

const allowedStatusTransitions: Record<
  ChecklistItemStatus,
  readonly ChecklistItemStatus[]
> = {
  [ChecklistItemStatus.TODO]: [
    ChecklistItemStatus.DONE,
    ChecklistItemStatus.BLOCKED,
  ],
  [ChecklistItemStatus.BLOCKED]: [
    ChecklistItemStatus.TODO,
    ChecklistItemStatus.DONE,
  ],
  [ChecklistItemStatus.DONE]: [],
};

@Injectable()
export class ChecklistItemService {
  constructor(
    private readonly repository: ChecklistRepository,
    private readonly policy: ChecklistPolicy,
  ) {}

  private checkUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async createChecklistItem({
    userId,
    releaseId,
    dto,
  }: CreateChecklistParams): Promise<CreateChecklistResponse> {
    const membership = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.policy.assertCanCreateChecklist(membership.role);

    const release = await this.repository.findRelease(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException(
        'Checklist can only be created with the Draft status.',
      );
    }

    if (dto.assignedToUserId) {
      const assignedUserMembership =
        await this.repository.findReleaseMembership(
          dto.assignedToUserId,
          releaseId,
        );

      if (!assignedUserMembership) {
        throw new NotFoundException(
          'Assigned user is not a member of this organization',
        );
      }
    }

    try {
      const checklist = await this.repository.createChecklistItem({
        title: dto.title,
        description: dto.description,
        isRequired: dto.isRequired ?? false,
        status: ChecklistItemStatus.TODO,
        release: { connect: { id: releaseId } },
        createdBy: { connect: { id: userId } },
        ...(dto.assignedToUserId && {
          assignedTo: { connect: { id: dto.assignedToUserId } },
        }),
      });

      return checklist;
    } catch (error) {
      if (this.checkUniqueConstraintError(error)) {
        throw new ConflictException(
          'Checklist title already exists in this release',
        );
      }

      throw error;
    }
  }

  async getChecklistItems({
    userId,
    releaseId,
  }: ChecklistReleaseParams): Promise<GetChecklistItems> {
    const membership = await this.repository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const items = await this.repository.findChecklistItemsByRelease(releaseId);

    return items;
  }

  async updateChecklistStatus({
    userId,
    checklistItemId,
    dto,
  }: UpdateChecklistStatusParams): Promise<UpdateChecklistStatusResponse> {
    const checklistItem =
      await this.repository.findChecklistById(checklistItemId);

    if (!checklistItem) {
      throw new NotFoundException('Checklist item not found');
    }

    const membership = await this.repository.findReleaseMembership(
      userId,
      checklistItem.releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const assignItemUser = checklistItem.assignedToUserId;

    if (Boolean(assignItemUser) && assignItemUser !== userId) {
      throw new ForbiddenException(
        'This checklist item is assigned to another user',
      );
    }

    if (!assignItemUser) {
      this.policy.assertCanUpdateChecklistStatus(membership.role);
    }

    const isStatusTransitionAllowed = allowedStatusTransitions[
      checklistItem.status
    ].includes(dto.status);

    if (!isStatusTransitionAllowed) {
      throw new ConflictException(
        'The requested checklist item status transition is not allowed',
      );
    }

    const release = await this.repository.findRelease(checklistItem.releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    const isReleaseStatusAllowed =
      release.status === ReleaseStatus.DRAFT ||
      release.status === ReleaseStatus.IN_REVIEW;

    if (!isReleaseStatusAllowed) {
      throw new ConflictException(
        'Checklist items can only be modified while the release is in draft and review status',
      );
    }

    if (dto.status === ChecklistItemStatus.BLOCKED && !dto.comment) {
      throw new BadRequestException(
        'A comment is required when blocking a checklist item',
      );
    }

    try {
      if (dto.status === ChecklistItemStatus.DONE) {
        const item = await this.repository.updateChecklistStatus(
          checklistItemId,
          checklistItem.status,
          {
            status: dto.status,
            completedBy: {
              connect: { id: userId },
            },
            completedAt: new Date(),
            comment: null,
          },
        );

        return item;
      }

      const item = await this.repository.updateChecklistStatus(
        checklistItemId,
        checklistItem.status,
        {
          status: dto.status,
          comment: dto.status !== ChecklistItemStatus.TODO ? dto.comment : null,
          completedBy: { disconnect: true },
          completedAt: null,
        },
      );

      return item;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException(
          'Checklist item status was changed by another request',
        );
      }

      throw error;
    }
  }
}
