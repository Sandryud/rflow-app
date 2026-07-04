import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import type { AuthRequest } from '@common/types/auth.types';
import { PrismaService } from '@database/prisma.service';
import { UsersController } from '@modules/users/users.controller';
import { UsersModule } from '@modules/users/users.module';

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

const createAuthRequest = (userId: string): AuthRequest =>
  ({
    user: {
      userId,
      email: currentUser.email,
    },
  }) as AuthRequest;

const createPrismaMock = (): PrismaMock => ({
  user: {
    findUnique: jest.fn(),
  },
});

const createTestingModule = async () => {
  const prisma = createPrismaMock();
  const moduleRef = await Test.createTestingModule({
    imports: [UsersModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  return {
    controller: moduleRef.get(UsersController),
    moduleRef,
    prisma,
  };
};

describe('UsersModule integration', () => {
  let moduleRef: TestingModule | null = null;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = null;
    jest.clearAllMocks();
  });

  it('resolves users controller from the testing module', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;

    expect(testingModule.controller).toBeInstanceOf(UsersController);
  });

  it('returns current user through controller and service providers', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;
    testingModule.prisma.user.findUnique.mockResolvedValue(currentUser);

    const result = await testingModule.controller.getUser(
      createAuthRequest('user-id'),
    );

    expect(result).toEqual(currentUser);
  });

  it('rejects missing current user through controller and service providers', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;
    testingModule.prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      testingModule.controller.getUser(createAuthRequest('missing-user-id')),
    ).rejects.toThrow('Current user not found');
  });
});
