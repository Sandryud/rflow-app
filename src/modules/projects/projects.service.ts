import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsPolicy } from './projects.policy';
import { ProjectsRepository } from './projects.repository';

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
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly projectsPolicy: ProjectsPolicy,
  ) {}

  async getProjects(params: GetProjectsParams) {
    const { userId, organizationId } = params;

    const organization =
      await this.projectsRepository.findOrganizationWithProjects(
        userId,
        organizationId,
      );

    if (!organization) {
      throw new NotFoundException('You are not a member of this organization');
    }

    return organization.projects;
  }

  async createProject(params: CreateProjectParams) {
    const { dto, userId, organizationId } = params;

    const membership = await this.projectsRepository.findOrganizationMembership(
      userId,
      organizationId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
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
