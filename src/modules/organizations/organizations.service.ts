import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

import { mapOrganizationWithRole } from './organizations.mapper';
import { OrganizationsRepository } from './organizations.repository';
import type {
  CreateOrganizationParams,
  CreateOrganizationResponse,
  GetOrganizationsParams,
  GetOrganizationsResponse,
} from './organizations.types';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async createOrganization(
    params: CreateOrganizationParams,
  ): Promise<CreateOrganizationResponse> {
    const { userId, dto } = params;

    if (!userId || !dto) {
      throw new BadRequestException();
    }

    const organization = await this.organizationsRepository.createOrganization(
      {
        name: dto.name,
        ...(dto.description && {
          description: dto.description,
        }),
        memberships: { create: { userId, role: MembershipRole.OWNER } },
      },
      userId,
    );

    return mapOrganizationWithRole(organization);
  }

  async getOrganizations(
    userId: GetOrganizationsParams,
  ): Promise<GetOrganizationsResponse> {
    if (!userId) {
      throw new BadRequestException();
    }

    const organizations =
      await this.organizationsRepository.findUserOrganizations(userId);

    return organizations.map(mapOrganizationWithRole);
  }
}
