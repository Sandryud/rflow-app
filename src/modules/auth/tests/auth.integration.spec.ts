import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { authConfig } from '@config/auth.config';
import { PrismaService } from '@database/prisma.service';
import { AuthController } from '@modules/auth/auth.controller';
import { AuthModule } from '@modules/auth/auth.module';
import type { LoginDto } from '@modules/auth/dto/login.dto';
import type { RegisterDto } from '@modules/auth/dto/register.dto';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

type JwtPayload = {
  sub: string;
  email: string;
};

const createdUser = {
  id: 'created-user-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const createLoginDto = (overrides: Partial<LoginDto> = {}): LoginDto => ({
  email: 'jane@example.com',
  password: 'password123',
  ...overrides,
});

const createRegisterDto = (
  overrides: Partial<RegisterDto> = {},
): RegisterDto => ({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
  ...overrides,
});

const createPrismaMock = (): PrismaMock => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
});

const createTestingModule = async () => {
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_SECRET = 'integration-test-secret';

  const prisma = createPrismaMock();
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        load: [authConfig],
      }),
      AuthModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  return {
    controller: moduleRef.get(AuthController),
    jwtService: moduleRef.get(JwtService),
    moduleRef,
    prisma,
  };
};

describe('AuthModule integration', () => {
  let moduleRef: TestingModule | null = null;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = null;
    jest.clearAllMocks();
  });

  it('resolves auth controller from the testing module', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;

    expect(testingModule.controller).toBeInstanceOf(AuthController);
  });

  it('registers a user through controller and service providers', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;
    testingModule.prisma.user.findUnique.mockResolvedValue(null);
    testingModule.prisma.user.create.mockResolvedValue(createdUser);

    const result = await testingModule.controller.register(createRegisterDto());

    expect(result).toEqual(createdUser);
  });

  it('returns a verifiable jwt when login succeeds through the module', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;
    const passwordHash = await bcrypt.hash('password123', 4);
    testingModule.prisma.user.findUnique.mockResolvedValue({
      ...createdUser,
      passwordHash,
    });

    const result = await testingModule.controller.login(createLoginDto());
    const payload = await testingModule.jwtService.verifyAsync<JwtPayload>(
      result.accessToken,
    );

    expect(payload).toMatchObject({
      sub: createdUser.id,
      email: createdUser.email,
    });
  });

  it('rejects duplicate registration through controller and service providers', async () => {
    const testingModule = await createTestingModule();
    moduleRef = testingModule.moduleRef;
    testingModule.prisma.user.findUnique.mockResolvedValue({
      ...createdUser,
      passwordHash: 'hashed-password',
    });

    await expect(
      testingModule.controller.register(createRegisterDto()),
    ).rejects.toThrow('User with this email already exists');
  });
});
