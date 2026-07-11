import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

@Injectable()
export class EnvironmentsPolicy {
  private readonly allowedCreateEnvironmentRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  assertCanCreateEnvironment(role: MembershipRole) {
    if (!this.allowedCreateEnvironmentRoles.has(role)) {
      throw new ForbiddenException(
        'You do not have permission to create environments',
      );
    }
  }
}
