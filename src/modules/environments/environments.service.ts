import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from 'generated/prisma/enums';

import { PrismaService } from '@database/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';

type RequestParams = {
  userId: string;
  projectId: string;
};

type CreateEnvironmentParams = {
  dto: CreateEnvironmentDto;
} & RequestParams;

@Injectable()
export class EnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowedCreateEnvRoles = new Set<MembershipRole>([
    MembershipRole.OWNER,
    MembershipRole.MANAGER,
  ]);

  async getEnvironments({ userId, projectId }: RequestParams) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        organization: {
          deletedAt: null,
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Not found project');
    }

    const envs = await this.prisma.environment.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        projectId: true,
        isActive: true,
        isDefault: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    return envs;
  }

  async createEnvironment({ dto, userId, projectId }: CreateEnvironmentParams) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organization: {
          deletedAt: null,
          projects: { some: { id: projectId, deletedAt: null } },
        },
      },
      select: {
        role: true,
        id: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    if (!this.allowedCreateEnvRoles.has(membership.role)) {
      throw new ForbiddenException(
        'You do not have permission to create environment',
      );
    }

    const env = await this.prisma.environment.create({
      data: {
        name: dto.name,
        description: dto.description,
        projectId,
      },
      select: {
        id: true,
        name: true,
        projectId: true,
        description: true,
        createdAt: true,
        isActive: true,
        isDefault: true,
      },
    });

    return env;
  }
}
