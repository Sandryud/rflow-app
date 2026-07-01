# API Audit Events Matrix

Этот документ фиксирует, какие бизнес-действия создают `AuditEvent`.

Принципы:

- `AuditEvent` создаёт только backend.
- Пользователь не может создавать, изменять или удалять `AuditEvent` напрямую.
- `GET` endpoints обычно не создают `AuditEvent`.
- `AuditEvent` нужен для значимых изменений домена, а не для каждого технического запроса.
- Часто фильтруемые поля хранятся в отдельных колонках, а event-specific детали — в `metadata`.

Обозначения:

- `A` = AuditEvent создаётся.
- `D` = AuditEvent не создаётся.

## Actions That Create AuditEvent

### OrganizationsModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Создать организацию | `POST /api/v1/organizations` | A | `organization.created` | `Organization` | `{ id, name }` |
| Изменить организацию | `PATCH /api/v1/organizations/:organizationId` | A | `organization.updated` | `Organization` | `{ id, changed_fields }` |
| Удалить организацию | `DELETE /api/v1/organizations/:organizationId` | A | `organization.deleted` | `Organization` | `{ id, name }` |

---

### MembershipsModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Добавить участника | `POST /api/v1/organizations/:organizationId/memberships` | A | `membership.created` | `Membership` | `{ membership_id, user_name, user_email, role, organization_id, organization_name }` |
| Изменить роль участника | `PATCH /api/v1/memberships/:membershipId` | A | `membership.updated` | `Membership` | `{ membership_id, user_name, user_email, old_role, new_role, organization_id, organization_name }` |
| Удалить участника | `DELETE /api/v1/memberships/:membershipId` | A | `membership.deleted` | `Membership` | `{ membership_id, user_name, user_email, role, organization_id, organization_name }` |

---

### ProjectsModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Создать проект | `POST /api/v1/organizations/:organizationId/projects` | A | `project.created` | `Project` | `{ project_name, project_id, organization_id, organization_name }` |
| Изменить проект | `PATCH /api/v1/projects/:projectId` | A | `project.updated` | `Project` | `{ project_id, project_name, changed_fields, organization_id, organization_name }` |
| Удалить проект | `DELETE /api/v1/projects/:projectId` | A | `project.deleted` | `Project` | `{ project_id, project_name, organization_id, organization_name }` |

---

### EnvironmentsModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Создать environment | `POST /api/v1/projects/:projectId/environments` | A | `environment.created` | `Environment` | `{ environment_name, environment_id, project_id, project_name }` |
| Изменить environment | `PATCH /api/v1/environments/:environmentId` | A | `environment.updated` | `Environment` | `{ environment_name, environment_id, project_id, project_name, changed_fields }` |
| Удалить environment | `DELETE /api/v1/environments/:environmentId` | A | `environment.deleted` | `Environment` | `{ environment_name, environment_id, project_id, project_name }` |

---

### ReleasesModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Создать release | `POST /api/v1/projects/:projectId/releases` | A | `release.created` | `Release` | `{ release_name, release_id, release_version, project_id, project_name }` |
| Изменить release | `PATCH /api/v1/releases/:releaseId` | A | `release.updated` | `Release` | `{ release_name, release_id, release_version, project_id, project_name, changed_fields }` |
| Удалить release | `DELETE /api/v1/releases/:releaseId` | A | `release.deleted` | `Release` | `{ release_name, release_id, release_version, project_id, project_name }` |
| Создать release task | `POST /api/v1/releases/:releaseId/release-tasks` | A | `release_task.created` | `ReleaseTask` | `{ release_name, release_id, release_version, project_id, project_name, release_task_name, release_task_id, release_task_key }` |
| Изменить release task | `PATCH /api/v1/release-tasks/:releaseTaskId` | A | `release_task.updated` | `ReleaseTask` | `{ release_name, release_id, release_version, project_id, project_name, release_task_name, release_task_id, release_task_key, changed_fields }` |
| Удалить release task | `DELETE /api/v1/release-tasks/:releaseTaskId` | A | `release_task.deleted` | `ReleaseTask` | `{ release_name, release_id, release_version, project_id, project_name, release_task_name, release_task_id, release_task_key }` |

---

### ChecklistModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Создать checklist item | `POST /api/v1/releases/:releaseId/checklist-items` | A | `checklist_item.created` | `ChecklistItem` | `{ release_name, release_id, release_version, project_id, project_name, checklist_item_id, checklist_item_title }` |
| Изменить checklist item | `PATCH /api/v1/checklist-items/:checklistItemId` | A | `checklist_item.updated` | `ChecklistItem` | `{ release_name, release_id, release_version, project_id, project_name, checklist_item_id, checklist_item_title, changed_fields }` |
| Изменить статус checklist item | `PATCH /api/v1/checklist-items/:checklistItemId/status` | A | `checklist_item.status_updated` | `ChecklistItem` | `{ release_name, release_id, release_version, project_id, project_name, checklist_item_id, checklist_item_title, old_status, new_status }` |
| Удалить checklist item | `DELETE /api/v1/checklist-items/:checklistItemId` | A | `checklist_item.deleted` | `ChecklistItem` | `{ release_name, release_id, release_version, project_id, project_name, checklist_item_id, checklist_item_title }` |

---

### ApprovalsModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Назначить reviewer | `POST /api/v1/releases/:releaseId/approvals` | A | `approval.created` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name, reviewer_email }` |
| Approve approval | `PATCH /api/v1/approvals/:approvalId/approve` | A | `approval.approved` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name, reviewer_email, old_status, new_status }` |
| Reject approval | `PATCH /api/v1/approvals/:approvalId/reject` | A | `approval.rejected` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name, reviewer_email, old_status, new_status }` |
| Revoke approval | `PATCH /api/v1/approvals/:approvalId/revoke` | A | `approval.revoked` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name, reviewer_email, old_status, new_status }` |
| Удалить approval | `DELETE /api/v1/approvals/:approvalId` | A | `approval.deleted` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name, reviewer_email }` |

---

### CommentsModule

| Business action | Endpoint | Creates AuditEvent | action | entity_type | metadata |
| --------------- | -------- | :----------------: | ------ | ----------- | -------- |
| Создать comment | `POST /api/v1/releases/:releaseId/comments` | A | `comment.created` | `Comment` | `{ comment_id, release_id, release_name, release_version, project_id, project_name }` |
| Изменить comment | `PATCH /api/v1/comments/:commentId` | A | `comment.updated` | `Comment` | `{ comment_id, release_id, release_name, release_version, project_id, project_name, changed_fields }` |
| Удалить comment | `DELETE /api/v1/comments/:commentId` | A | `comment.deleted` | `Comment` | `{ comment_id, release_id, release_name, release_version, project_id, project_name }` |

---

## Actions That Do Not Create AuditEvent

| Module | Business action | Endpoint | Reason |
| ------ | --------------- | -------- | ------ |
| AuthModule | Зарегистрироваться | `POST /api/v1/auth/registration` | |
| AuthModule | Войти в систему | `POST /api/v1/auth/login` | |
| UsersModule | Получить свой профиль | `GET /api/v1/users/me` | |
| UsersModule | Изменить свой профиль | `PATCH /api/v1/users/me` | |
| OrganizationsModule | Получить список своих организаций | `GET /api/v1/organizations` | |
| OrganizationsModule | Получить организацию | `GET /api/v1/organizations/:organizationId` | |
| MembershipsModule | Получить список участников | `GET /api/v1/organizations/:organizationId/memberships` | |
| MembershipsModule | Получить участника | `GET /api/v1/memberships/:membershipId` | |
| ProjectsModule | Получить список проектов | `GET /api/v1/organizations/:organizationId/projects` | |
| ProjectsModule | Получить проект | `GET /api/v1/projects/:projectId` | |
| EnvironmentsModule | Получить список environments | `GET /api/v1/projects/:projectId/environments` | |
| EnvironmentsModule | Получить environment | `GET /api/v1/environments/:environmentId` | |
| ReleasesModule | Получить список releases | `GET /api/v1/projects/:projectId/releases` | |
| ReleasesModule | Получить release | `GET /api/v1/releases/:releaseId` | |
| ReleasesModule | Получить список release tasks | `GET /api/v1/releases/:releaseId/release-tasks` | |
| ChecklistModule | Получить список checklist items | `GET /api/v1/releases/:releaseId/checklist-items` | |
| ApprovalsModule | Получить список approvals | `GET /api/v1/releases/:releaseId/approvals` | |
| CommentsModule | Получить список comments | `GET /api/v1/releases/:releaseId/comments` | |
| AuditModule | Получить audit events организации | `GET /api/v1/organizations/:organizationId/audit-events` | |
| AuditModule | Получить audit events проекта | `GET /api/v1/projects/:projectId/audit-events` | |
| AuditModule | Получить audit events релиза | `GET /api/v1/releases/:releaseId/audit-events` | |
| NotificationsModule | Получить свои notifications | `GET /api/v1/notifications` | |
| NotificationsModule | Отметить notification прочитанным | `PATCH /api/v1/notifications/:notificationId/read` | |
| NotificationsModule | Отметить все notifications прочитанными | `PATCH /api/v1/notifications/read-all` | |
