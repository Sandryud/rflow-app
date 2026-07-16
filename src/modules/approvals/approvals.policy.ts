import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class ApprovalsPolicy {
  private readonly allowedManageApprovalRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  assertCanManageApproval(role: MembershipRole) {
    if (!this.allowedManageApprovalRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to manage approvals',
      );
    }
  }
}
