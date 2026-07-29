import {
  Controller,
  Get,
  type INestApplication,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '@database/prisma.service';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { AuthService } from '@modules/auth/auth.service';
import { expectHttpErrorResponse } from './support/auth-http.assertions';
import { createAuthTestApp } from './support/auth-test-app';
import { createUser } from './support/user.factory';

const PROTECTED_PATH = '/api/v1/auth-test/me';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
  };
};

let protectedHandlerCalls = 0;

@Controller('auth-test')
class ProtectedTestController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    protectedHandlerCalls += 1;

    return request.user;
  }
}

const expectGuardUnauthorizedResponse = (response: {
  body: Record<string, unknown>;
}): void => {
  expectHttpErrorResponse(response, {
    statusCode: 401,
    message: 'Unauthorized',
    error: 'UnauthorizedException',
    path: PROTECTED_PATH,
  });
  expect(protectedHandlerCalls).toBe(0);
};

describe('JwtAuthGuard integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    app = await createAuthTestApp([ProtectedTestController]);
    prisma = app.get(PrismaService);
    authService = app.get(AuthService);
    jwtService = app.get(JwtService);
  });

  beforeEach(() => {
    protectedHandlerCalls = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts an access token issued by login and maps its payload to request user', async () => {
    const password = 'password123';
    const user = await createUser(prisma, { password });
    const { accessToken } = await authService.login({
      email: user.email,
      password,
    });

    const response = await request(app.getHttpServer())
      .get(PROTECTED_PATH)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toStrictEqual({
      userId: user.id,
      email: user.email,
    });
    expect(protectedHandlerCalls).toBe(1);
  });

  it('rejects a request without an authorization header', async () => {
    const response = await request(app.getHttpServer())
      .get(PROTECTED_PATH)
      .expect(401);

    expectGuardUnauthorizedResponse(response);
  });

  it('rejects a token signed with another secret', async () => {
    const invalidIssuer = new JwtService({
      secret: 'different-integration-test-secret',
    });
    const accessToken = await invalidIssuer.signAsync({
      sub: 'user-id',
      email: 'jane@example.com',
    });

    const response = await request(app.getHttpServer())
      .get(PROTECTED_PATH)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expectGuardUnauthorizedResponse(response);
  });

  it('rejects an expired token', async () => {
    const accessToken = await jwtService.signAsync(
      {
        sub: 'user-id',
        email: 'jane@example.com',
      },
      { expiresIn: -1 },
    );

    const response = await request(app.getHttpServer())
      .get(PROTECTED_PATH)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expectGuardUnauthorizedResponse(response);
  });

  it('rejects a non-bearer authorization header', async () => {
    const response = await request(app.getHttpServer())
      .get(PROTECTED_PATH)
      .set('Authorization', 'Token not-a-bearer-token')
      .expect(401);

    expectGuardUnauthorizedResponse(response);
  });
});
