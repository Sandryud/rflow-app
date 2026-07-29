import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { authConfig } from '@config/auth.config';
import { PrismaService } from '@database/prisma.service';
import { AuthModule } from '@modules/auth/auth.module';
import { configureApp } from '../../../src/configure-app';
import { createUser } from './support/user.factory';

const REGISTER_PATH = '/api/v1/auth/register';
const LOGIN_PATH = '/api/v1/auth/login';
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const validRegisterPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
};

const validLoginPayload = {
  email: 'jane@example.com',
  password: 'password123',
};

type ValidationCase = {
  caseName: string;
  payload: Record<string, unknown>;
};

type PublicUserBody = {
  id: string;
  name: string;
  email: string;
};

type LoginBody = {
  accessToken: string;
  user: PublicUserBody;
};

type VerifiedAccessToken = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const registerValidationCases: ValidationCase[] = [
  {
    caseName: 'missing email',
    payload: {
      name: validRegisterPayload.name,
      password: validRegisterPayload.password,
    },
  },
  {
    caseName: 'non-string email',
    payload: { ...validRegisterPayload, email: 42 },
  },
  {
    caseName: 'whitespace-only email',
    payload: { ...validRegisterPayload, email: '   ' },
  },
  {
    caseName: 'invalid email format',
    payload: { ...validRegisterPayload, email: 'not-an-email' },
  },
  {
    caseName: 'missing name',
    payload: {
      email: validRegisterPayload.email,
      password: validRegisterPayload.password,
    },
  },
  {
    caseName: 'non-string name',
    payload: { ...validRegisterPayload, name: 42 },
  },
  {
    caseName: 'whitespace-only name',
    payload: { ...validRegisterPayload, name: '   ' },
  },
  {
    caseName: 'name shorter than two characters after trim',
    payload: { ...validRegisterPayload, name: ' a ' },
  },
  {
    caseName: 'name longer than one hundred characters after trim',
    payload: { ...validRegisterPayload, name: ` ${'a'.repeat(101)} ` },
  },
  {
    caseName: 'missing password',
    payload: {
      name: validRegisterPayload.name,
      email: validRegisterPayload.email,
    },
  },
  {
    caseName: 'non-string password',
    payload: { ...validRegisterPayload, password: 42 },
  },
  {
    caseName: 'empty password',
    payload: { ...validRegisterPayload, password: '' },
  },
  {
    caseName: 'password shorter than six characters',
    payload: { ...validRegisterPayload, password: '12345' },
  },
  {
    caseName: 'password longer than one hundred twenty-eight characters',
    payload: { ...validRegisterPayload, password: 'p'.repeat(129) },
  },
  {
    caseName: 'unknown field',
    payload: { ...validRegisterPayload, role: 'ADMIN' },
  },
];

const loginValidationCases: ValidationCase[] = [
  {
    caseName: 'missing email',
    payload: { password: validLoginPayload.password },
  },
  {
    caseName: 'non-string email',
    payload: { ...validLoginPayload, email: 42 },
  },
  {
    caseName: 'whitespace-only email',
    payload: { ...validLoginPayload, email: '   ' },
  },
  {
    caseName: 'invalid email format',
    payload: { ...validLoginPayload, email: 'not-an-email' },
  },
  {
    caseName: 'missing password',
    payload: { email: validLoginPayload.email },
  },
  {
    caseName: 'non-string password',
    payload: { ...validLoginPayload, password: 42 },
  },
  {
    caseName: 'empty password',
    payload: { ...validLoginPayload, password: '' },
  },
  {
    caseName: 'password shorter than six characters',
    payload: { ...validLoginPayload, password: '12345' },
  },
  {
    caseName: 'password longer than one hundred twenty-eight characters',
    payload: { ...validLoginPayload, password: 'p'.repeat(129) },
  },
  {
    caseName: 'unknown field',
    payload: { ...validLoginPayload, rememberMe: true },
  },
];

const registerBoundaryCases = [
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

const loginBoundaryCases = [
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

const expectErrorResponse = (
  response: { body: Record<string, unknown> },
  expected: {
    statusCode: number;
    message: unknown;
    error: string;
    path: string;
  },
): void => {
  expect(response.body).toMatchObject(expected);
  expect(response.body.timestamp).toEqual(
    expect.stringMatching(ISO_TIMESTAMP_PATTERN),
  );
};

describe('Auth HTTP integration', () => {
  let moduleRef: TestingModule;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [authConfig],
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a user with transformed public fields and a hashed exact password', async () => {
      const password = ' password123 ';

      const response = await request(app.getHttpServer())
        .post(REGISTER_PATH)
        .send({
          name: ' Jane Doe ',
          email: ' Jane@Example.COM ',
          password,
        })
        .expect(201);

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'jane@example.com' },
      });

      expect(response.body).toStrictEqual({
        id: storedUser.id,
        name: 'Jane Doe',
        email: 'jane@example.com',
      });
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
        .send({
          name: 'Another Jane',
          email: ' JANE@EXAMPLE.COM ',
          password: 'another-password',
        })
        .expect(409);

      expectErrorResponse(response, {
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

    it.each(registerValidationCases)(
      'rejects invalid payload: $caseName',
      async ({ payload }) => {
        const response = await request(app.getHttpServer())
          .post(REGISTER_PATH)
          .send(payload)
          .expect(400);

        expectErrorResponse(response, {
          statusCode: 400,
          message: expect.any(Array),
          error: 'Bad Request',
          path: REGISTER_PATH,
        });
        await expect(prisma.user.count()).resolves.toBe(0);
      },
    );

    it.each(registerBoundaryCases)(
      'accepts $caseName',
      async ({ name, email, password }) => {
        const response = await request(app.getHttpServer())
          .post(REGISTER_PATH)
          .send({ name, email, password })
          .expect(201);

        const storedUser = await prisma.user.findUniqueOrThrow({
          where: { email },
        });

        expect(response.body).toStrictEqual({
          id: storedUser.id,
          name,
          email,
        });
        await expect(
          bcrypt.compare(password, storedUser.passwordHash),
        ).resolves.toBe(true);
      },
    );
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns a verifiable token and public user for transformed email and exact password', async () => {
      const password = ' password123 ';
      const user = await createUser(prisma, { password });

      const response = await request(app.getHttpServer())
        .post(LOGIN_PATH)
        .send({
          email: ' JANE@EXAMPLE.COM ',
          password,
        })
        .expect(201);
      const body = response.body as LoginBody;
      const tokenPayload = await jwtService.verifyAsync<VerifiedAccessToken>(
        body.accessToken,
      );

      expect(Object.keys(body).sort()).toEqual(['accessToken', 'user']);
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken).not.toHaveLength(0);
      expect(body.user).toStrictEqual({
        id: user.id,
        name: user.name,
        email: user.email,
      });
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

      expectErrorResponse(response, {
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
        .send({
          email: user.email,
          password: 'wrong-password',
        })
        .expect(401);

      expectErrorResponse(response, {
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

    it.each(loginValidationCases)(
      'rejects invalid payload: $caseName',
      async ({ payload }) => {
        const response = await request(app.getHttpServer())
          .post(LOGIN_PATH)
          .send(payload)
          .expect(400);

        expectErrorResponse(response, {
          statusCode: 400,
          message: expect.any(Array),
          error: 'Bad Request',
          path: LOGIN_PATH,
        });
        expect(response.body).not.toHaveProperty('accessToken');
        await expect(prisma.user.count()).resolves.toBe(0);
      },
    );

    it.each(loginBoundaryCases)(
      'accepts $caseName',
      async ({ email, password }) => {
        const user = await createUser(prisma, { email, password });

        const response = await request(app.getHttpServer())
          .post(LOGIN_PATH)
          .send({ email, password })
          .expect(201);
        const body = response.body as LoginBody;

        expect(Object.keys(body).sort()).toEqual(['accessToken', 'user']);
        expect(typeof body.accessToken).toBe('string');
        expect(body.accessToken).not.toHaveLength(0);
        expect(body.user).toStrictEqual({
          id: user.id,
          name: user.name,
          email,
        });
      },
    );
  });
});
