import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from 'src/database';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(id: string) {
    if (!id) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true, id: true, name: true },
    });

    if (!user) throw new UnauthorizedException('Current user not found');

    return user;
  }
}
