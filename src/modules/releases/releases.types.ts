import type { Prisma } from 'generated/prisma/client';

import type {
  CreateReleaseDto,
  CreateReleaseTaskDto,
} from './dto/releases.dto';
import type {
  releaseSelect,
  releaseTaskSelect,
  updateReleaseSelect,
} from './releases.select';

export type ReleaseResponse = Prisma.ReleaseGetPayload<{
  select: typeof releaseSelect;
}>;

export type ReleaseTaskResponse = Prisma.ReleaseTaskGetPayload<{
  select: typeof releaseTaskSelect;
}>;

export type ReleaseUserParams = {
  userId: string;
};

export type ReleaseProjectParams = ReleaseUserParams & {
  projectId: string;
};

export type CreateReleaseParams = ReleaseProjectParams & {
  dto: CreateReleaseDto;
};

export type CreateReleaseResponse = ReleaseResponse;

export type GetReleaseParams = ReleaseUserParams & {
  releaseId: string;
};

export type GetReleaseResponse = ReleaseResponse;

export type GetProjectReleasesParams = ReleaseProjectParams;

export type GetProjectReleasesResponse = ReleaseResponse[];

export type CreateReleaseTaskParams = GetReleaseParams & {
  dto: CreateReleaseTaskDto;
};

export type CreateReleaseTaskResponse = ReleaseTaskResponse;

export type GetReleaseTasksParams = GetReleaseParams;

export type GetReleaseTasksResponse = ReleaseTaskResponse[];

export type RequestReviewReleaseParams = GetReleaseParams;

export type RequestReviewReleaseResponse = Prisma.ReleaseGetPayload<{
  select: typeof updateReleaseSelect;
}>;
