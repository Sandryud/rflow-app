import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type AccessTokenPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayload) {
    return this.jwtService.signAsync(payload);
  }
}
