import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

import { CreateOrganizationDto } from './dto/create-organization.dto';
import { mapOrganizationWithRole } from './organizations.mapper';
import { OrganizationsRepository } from './organizations.repository';

type CreateOrganizationParams = {
  dto: CreateOrganizationDto;
  userId: string;
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async createOrganization(params: CreateOrganizationParams) {
    const { userId, dto } = params;

    if (!userId || !dto) {
      throw new BadRequestException();
    }

    const normalizeOrgName = dto.name.trim();
    const normalizeOrgDescription = dto.description?.trim();

    const organization = await this.organizationsRepository.createOrganization(
      {
        name: normalizeOrgName,
        ...(normalizeOrgDescription && {
          description: normalizeOrgDescription,
        }),
        memberships: { create: { userId, role: MembershipRole.OWNER } },
      },
      userId,
    );

    return mapOrganizationWithRole(organization);
  }

  async getOrganizations(userId: string) {
    if (!userId) {
      throw new BadRequestException();
    }

    const organizations =
      await this.organizationsRepository.findUserOrganizations(userId);

    return organizations.map(mapOrganizationWithRole);
  }
}
