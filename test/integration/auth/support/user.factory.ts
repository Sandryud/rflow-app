import * as bcrypt from 'bcrypt';

import type { PrismaService } from '@database/prisma.service';

const FIXTURE_PASSWORD_SALT_ROUNDS = 4;

export type UserFactoryOverrides = Partial<{
  email: string;
  name: string;
  password: string;
}>;

export const createUser = async (
  prisma: PrismaService,
  overrides: UserFactoryOverrides = {},
) => {
  const password = overrides.password ?? 'password123';
  const passwordHash = await bcrypt.hash(
    password,
    FIXTURE_PASSWORD_SALT_ROUNDS,
  );

  return prisma.user.create({
    data: {
      email: overrides.email ?? 'jane@example.com',
      name: overrides.name ?? 'Jane Doe',
      passwordHash,
    },
  });
};
