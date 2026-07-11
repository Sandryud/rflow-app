import * as bcrypt from 'bcrypt';

import { AuthPasswordService } from '@modules/auth/auth.password.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcryptCompareMock = bcrypt.compare as unknown as jest.MockedFunction<
  (password: string, passwordHash: string) => Promise<boolean>
>;

const bcryptHashMock = bcrypt.hash as unknown as jest.MockedFunction<
  (password: string, saltRounds: number) => Promise<string>
>;

describe('AuthPasswordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('compares password with password hash', async () => {
    const service = new AuthPasswordService();
    bcryptCompareMock.mockResolvedValue(true);

    const result = await service.comparePassword('password', 'hash');

    expect(result).toBe(true);
    expect(bcryptCompareMock).toHaveBeenCalledWith('password', 'hash');
  });

  it('hashes password with expected salt rounds', async () => {
    const service = new AuthPasswordService();
    bcryptHashMock.mockResolvedValue('hash');

    const result = await service.hashPassword('password');

    expect(result).toBe('hash');
    expect(bcryptHashMock).toHaveBeenCalledWith('password', 12);
  });
});
