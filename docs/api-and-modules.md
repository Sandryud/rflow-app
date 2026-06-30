# API and NestJS Modules

## Содержание

1. [Общие принципы API](#1-общие-принципы-api)
2. [NestJS Modules](#2-nestjs-modules)
3. [REST Endpoints](#3-rest-endpoints)
4. [DTO](#4-dto)
5. [Guards / Permissions](#5-guards--permissions)
6. [Audit Events](#6-audit-events)
7. [Notifications](#7-notifications)

## 1. Общие принципы API

## 2. NestJS Modules

- AuthModule
- UsersModule
- OrganizationsModule
- MembershipsModule
- ProjectsModule
- EnvironmentsModule
- ReleasesModule
- ChecklistModule
- ApprovalsModule
- CommentsModule
- AuditModule
- NotificationsModule

## 3. REST Endpoints

## 4. DTO

## 5. Guards / Permissions

## 6. Audit Events

## 7. Notifications

## Modules

### AuthModule

**Ответственность:**
Модуль отвечает за аутенификацию и регистрацию пользователя.

**Сущности:**

- User

**Основные endpoints:**

- `/api/v1/auth/login`
- `/api/v1/auth/registration`

**DTO:**

RegistrationDto

- name
- email
- password

LoginDto

- email
- password

### UsersModule

**Ответственность:**
Модуль отвечает за пользователей всего проекта.

**Сущности:**

- User

**Основные endpoints:**

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/users`

**DTO:**

UserDto

- id
- name
- email
- created_at
- updated_at

UserListItemDto

- id
- name
- email

UpdateProfileDto

- name?
- email?

### OrganizationsModule

**Ответственность:**
Главная доменая область которая организует проекты и участников.

**Сущности:**

- Organizations

**Основные endpoints:**

- `GET /api/v1/organizations`
- `GET /api/v1/organizations/:organizationId`
- `PATCH /api/v1/organizations/:organizationId`
- `DELETE /api/v1/organizations/:organizationId`
- `POST /api/v1/organizations`

**DTO:**

CreateOrganizationDto

- name
- description?

UpdateOrganizationDto

- name?
- description?

OrganizationDto

- id
- name
- description
- created_at
- updated_at
- deleted_at

OrganizationListItemDto

- id
- name
- description

### MembershipsModule

**Ответственность:**
Участники организации имеющие определенную роль в жизни проектных релизов.

**Сущности:**

- User
- Memberships
- Organizations

**Основные endpoints:**

- `GET /api/v1/organizations/:organizationId/memberships`
- `GET /api/v1/memberships/:membershipId`
- `PATCH /api/v1/memberships/:membershipId`
- `DELETE /api/v1/memberships/:memberId`
- `POST /api/v1/organizations/:organizationId/memberships`

**DTO:**

CreateMembershipDto

- email
- role

MembershipDto

- id
- role
- user
  - id
  - email
  - name

UpdateMembershipDto

- role?

### ProjectsModule

**Ответственность:**
Отвечает за конкретный проект с релизным циклом.

**Сущности:**

- Projects

**Основные endpoints:**

- `GET /api/v1/organizations/:organizationId/projects`
- `GET /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- `DELETE /api/v1/projects/:projectId`
- `POST /api/v1/organizations/:organizationId/projects`

**DTO:**

CreateProjectDto

- name
- description?

UpdateProjectDto

- name?
- description?

ProjectDto

- id
- name
- description
- created_at

### EnvironmentsModule

**Ответственность:**
Оргунизует окружение для конкретного проекта, например: dev, prod.

**Сущности:**

- Environments

**Основные endpoints:**

- `GET /api/v1/projects/:projectId/environments`
- `GET /api/v1/environments/:environmentId`
- `PATCH /api/v1/environments/:environmentId`
- `DELETE /api/v1/environments/:environmentId`
- `POST /api/v1/projects/:projectId/environments`

**DTO:**

CreateEnvironmentDto

- name
- description?

UpdateEnvironmentDto

- name?
- description?
- is_active?
- is_default?

EnvironmentDto

- id
- name
- description
- is_active
- is_default

### ReleasesModule

**Ответственность:**
Проектный релиз с полным циклом действий.

**Сущности:**

- Release
- Release_task

**Основные endpoints:**

- `GET /api/v1/projects/:projectId/releases`
- `GET /api/v1/releases/:releaseId`
- `PATCH /api/v1/releases/:releaseId`
- `DELETE /api/v1/releases/:releaseId`
- `POST /api/v1/projects/:projectId/releases`
- `POST /api/v1/releases/:releaseId/release-tasks`
- `GET /api/v1/releases/:releaseId/release-tasks`
- `PATCH /api/v1/release-tasks/:releaseTaskId`
- `DELETE /api/v1/release-tasks/:releaseTaskId`

**DTO:**

CreateReleaseDto

- environment_id
- name
- description?
- planned_release_at?

UpdateReleaseDto

- name?
- description?
- planned_release_at?

ReleaseDto

- id
- version
- name
- description
- status
- createdBy
  - id
  - name
  - email
- planned_release_at
- created_at
- updated_at

ReleaseListItemDto

- id
- version
- name
- description
- status
- planned_release_at

CreateReleaseTaskDto

- key
- name
- description

UpdateReleaseTaskDto

- key?
- name?
- description?

ReleaseTaskDto

- id
- key
- name
- description
- created_at
- updated_at

### CheckListItemModule

**Ответственность:**
Отвечает за список предрелизных выполнений в виде списка дел.

**Сущности:**

- CheckListItem

**Основные endpoints:**

- `GET /api/v1/releases/:releaseId/checklist-items`
- `PATCH /api/v1/checklist-items/:checklistItemId`
- `DELETE /api/v1/checklist-items/:checklistItemId`
- `POST /api/v1/releases/:releaseId/checklist-items`
- `PATCH /api/v1/checklist-items/:checklistItemId/status`

**DTO:**

CreateCheckListItemDto

- title
- description?
- is_required?
- assigned_to_user_id?

UpdateCheckListItemDto

- title?
- description?
- is_required?
- assigned_to_user_id?

UpdateChecklistItemStatusDto

- status
- comment?

CheckListItemItemDto

- id
- title
- description
- status
- is_required
- assigned_to_user_id
- comment
- createdBy
  - id
  - name
  - email
- completedBy
  - id
  - name
  - email
- completed_at
- created_at
- updated_at

### ApprovalsModule

**Ответственность:**
Отвечает за управление разрешениями на изменение статуса релиза.

**Сущности:**

- Approval

**Основные endpoints:**

- `GET /api/v1/releases/:releaseId/approvals` - получение списка ревьюверов и статуса по ним
- `POST /api/v1/releases/:releaseId/approvals` - назначение ревьювера
- `PATCH /api/v1/approvals/:approvalId/approve`
- `PATCH /api/v1/approvals/:approvalId/reject`
- `PATCH /api/v1/approvals/:approvalId/revoke`
- `DELETE /api/v1/approvals/:approvalId` - удаляет разрешения пользователя на апрув (только в статусе драфт)

**DTO:**

CreateApprovalDto

- reviewer_user_id

RejectApprovalDto

- comment

ApprovalDto

- id
- reviewer
  - id
  - name
  - email
- status
- comment
- decided_at
- created_at
- updated_at

### CommentsModule

**Ответственность:**
Коомментарии участников для релиза.

**Сущности:**

- Comment

**Основные endpoints:**

- `GET /api/v1/releases/:releaseId/comments`
- `POST /api/v1/releases/:releaseId/comments`
- `PATCH /api/v1/comments/:commentId`
- `DELETE /api/v1/comments/:commentId`

**DTO:**

CreateCommentDto

- message

UpdateCommentDto

- message?

CommentDto

- id
- createdBy
  - id
  - email
  - name
- message
- created_at
- updated_at

### AuditEventsModule

**Ответственность:**
Отвечает за журнал важных событий, например: изменение статуса релиза.

**Сущности:**

- AuditEvent

**Основные endpoints:**

- `GET /api/v1/organizations/:organizationId/audit-events`
- `GET /api/v1/projects/:projectId/audit-events`
- `GET /api/v1/releases/:releaseId/audit-events`

**DTO:**

AuditEventDto

- id
- entity_type
- entity_id
- action
- actor
  - id
  - name
  - email
- metadata
- created_at

### NotificationsModule

**Ответственность:**
Отвечает за важные уведомления участнику организации, например: вас добавили в организацию.

**Сущности:**

- Notifications

**Основные endpoints:**

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:notificationId/read`
- `PATCH /api/v1/notifications/read-all`

**DTO:**

NotificationDto

- id
- entity_type
- entity_id
- action
- is_read
- read_at
- metadata
- created_at
