import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ReleaseStatus } from 'generated/prisma/enums';

import { ErrorMessage } from '@common/constants/error-message';
import { ReleasesPolicy } from './releases.policy';
import { ReleasesRepository } from './releases.repository';
import type {
  CreateReleaseParams,
  CreateReleaseResponse,
  CreateReleaseTaskParams,
  CreateReleaseTaskResponse,
  GetProjectReleasesParams,
  GetProjectReleasesResponse,
  GetReleaseParams,
  GetReleaseResponse,
  GetReleaseTasksParams,
  GetReleaseTasksResponse,
} from './releases.types';

@Injectable()
export class ReleasesService {
  constructor(
    private readonly releasesRepository: ReleasesRepository,
    private readonly releasesPolicy: ReleasesPolicy,
  ) {}

  async createRelease({
    userId,
    dto,
    projectId,
  }: CreateReleaseParams): Promise<CreateReleaseResponse> {
    const membership = await this.releasesRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanCreateRelease(membership.role);

    const env = await this.releasesRepository.findActiveEnvironment(
      projectId,
      dto.environmentId,
    );

    if (!env) {
      throw new NotFoundException(
        'The environment is not active for create release',
      );
    }

    const plannedReleaseAt = dto.plannedReleaseAt
      ? new Date(dto.plannedReleaseAt)
      : undefined;

    try {
      const release = await this.releasesRepository.createRelease({
        name: dto.name,
        description: dto.description,
        version: dto.version,
        environmentId: dto.environmentId,
        plannedReleaseAt,
        createdByUserId: userId,
        status: ReleaseStatus.DRAFT,
        projectId,
      });

      return release;
    } catch (error) {
      if (this.checkUniqueConstraintError(error)) {
        throw new ConflictException(
          'Release version already exists in this project',
        );
      }

      throw error;
    }
  }

  async getRelease({
    userId,
    releaseId,
  }: GetReleaseParams): Promise<GetReleaseResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const release = await this.releasesRepository.findReleaseById(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    return release;
  }

  async getProjectReleases({
    userId,
    projectId,
  }: GetProjectReleasesParams): Promise<GetProjectReleasesResponse> {
    const membership = await this.releasesRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const releases =
      await this.releasesRepository.findProjectReleases(projectId);

    return releases;
  }

  async createReleaseTask({
    releaseId,
    dto,
    userId,
  }: CreateReleaseTaskParams): Promise<CreateReleaseTaskResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    this.releasesPolicy.assertCanCreateReleaseTask(membership.role);

    const release =
      await this.releasesRepository.findReleaseStatusById(releaseId);

    if (!release) {
      throw new NotFoundException(ErrorMessage.RELEASE_NOT_FOUND);
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException(
        `Release status ${release.status} does not meet the requirements to create a new release task`,
      );
    }

    try {
      const releaseTask = await this.releasesRepository.createReleaseTask({
        name: dto.name,
        key: dto.key,
        description: dto.description,
        url: dto.url,
        type: dto.type,
        releaseId,
      });

      return releaseTask;
    } catch (error) {
      if (this.checkUniqueConstraintError(error)) {
        throw new ConflictException(
          'Release task key already exists in this release',
        );
      }

      throw error;
    }
  }

  async getReleaseTasks({
    releaseId,
    userId,
  }: GetReleaseTasksParams): Promise<GetReleaseTasksResponse> {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException(ErrorMessage.NOT_ORGANIZATION_MEMBER);
    }

    const tasks = await this.releasesRepository.findReleaseTasks(releaseId);

    return tasks;
  }

  private checkUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
