import type { Prisma } from 'generated/prisma/client';

import type { publicUserSelect } from './auth.select';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

export type LoginParams = LoginDto;

export type RegisterParams = RegisterDto;

export type PublicUserResponse = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type LoginResponse = {
  accessToken: string;
  user: PublicUserResponse;
};

export type RegisterResponse = PublicUserResponse;
