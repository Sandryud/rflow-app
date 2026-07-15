import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class ApprovalsPolicy {
  private readonly allowedCreateApprovalRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  assertCanCreateApproval(role: MembershipRole) {
    if (!this.allowedCreateApprovalRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to create approval',
      );
    }
  }
}
