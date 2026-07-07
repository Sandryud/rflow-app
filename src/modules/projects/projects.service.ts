import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

import { PrismaService } from '@database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

type CreateProjectParams = {
  userId: string;
  organizationId: string;
  dto: CreateProjectDto;
};

type GetProjectsParams = {
  userId: string;
  organizationId: string;
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowedCreateProjectRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  async getProjects(params: GetProjectsParams) {
    const { userId, organizationId } = params;

    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
        memberships: { some: { userId } },
      },
      select: {
        projects: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            organizationId: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('You are not a member of this organization');
    }

    return organization.projects;
  }

  async createProject(params: CreateProjectParams) {
    const { dto, userId, organizationId } = params;

    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId, organization: { deletedAt: null } },
      select: { role: true, id: true },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    if (!this.allowedCreateProjectRoles.has(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to create projects',
      );
    }

    const project = this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        createdAt: true,
      },
    });

    return project;
  }
}
