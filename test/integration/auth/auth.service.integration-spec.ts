import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/client';

import { PrismaService } from '@database/prisma.service';
import { AuthService } from '@modules/auth/auth.service';
import { createAuthTestingModule } from './support/auth-test-app';
import { createUser } from './support/user.factory';

type VerifiedAccessToken = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

describe('AuthService integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    moduleRef = await createAuthTestingModule();
    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    authService = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('register', () => {
    it('creates a user with a normalized email and hashed password', async () => {
      const password = 'password123';

      const result = await authService.register({
        name: 'Jane Doe',
        email: 'Jane@Example.COM',
        password,
      });

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'jane@example.com' },
      });
      const userCount = await prisma.user.count();

      expect(result).toStrictEqual({
        id: storedUser.id,
        name: 'Jane Doe',
        email: 'jane@example.com',
      });
      expect(Object.keys(result).sort()).toEqual(['email', 'id', 'name']);
      expect(userCount).toBe(1);
      expect(storedUser.passwordHash).not.toBe(password);
      await expect(
        bcrypt.compare(password, storedUser.passwordHash),
      ).resolves.toBe(true);
    });

    it('rejects a duplicate email regardless of letter case without changing the existing user', async () => {
      const existingUser = await createUser(prisma);

      const registration = authService.register({
        name: 'Another Jane',
        email: 'JANE@EXAMPLE.COM',
        password: 'another-password',
      });

      await expect(registration).rejects.toBeInstanceOf(ConflictException);
      await expect(registration).rejects.toThrow(
        'User with this email already exists',
      );

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { id: existingUser.id },
      });
      const userCount = await prisma.user.count();

      expect(storedUser).toStrictEqual(existingUser);
      expect(userCount).toBe(1);
    });

    it('preserves email uniqueness during concurrent registrations', async () => {
      const results = await Promise.allSettled([
        authService.register({
          name: 'Jane One',
          email: 'race@example.com',
          password: 'password-one',
        }),
        authService.register({
          name: 'Jane Two',
          email: 'race@example.com',
          password: 'password-two',
        }),
      ]);

      const fulfilledResults = results.filter(
        (result) => result.status === 'fulfilled',
      );
      const rejectedResults = results.filter(
        (result) => result.status === 'rejected',
      );
      const storedUsers = await prisma.user.findMany({
        where: { email: 'race@example.com' },
      });

      expect(fulfilledResults).toHaveLength(1);
      expect(rejectedResults).toHaveLength(1);
      expect(storedUsers).toHaveLength(1);

      const rejectedResult = rejectedResults[0];

      if (!rejectedResult) {
        throw new Error('Expected one rejected registration');
      }

      const rejection: unknown = rejectedResult.reason;

      expect(rejection).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

      if (!(rejection instanceof Prisma.PrismaClientKnownRequestError)) {
        throw new Error('Expected PrismaClientKnownRequestError');
      }

      expect(rejection.code).toBe('P2002');
      expect(rejection.meta?.modelName).toBe('User');
    });
  });

  describe('login', () => {
    it('returns a verifiable access token and public user for valid credentials', async () => {
      const password = 'password123';
      const user = await createUser(prisma, { password });

      const result = await authService.login({
        email: 'JANE@EXAMPLE.COM',
        password,
      });

      const tokenPayload = await jwtService.verifyAsync<VerifiedAccessToken>(
        result.accessToken,
      );

      expect(result.user).toStrictEqual({
        id: user.id,
        name: user.name,
        email: user.email,
      });
      expect(Object.keys(result.user).sort()).toEqual(['email', 'id', 'name']);
      expect(tokenPayload).toMatchObject({
        sub: user.id,
        email: user.email,
      });
      expect(tokenPayload.exp - tokenPayload.iat).toBe(15 * 60);
    });

    it('rejects login when the user does not exist without changing the database', async () => {
      const login = authService.login({
        email: 'missing@example.com',
        password: 'password123',
      });

      await expect(login).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(login).rejects.toThrow('Invalid email or password');
      await expect(prisma.user.count()).resolves.toBe(0);
    });

    it('rejects an invalid password without changing the existing user', async () => {
      const user = await createUser(prisma, {
        password: 'correct-password',
      });

      const login = authService.login({
        email: user.email,
        password: 'wrong-password',
      });

      await expect(login).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(login).rejects.toThrow('Invalid email or password');

      const storedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });

      expect(storedUser).toStrictEqual(user);
      await expect(prisma.user.count()).resolves.toBe(1);
    });

    it('preserves significant password whitespace', async () => {
      const password = ' password123 ';
      const user = await createUser(prisma, { password });

      const result = await authService.login({
        email: user.email,
        password,
      });
      const loginWithoutWhitespace = authService.login({
        email: user.email,
        password: password.trim(),
      });

      expect(result.user).toStrictEqual({
        id: user.id,
        name: user.name,
        email: user.email,
      });
      expect(result.accessToken).toEqual(expect.any(String));
      await expect(loginWithoutWhitespace).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(loginWithoutWhitespace).rejects.toThrow(
        'Invalid email or password',
      );
    });
  });
});
