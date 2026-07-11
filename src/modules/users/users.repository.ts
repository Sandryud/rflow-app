import { Injectable } from '@nestjs/common';

import { PrismaService } from '@database/prisma.service';
import { userSelect } from './users.select';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
  }
}
