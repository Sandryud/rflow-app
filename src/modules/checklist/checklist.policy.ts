import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class ChecklistPolicy {
  private readonly allowedCreateChecklistRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
    MembershipRole.DEVELOPER,
  ]);

  private readonly allowedUpdateChecklistRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
    MembershipRole.DEVELOPER,
    MembershipRole.QA,
  ]);

  assertCanCreateChecklist(role: MembershipRole) {
    if (!this.allowedCreateChecklistRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to create checklist item',
      );
    }
  }

  assertCanUpdateChecklistStatus(role: MembershipRole) {
    if (!this.allowedUpdateChecklistRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to update checklist item status ',
      );
    }
  }
}
