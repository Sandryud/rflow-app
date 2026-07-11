import { UnauthorizedException } from '@nestjs/common';

import type { UsersRepository } from '@modules/users/users.repository';
import { UsersService } from '@modules/users/users.service';

type UsersRepositoryMock = {
  findUserById: jest.Mock;
};

const currentUser = {
  id: 'user-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

const createUsersRepositoryMock = (): UsersRepositoryMock => ({
  findUserById: jest.fn(),
});

const createService = () => {
  const usersRepository = createUsersRepositoryMock();
  const service = new UsersService(
    usersRepository as unknown as UsersRepository,
  );

  return { service, usersRepository };
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
    const { service, usersRepository } = createService();
    usersRepository.findUserById.mockResolvedValue(null);

    await expect(service.getUser('missing-user-id')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns current user public data when user exists', async () => {
    const { service, usersRepository } = createService();
    usersRepository.findUserById.mockResolvedValue(currentUser);

    const result = await service.getUser('user-id');

    expect(result).toEqual(currentUser);
  });

  it('fetches current user by id', async () => {
    const { service, usersRepository } = createService();
    usersRepository.findUserById.mockResolvedValue(currentUser);

    await service.getUser('user-id');

    expect(usersRepository.findUserById).toHaveBeenCalledWith('user-id');
  });
});
