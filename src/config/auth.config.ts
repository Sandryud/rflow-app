import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  jwtSecret: process.env.JWT_SECRET,
}));
