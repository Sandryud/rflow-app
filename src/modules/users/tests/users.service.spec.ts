import { UnauthorizedException } from '@nestjs/common';

import type { PrismaService } from '@database/prisma.service';
import { UsersService } from '@modules/users/users.service';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
  };
};

const currentUser = {
  id: 'user-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const createPrismaMock = (): PrismaMock => ({
  user: {
    findUnique: jest.fn(),
  },
});

const createService = () => {
  const prisma = createPrismaMock();
  const service = new UsersService(prisma as unknown as PrismaService);

  return { prisma, service };
};

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws UnauthorizedException when current user id is missing', async () => {
    const { service } = createService();

    await expect(service.getUser('')).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when current user does not exist', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getUser('missing-user-id')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns current user public data when user exists', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(currentUser);

    const result = await service.getUser('user-id');

    expect(result).toEqual(currentUser);
  });

  it('selects only public user fields when fetching current user', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(currentUser);

    await service.getUser('user-id');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: { email: true, id: true, name: true },
    });
  });
});
