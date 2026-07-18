import { Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class CommentsPolicy {
  private readonly allowedManageCommentRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  canModerateComment(role: MembershipRole) {
    return this.allowedManageCommentRoles.has(role);
  }
}
