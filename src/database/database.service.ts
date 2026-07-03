import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get('database.host'),
      port: this.configService.get<number>('database.port'),
      user: this.configService.get('database.user'),
      password: this.configService.get('database.password'),
      database: this.configService.get('database.database'),
    });
  }

  async onModuleInit() {
    await this.pool.query('SELECT 1');
    this.logger.log('PostgreSQL connection established');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
