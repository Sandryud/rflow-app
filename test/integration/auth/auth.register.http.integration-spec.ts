import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import {
  expectHttpErrorResponse,
  toPublicUser,
} from './support/auth-http.assertions';
import { buildRegisterPayload } from './support/auth-payload.factory';
import { createAuthTestApp } from './support/auth-test-app';
import { createUser } from './support/user.factory';

const REGISTER_PATH = '/api/v1/auth/register';

type ValidationCase = {
  caseName: string;
  payload: Record<string, unknown>;
};

const validationCases: ValidationCase[] = [
  {
    caseName: 'missing email',
    payload: buildRegisterPayload({ email: undefined }),
  },
  {
    caseName: 'non-string email',
    payload: buildRegisterPayload({ email: 42 }),
  },
  {
    caseName: 'whitespace-only email',
    payload: buildRegisterPayload({ email: '   ' }),
  },
  {
    caseName: 'invalid email format',
    payload: buildRegisterPayload({ email: 'not-an-email' }),
  },
  {
    caseName: 'missing name',
    payload: buildRegisterPayload({ name: undefined }),
  },
  {
    caseName: 'non-string name',
    payload: buildRegisterPayload({ name: 42 }),
  },
  {
    caseName: 'whitespace-only name',
    payload: buildRegisterPayload({ name: '   ' }),
  },
  {
    caseName: 'name shorter than two characters after trim',
    payload: buildRegisterPayload({ name: ' a ' }),
  },
  {
    caseName: 'name longer than one hundred characters after trim',
    payload: buildRegisterPayload({ name: ` ${'a'.repeat(101)} ` }),
  },
  {
    caseName: 'missing password',
    payload: buildRegisterPayload({ password: undefined }),
  },
  {
    caseName: 'non-string password',
    payload: buildRegisterPayload({ password: 42 }),
  },
  {
    caseName: 'empty password',
    payload: buildRegisterPayload({ password: '' }),
  },
  {
    caseName: 'password shorter than six characters',
    payload: buildRegisterPayload({ password: '12345' }),
  },
  {
    caseName: 'password longer than one hundred twenty-eight characters',
    payload: buildRegisterPayload({ password: 'p'.repeat(129) }),
  },
  {
    caseName: 'unknown field',
    payload: buildRegisterPayload({ role: 'ADMIN' }),
  },
];

const boundaryCases = [
  {
    caseName: 'minimum lengths',
    name: 'AB',
    email: 'minimum@example.com',
    password: '123456',
  },
  {
    caseName: 'maximum lengths',
    name: 'N'.repeat(100),
    email: 'maximum@example.com',
    password: 'p'.repeat(128),
  },
];

describe('Auth register HTTP integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createAuthTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user with transformed public fields and a hashed exact password', async () => {
    const password = ' password123 ';

    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send(
        buildRegisterPayload({
          name: ' Jane Doe ',
          email: ' Jane@Example.COM ',
          password,
        }),
      )
      .expect(201);

    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'jane@example.com' },
    });

    expect(response.body).toStrictEqual(toPublicUser(storedUser));
    await expect(prisma.user.count()).resolves.toBe(1);
    expect(storedUser.name).toBe('Jane Doe');
    expect(storedUser.passwordHash).not.toBe(password);
    await expect(
      bcrypt.compare(password, storedUser.passwordHash),
    ).resolves.toBe(true);
    await expect(
      bcrypt.compare(password.trim(), storedUser.passwordHash),
    ).resolves.toBe(false);
  });

  it('returns conflict for an existing normalized email without changing the user', async () => {
    const existingUser = await createUser(prisma);

    const response = await request(app.getHttpServer())
      .post(REGISTER_PATH)
      .send(
        buildRegisterPayload({
          name: 'Another Jane',
          email: ' JANE@EXAMPLE.COM ',
          password: 'another-password',
        }),
      )
      .expect(409);

    expectHttpErrorResponse(response, {
      statusCode: 409,
      message: 'User with this email already exists',
      error: 'Conflict',
      path: REGISTER_PATH,
    });
    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: existingUser.id } }),
    ).resolves.toStrictEqual(existingUser);
  });

  it.each(validationCases)(
    'rejects invalid payload: $caseName',
    async ({ payload }) => {
      const response = await request(app.getHttpServer())
        .post(REGISTER_PATH)
        .send(payload)
        .expect(400);

      expectHttpErrorResponse(response, {
        statusCode: 400,
        message: expect.any(Array),
        error: 'Bad Request',
        path: REGISTER_PATH,
      });
      await expect(prisma.user.count()).resolves.toBe(0);
    },
  );

  it.each(boundaryCases)(
    'accepts $caseName',
    async ({ name, email, password }) => {
      const response = await request(app.getHttpServer())
        .post(REGISTER_PATH)
        .send(buildRegisterPayload({ name, email, password }))
        .expect(201);

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { email },
      });

      expect(response.body).toStrictEqual(toPublicUser(storedUser));
      await expect(
        bcrypt.compare(password, storedUser.passwordHash),
      ).resolves.toBe(true);
    },
  );
});
