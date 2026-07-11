import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthPasswordService } from './auth.password.service';
import { AuthRepository } from './auth.repository';
import { AuthTokenService } from './auth.token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authPasswordService: AuthPasswordService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();

    const user = await this.authRepository.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.authPasswordService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const jwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: await this.authTokenService.signAccessToken(jwtPayload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const user = await this.authRepository.findUserByEmail(email);

    if (user) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await this.authPasswordService.hashPassword(
      dto.password,
    );

    const createdUser = this.authRepository.createUser({
      name: dto.name,
      email,
      passwordHash,
    });

    return createdUser;
  }
}
