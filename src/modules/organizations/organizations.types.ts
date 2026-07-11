import type { MembershipRole } from 'generated/prisma/enums';

import type { CreateOrganizationDto } from './dto/create-organization.dto';

export type CreateOrganizationParams = {
  dto: CreateOrganizationDto;
  userId: string;
};

export type GetOrganizationsParams = string;

export type OrganizationWithMembershipRole = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  memberships: { role: MembershipRole }[];
};

export type OrganizationResponse = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  role: MembershipRole | undefined;
};

export type CreateOrganizationResponse = OrganizationResponse;

export type GetOrganizationsResponse = OrganizationResponse[];
