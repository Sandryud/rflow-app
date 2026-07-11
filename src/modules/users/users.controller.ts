import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { RequestWithUserType } from '@common/types/request.types';
import { JwtAuthGuard } from '@modules/auth/auth.jwt-guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  getUser(@Req() req: RequestWithUserType) {
    return this.usersService.getUser(req.user.userId);
  }
}
