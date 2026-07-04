import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig, authConfig, dbConfig, envValidationSchema } from './config';
import { PrismaModule } from './database/prisma.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChecklistModule } from './modules/checklist/checklist.module';
import { CommentsModule } from './modules/comments/comments.module';
import { EnvironmentsModule } from './modules/environments/environments.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ReleasesModule } from './modules/releases/releases.module';
import { UsersModule } from './modules/users/users.module';

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
