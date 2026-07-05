import type { Request } from 'express';

export type CurrentUserType = {
  userId: string;
  email: string;
};

export type RequestWithUserType = Request & {
  user: CurrentUserType;
};
