import { ConflictException, UnauthorizedException } from '@nestjs/common';

import type { AuthRepository } from '@modules/auth/auth.repository';
import { AuthService } from '@modules/auth/auth.service';
import type { AuthTokenService } from '@modules/auth/auth.token.service';
import type { LoginDto } from '@modules/auth/dto/login.dto';
import type { RegisterDto } from '@modules/auth/dto/register.dto';

type AuthRepositoryMock = {
  findUserByEmail: jest.Mock;
  createUser: jest.Mock;
};

type AuthPasswordServiceMock = {
  comparePassword: jest.Mock;
  hashPassword: jest.Mock;
};

type AuthTokenServiceMock = {
  signAccessToken: jest.Mock;
};

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
  email: 'Jane@Example.com',
  password: 'password123',
  ...overrides,
});

const createRegisterDto = (
  overrides: Partial<RegisterDto> = {},
): RegisterDto => ({
  name: 'Jane Doe',
  email: 'Jane@Example.com',
  password: 'password123',
  ...overrides,
});

const createAuthRepositoryMock = (): AuthRepositoryMock => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
});

const createAuthPasswordServiceMock = (): AuthPasswordServiceMock => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
});

const createAuthTokenServiceMock = (): AuthTokenServiceMock => ({
  signAccessToken: jest.fn(),
});

const createService = () => {
  const authRepository = createAuthRepositoryMock();
  const authPasswordService = createAuthPasswordServiceMock();
  const authTokenService = createAuthTokenServiceMock();
  const service = new AuthService(
    authRepository as unknown as AuthRepository,
    authPasswordService,
    authTokenService as unknown as AuthTokenService,
  );

  return { authPasswordService, authRepository, authTokenService, service };
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns access token and public user data when login credentials are valid', async () => {
    const { authPasswordService, authRepository, authTokenService, service } =
      createService();
    authRepository.findUserByEmail.mockResolvedValue(existingUser);
    authPasswordService.comparePassword.mockResolvedValue(true);
    authTokenService.signAccessToken.mockResolvedValue('access-token');

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
    const { authPasswordService, authRepository, authTokenService, service } =
      createService();
    authRepository.findUserByEmail.mockResolvedValue(existingUser);
    authPasswordService.comparePassword.mockResolvedValue(true);
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    await service.login(createLoginDto());

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(
      'jane@example.com',
    );
  });

  it('throws UnauthorizedException when login user does not exist', async () => {
    const { authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(null);

    await expect(service.login(createLoginDto())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when login password is invalid', async () => {
    const { authPasswordService, authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(existingUser);
    authPasswordService.comparePassword.mockResolvedValue(false);

    await expect(service.login(createLoginDto())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('checks login password against stored password hash', async () => {
    const { authPasswordService, authRepository, authTokenService, service } =
      createService();
    authRepository.findUserByEmail.mockResolvedValue(existingUser);
    authPasswordService.comparePassword.mockResolvedValue(true);
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    await service.login(createLoginDto());

    expect(authPasswordService.comparePassword).toHaveBeenCalledWith(
      'password123',
      existingUser.passwordHash,
    );
  });

  it('signs login token with user id and email payload', async () => {
    const { authPasswordService, authRepository, authTokenService, service } =
      createService();
    authRepository.findUserByEmail.mockResolvedValue(existingUser);
    authPasswordService.comparePassword.mockResolvedValue(true);
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    await service.login(createLoginDto());

    expect(authTokenService.signAccessToken).toHaveBeenCalledWith({
      sub: existingUser.id,
      email: existingUser.email,
    });
  });

  it('returns public user data when registration succeeds', async () => {
    const { authPasswordService, authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(null);
    authPasswordService.hashPassword.mockResolvedValue('hashed-password');
    authRepository.createUser.mockResolvedValue(createdUser);

    const result = await service.register(createRegisterDto());

    expect(result).toEqual(createdUser);
  });

  it('normalizes registration email before checking existing users', async () => {
    const { authPasswordService, authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(null);
    authPasswordService.hashPassword.mockResolvedValue('hashed-password');
    authRepository.createUser.mockResolvedValue(createdUser);

    await service.register(createRegisterDto());

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith(
      'jane@example.com',
    );
  });

  it('throws ConflictException when registration email already exists', async () => {
    const { authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(existingUser);

    await expect(service.register(createRegisterDto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('hashes registration password', async () => {
    const { authPasswordService, authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(null);
    authPasswordService.hashPassword.mockResolvedValue('hashed-password');
    authRepository.createUser.mockResolvedValue(createdUser);

    await service.register(createRegisterDto());

    expect(authPasswordService.hashPassword).toHaveBeenCalledWith(
      'password123',
    );
  });

  it('creates user with normalized email and trimmed name during registration', async () => {
    const { authPasswordService, authRepository, service } = createService();
    authRepository.findUserByEmail.mockResolvedValue(null);
    authPasswordService.hashPassword.mockResolvedValue('hashed-password');
    authRepository.createUser.mockResolvedValue(createdUser);

    await service.register(createRegisterDto());

    expect(authRepository.createUser).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      passwordHash: 'hashed-password',
    });
  });
});
