import type { MembershipRole } from 'generated/prisma/enums';

type OrganizationWithMembershipRole = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  memberships: { role: MembershipRole }[];
};

export const mapOrganizationWithRole = ({
  memberships,
  ...organization
}: OrganizationWithMembershipRole) => ({
  ...organization,
  role: memberships?.[0]?.role,
});
