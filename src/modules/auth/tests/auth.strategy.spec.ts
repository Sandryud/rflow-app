import type { ConfigService } from '@nestjs/config';

import { JwtStrategy } from '@modules/auth/auth.strategy';

type ConfigServiceMock = {
  getOrThrow: jest.Mock;
};

const createConfigServiceMock = (): ConfigServiceMock => ({
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
});

const createStrategy = () => {
  const configService = createConfigServiceMock();
  const strategy = new JwtStrategy(configService as unknown as ConfigService);

  return { configService, strategy };
};

describe('JwtStrategy', () => {
  it('returns request user data from jwt payload', () => {
    const { strategy } = createStrategy();

    const result = strategy.validate({
      sub: 'user-id',
      email: 'jane@example.com',
    });

    expect(result).toEqual({
      userId: 'user-id',
      email: 'jane@example.com',
    });
  });
});
