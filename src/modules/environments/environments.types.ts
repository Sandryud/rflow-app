import type { Prisma } from 'generated/prisma/client';

import type { CreateEnvironmentDto } from './dto/create-environment.dto';
import type { environmentSelect } from './environments.select';

export type EnvironmentResponse = Prisma.EnvironmentGetPayload<{
  select: typeof environmentSelect;
}>;

export type EnvironmentProjectParams = {
  userId: string;
  projectId: string;
};

export type GetEnvironmentsParams = EnvironmentProjectParams;

export type GetEnvironmentsResponse = EnvironmentResponse[];

export type CreateEnvironmentParams = EnvironmentProjectParams & {
  dto: CreateEnvironmentDto;
};

export type CreateEnvironmentResponse = EnvironmentResponse;
