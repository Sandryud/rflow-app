import type { Request } from 'express';

export type CurrentUser = {
  userId: string;
  email: string;
};

export type AuthRequest = Request & {
  user: CurrentUser;
};
