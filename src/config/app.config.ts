import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV || 'development',
}));
