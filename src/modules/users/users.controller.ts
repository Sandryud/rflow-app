import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { AuthRequest } from '@common/types/auth.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async getUser(@Req() req: AuthRequest) {
    return this.usersService.getUser(req.user.userId);
  }
}
