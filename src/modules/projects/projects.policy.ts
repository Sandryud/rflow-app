import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class ProjectsPolicy {
  private readonly allowedCreateProjectRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  assertCanCreateProject(role: MembershipRole) {
    if (!this.allowedCreateProjectRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to create projects',
      );
    }
  }
}
