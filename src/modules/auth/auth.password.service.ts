import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class AuthPasswordService {
  comparePassword(password: string, passwordHash: string) {
    return bcrypt.compare(password, passwordHash);
  }

  hashPassword(password: string) {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }
}
