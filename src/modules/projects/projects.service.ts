import { Injectable, NotFoundException } from '@nestjs/common';

import { ErrorMessage } from '@common/constants/error-message';
import { ProjectsPolicy } from './projects.policy';
import { ProjectsRepository } from './projects.repository';
import type {
  CreateProjectParams,
  CreateProjectResponse,
  GetProjectsParams,
  GetProjectsResponse,
} from './projects.types';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectsPolicy: ProjectsPolicy,
  ) {}

  async getProjects(params: GetProjectsParams): Promise<GetProjectsResponse> {
    const { userId, organizationId } = params;

    const organization =
      await this.projectsRepository.findOrganizationWithProjects(
        userId,
        organizationId,
      );

    if (!organization) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    return organization.projects;
  }

  async createProject(
    params: CreateProjectParams,
  ): Promise<CreateProjectResponse> {
    const { dto, userId, organizationId } = params;

    const membership = await this.projectsRepository.findOrganizationMembership(
      userId,
      organizationId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.projectsPolicy.assertCanCreateProject(membership.role);

    const project = this.projectsRepository.createProject({
      name: dto.name,
      description: dto.description,
      organizationId,
    });

    return project;
  }
}
