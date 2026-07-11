import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { EnvironmentsPolicy } from './environments.policy';
import { EnvironmentsRepository } from './environments.repository';

type RequestParams = {
  userId: string;
  projectId: string;
};

type CreateEnvironmentParams = {
  dto: CreateEnvironmentDto;
} & RequestParams;

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly environmentsRepository: EnvironmentsRepository,
    private readonly environmentsPolicy: EnvironmentsPolicy,
  ) {}

  async getEnvironments({ userId, projectId }: RequestParams) {
    const project = await this.environmentsRepository.findProjectForUser(
      userId,
      projectId,
    );

    if (!project) {
      throw new NotFoundException('Not found project');
    }

    const envs =
      await this.environmentsRepository.findProjectEnvironments(projectId);

    return envs;
  }

  async createEnvironment({ dto, userId, projectId }: CreateEnvironmentParams) {
    const membership = await this.environmentsRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    this.environmentsPolicy.assertCanCreateEnvironment(membership.role);

    const env = await this.environmentsRepository.createEnvironment({
      name: dto.name,
      description: dto.description,
      projectId,
    });

    return env;
  }
}
