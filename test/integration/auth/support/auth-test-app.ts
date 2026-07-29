import type { INestApplication, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';

import { authConfig } from '@config/auth.config';
import { AuthModule } from '@modules/auth/auth.module';
import { configureApp } from '../../../../src/configure-app';

export const createAuthTestingModule = (
  controllers: Type<unknown>[] = [],
): Promise<TestingModule> =>
  Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [authConfig],
      }),
      AuthModule,
    ],
    controllers,
  }).compile();

export const createAuthTestApp = async (
  controllers: Type<unknown>[] = [],
): Promise<INestApplication<App>> => {
  const moduleRef = await createAuthTestingModule(controllers);
  const app: INestApplication<App> = moduleRef.createNestApplication();

  configureApp(app);
  await app.init();

  return app;
};
