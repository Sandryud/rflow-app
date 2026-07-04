import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig, authConfig, dbConfig, envValidationSchema } from './config';
import { PrismaModule } from './database';
import {
  ApprovalsModule,
  AuditModule,
  AuthModule,
  ChecklistModule,
  CommentsModule,
  EnvironmentsModule,
  MembershipsModule,
  NotificationsModule,
  OrganizationsModule,
  ProjectsModule,
  ReleasesModule,
  UsersModule,
} from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, authConfig],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    ProjectsModule,
    EnvironmentsModule,
    ReleasesModule,
    ChecklistModule,
    ApprovalsModule,
    CommentsModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
