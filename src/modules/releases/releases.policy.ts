import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class ReleasesPolicy {
  private readonly allowedCreateReleaseRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  private readonly allowedRequestReviewRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  private readonly allowedCreateReleaseTaskRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
    MembershipRole.DEVELOPER,
  ]);

  assertCanCreateRelease(role: MembershipRole) {
    if (!this.allowedCreateReleaseRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to create releases',
      );
    }
  }

  assertCanCreateReleaseTask(role: MembershipRole) {
    if (!this.allowedCreateReleaseTaskRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to create release task',
      );
    }
  }

  assertCanRequestReview(role: MembershipRole) {
    if (!this.allowedRequestReviewRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to request release review',
      );
    }
  }
}
