import { BadRequestException, Injectable } from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

type CreateOrganizationParams = { dto: CreateOrganizationDto; userId: string };

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(params: CreateOrganizationParams) {
    const { userId, dto } = params;

    if (!userId || !dto) {
      throw new BadRequestException();
    }

    const normalizeOrgName = dto.name.trim();
    const normalizeOrgDescription = dto.description?.trim();

    const organization = await this.prisma.organization.create({
      data: {
        name: normalizeOrgName,
        ...(normalizeOrgDescription && {
          description: normalizeOrgDescription,
        }),
        memberships: { create: { userId, role: MembershipRole.OWNER } },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        memberships: { where: { userId }, select: { role: true } },
      },
    });

    const { memberships, ...orgValues } = organization;

    return {
      ...orgValues,
      role: memberships?.[0]?.role,
    };
  }

  async getOrganizations(userId: string) {
    if (!userId) {
      throw new BadRequestException();
    }

    const organizations = await this.prisma.organization.findMany({
      where: { deletedAt: null, memberships: { some: { userId } } },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        memberships: { where: { userId }, select: { role: true } },
      },
    });

    return organizations.map(({ memberships, ...orgValues }) => ({
      ...orgValues,
      role: memberships?.[0]?.role,
    }));
  }
}
