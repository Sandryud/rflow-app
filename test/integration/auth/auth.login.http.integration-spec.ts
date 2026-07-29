import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import {
  expectHttpErrorResponse,
  toPublicUser,
} from './support/auth-http.assertions';
import {
  buildLoginPayload,
  validLoginPayload,
} from './support/auth-payload.factory';
import { createAuthTestApp } from './support/auth-test-app';
import { createUser } from './support/user.factory';

const LOGIN_PATH = '/api/v1/auth/login';

type ValidationCase = {
  caseName: string;
  payload: Record<string, unknown>;
};

type LoginBody = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type VerifiedAccessToken = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const validationCases: ValidationCase[] = [
  {
    caseName: 'missing email',
    payload: buildLoginPayload({ email: undefined }),
  },
  {
    caseName: 'non-string email',
    payload: buildLoginPayload({ email: 42 }),
  },
  {
    caseName: 'whitespace-only email',
    payload: buildLoginPayload({ email: '   ' }),
  },
  {
    caseName: 'invalid email format',
    payload: buildLoginPayload({ email: 'not-an-email' }),
  },
  {
    caseName: 'missing password',
    payload: buildLoginPayload({ password: undefined }),
  },
  {
    caseName: 'non-string password',
    payload: buildLoginPayload({ password: 42 }),
  },
  {
    caseName: 'empty password',
    payload: buildLoginPayload({ password: '' }),
  },
  {
    caseName: 'password shorter than six characters',
    payload: buildLoginPayload({ password: '12345' }),
  },
  {
    caseName: 'password longer than one hundred twenty-eight characters',
    payload: buildLoginPayload({ password: 'p'.repeat(129) }),
  },
  {
    caseName: 'unknown field',
    payload: buildLoginPayload({ rememberMe: true }),
  },
];

const boundaryCases = [
  {
    caseName: 'minimum password length',
    email: 'login-minimum@example.com',
    password: '123456',
  },
  {
    caseName: 'maximum password length',
    email: 'login-maximum@example.com',
    password: 'p'.repeat(128),
  },
];

describe('Auth login HTTP integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = await createAuthTestApp();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a verifiable token and public user for transformed email and exact password', async () => {
    const password = ' password123 ';
    const user = await createUser(prisma, { password });

    const response = await request(app.getHttpServer())
      .post(LOGIN_PATH)
      .send(
        buildLoginPayload({
          email: ' JANE@EXAMPLE.COM ',
          password,
        }),
      )
      .expect(201);
    const body = response.body as LoginBody;
    const tokenPayload = await jwtService.verifyAsync<VerifiedAccessToken>(
      body.accessToken,
    );

    expect(Object.keys(body).sort()).toEqual(['accessToken', 'user']);
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken).not.toHaveLength(0);
    expect(body.user).toStrictEqual(toPublicUser(user));
    expect(tokenPayload).toMatchObject({
      sub: user.id,
      email: user.email,
    });
    expect(tokenPayload.exp - tokenPayload.iat).toBe(15 * 60);
  });

  it('returns the public unauthorized response for an unknown email', async () => {
    const response = await request(app.getHttpServer())
      .post(LOGIN_PATH)
      .send(validLoginPayload)
      .expect(401);

    expectHttpErrorResponse(response, {
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
      path: LOGIN_PATH,
    });
    await expect(prisma.user.count()).resolves.toBe(0);
    expect(response.body).not.toHaveProperty('accessToken');
  });

  it('returns the same public unauthorized response for an invalid password', async () => {
    const user = await createUser(prisma, {
      password: 'correct-password',
    });

    const response = await request(app.getHttpServer())
      .post(LOGIN_PATH)
      .send(
        buildLoginPayload({
          email: user.email,
          password: 'wrong-password',
        }),
      )
      .expect(401);

    expectHttpErrorResponse(response, {
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
      path: LOGIN_PATH,
    });
    expect(response.body).not.toHaveProperty('accessToken');
    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    ).resolves.toStrictEqual(user);
  });

  it.each(validationCases)(
    'rejects invalid payload: $caseName',
    async ({ payload }) => {
      const response = await request(app.getHttpServer())
        .post(LOGIN_PATH)
        .send(payload)
        .expect(400);

      expectHttpErrorResponse(response, {
        statusCode: 400,
        message: expect.any(Array),
        error: 'Bad Request',
        path: LOGIN_PATH,
      });
      expect(response.body).not.toHaveProperty('accessToken');
      await expect(prisma.user.count()).resolves.toBe(0);
    },
  );

  it.each(boundaryCases)('accepts $caseName', async ({ email, password }) => {
    const user = await createUser(prisma, { email, password });

    const response = await request(app.getHttpServer())
      .post(LOGIN_PATH)
      .send(buildLoginPayload({ email, password }))
      .expect(201);
    const body = response.body as LoginBody;

    expect(Object.keys(body).sort()).toEqual(['accessToken', 'user']);
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken).not.toHaveLength(0);
    expect(body.user).toStrictEqual(toPublicUser(user));
  });
});
