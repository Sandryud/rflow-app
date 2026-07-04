import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import type { PrismaService } from '@database/prisma.service';
import { AuthService } from '@modules/auth/auth.service';
import type { LoginDto } from '@modules/auth/dto/login.dto';
import type { RegisterDto } from '@modules/auth/dto/register.dto';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

type JwtServiceMock = {
  signAsync: jest.Mock;
};

const bcryptCompareMock = bcrypt.compare as unknown as jest.MockedFunction<
  (password: string, passwordHash: string) => Promise<boolean>
>;

const bcryptHashMock = bcrypt.hash as unknown as jest.MockedFunction<
  (password: string, saltRounds: number) => Promise<string>
>;

const existingUser = {
  id: 'user-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
  passwordHash: 'hashed-password',
};

const createdUser = {
  id: 'created-user-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const createLoginDto = (overrides: Partial<LoginDto> = {}): LoginDto => ({
  email: 'Jane@Example.com ',
  password: 'password123',
  ...overrides,
});

const createRegisterDto = (
  overrides: Partial<RegisterDto> = {},
): RegisterDto => ({
  name: ' Jane Doe ',
  email: 'Jane@Example.com ',
  password: 'password123',
  ...overrides,
});

const createPrismaMock = (): PrismaMock => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
});

const createJwtServiceMock = (): JwtServiceMock => ({
  signAsync: jest.fn(),
});

const createService = () => {
  const prisma = createPrismaMock();
  const jwtService = createJwtServiceMock();
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwtService as unknown as JwtService,
  );

  return { jwtService, prisma, service };
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns access token and public user data when login credentials are valid', async () => {
    const { jwtService, prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(existingUser);
    bcryptCompareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('access-token');

    const result = await service.login(createLoginDto());

    expect(result).toEqual({
      accessToken: 'access-token',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      },
    });
  });

  it('normalizes email before looking up a user during login', async () => {
    const { jwtService, prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(existingUser);
    bcryptCompareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('access-token');

    await service.login(createLoginDto());

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jane@example.com' },
    });
  });

  it('throws UnauthorizedException when login user does not exist', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login(createLoginDto())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when login password is invalid', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(existingUser);
    bcryptCompareMock.mockResolvedValue(false);

    await expect(service.login(createLoginDto())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('signs login token with user id and email payload', async () => {
    const { jwtService, prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(existingUser);
    bcryptCompareMock.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('access-token');

    await service.login(createLoginDto());

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: existingUser.id,
      email: existingUser.email,
    });
  });

  it('returns public user data when registration succeeds', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue(createdUser);

    const result = await service.register(createRegisterDto());

    expect(result).toEqual(createdUser);
  });

  it('normalizes registration email before checking existing users', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue(createdUser);

    await service.register(createRegisterDto());

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jane@example.com' },
    });
  });

  it('throws ConflictException when registration email already exists', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(existingUser);

    await expect(service.register(createRegisterDto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('hashes registration password with expected salt rounds', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue(createdUser);

    await service.register(createRegisterDto());

    expect(bcryptHashMock).toHaveBeenCalledWith('password123', 12);
  });

  it('creates user with normalized email and trimmed name during registration', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    bcryptHashMock.mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue(createdUser);

    await service.register(createRegisterDto());

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hashed-password',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  });
});
