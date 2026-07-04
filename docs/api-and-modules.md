## Modules

### AuthModule

**Ответственность:**
Модуль отвечает за аутенификацию и регистрацию пользователя.

**Сущности:**

- User

**Основные endpoints:**

- `/api/v1/auth/login`
- `/api/v1/auth/register`

**DTO:**

RegisterDto

- name
- email
- password

LoginDto

- email
- password

### UsersModule

**Ответственность:**
Модуль отвечает за текущего пользователя и его профиль.

**Сущности:**

- User

**Основные endpoints:**

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

**DTO:**

UserDto

- id
- name
- email
- created_at
- updated_at

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
- `POST /api/v1/releases/:releaseId/request-review`
- `POST /api/v1/releases/:releaseId/approve`
- `POST /api/v1/releases/:releaseId/reject`
- `POST /api/v1/releases/:releaseId/release`
- `POST /api/v1/releases/:releaseId/cancel`
- `POST /api/v1/releases/:releaseId/release-tasks`
- `GET /api/v1/releases/:releaseId/release-tasks`
- `PATCH /api/v1/release-tasks/:releaseTaskId`
- `DELETE /api/v1/release-tasks/:releaseTaskId`

**Важно:**
`PATCH /api/v1/releases/:releaseId` не изменяет `status`. Статус релиза меняется только через отдельные бизнес-команды: `request-review`, `approve`, `reject`, `release`, `cancel`.

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
- type
- url?
- name
- description

UpdateReleaseTaskDto

- key?
- type?
- url?
- name?
- description?

ReleaseTaskDto

- id
- key
- type
- url
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
