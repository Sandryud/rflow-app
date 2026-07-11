import type {
  OrganizationResponse,
  OrganizationWithMembershipRole,
} from './organizations.types';

export const mapOrganizationWithRole = ({
  memberships,
  ...organization
}: OrganizationWithMembershipRole): OrganizationResponse => ({
  ...organization,
  role: memberships?.[0]?.role,
});
