import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ReleaseStatus } from 'generated/prisma/enums';

import { CreateReleaseDto, CreateReleaseTaskDto } from './dto/releases.dto';
import { ReleasesPolicy } from './releases.policy';
import { ReleasesRepository } from './releases.repository';

type UserParams = {
  userId: string;
};

type ProjectParams = UserParams & {
  projectId: string;
};

type CreateReleaseParams = ProjectParams & {
  dto: CreateReleaseDto;
};

type GetReleaseParams = UserParams & {
  releaseId: string;
};

type CreateReleaseTask = GetReleaseParams & {
  dto: CreateReleaseTaskDto;
};

@Injectable()
export class ReleasesService {
  constructor(
    private readonly releasesRepository: ReleasesRepository,
    private readonly releasesPolicy: ReleasesPolicy,
  ) {}

  async createRelease({ userId, dto, projectId }: CreateReleaseParams) {
    const membership = await this.releasesRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
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

  async getRelease({ userId, releaseId }: GetReleaseParams) {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    const release = await this.releasesRepository.findReleaseById(releaseId);

    if (!release) {
      throw new NotFoundException('The current release not found');
    }

    return release;
  }

  async getProjectReleases({ userId, projectId }: ProjectParams) {
    const membership = await this.releasesRepository.findProjectMembership(
      userId,
      projectId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    const releases =
      await this.releasesRepository.findProjectReleases(projectId);

    return releases;
  }

  async createReleaseTask({ releaseId, dto, userId }: CreateReleaseTask) {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    this.releasesPolicy.assertCanCreateReleaseTask(membership.role);

    const release =
      await this.releasesRepository.findReleaseStatusById(releaseId);

    if (!release) {
      throw new NotFoundException('The current release not found');
    }

    if (release.status !== ReleaseStatus.DRAFT) {
      throw new ConflictException(
        `Release status ${release?.status} does not meet the requirements to create a new release task`,
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

  async getReleaseTasks({ releaseId, userId }: GetReleaseParams) {
    const membership = await this.releasesRepository.findReleaseMembership(
      userId,
      releaseId,
    );

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
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
