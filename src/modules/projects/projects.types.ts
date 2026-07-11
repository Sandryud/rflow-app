import type { Prisma } from 'generated/prisma/client';

import type { CreateProjectDto } from './dto/create-project.dto';
import type { projectSelect } from './projects.select';

export type ProjectResponse = Prisma.ProjectGetPayload<{
  select: typeof projectSelect;
}>;

export type GetProjectsParams = {
  userId: string;
  organizationId: string;
};

export type GetProjectsResponse = ProjectResponse[];

export type CreateProjectParams = {
  userId: string;
  organizationId: string;
  dto: CreateProjectDto;
};

export type CreateProjectResponse = ProjectResponse;
