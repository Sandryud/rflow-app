import type { Prisma } from 'generated/prisma/client';

import type { userSelect } from './users.select';

export type GetUserParams = string;

export type UserResponse = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

export type GetUserResponse = UserResponse;
