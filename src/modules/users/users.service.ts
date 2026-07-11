import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UsersRepository } from './users.repository';
import type { GetUserParams, GetUserResponse } from './users.types';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUser(id: GetUserParams): Promise<GetUserResponse> {
    if (!id) throw new UnauthorizedException();

    const user = await this.usersRepository.findUserById(id);

    if (!user) throw new UnauthorizedException('Current user not found');

    return user;
  }
}
