# API Notifications Matrix

Этот документ фиксирует, какие бизнес-действия создают `Notification`.

Принципы:

- `Notification` создаёт только backend.
- Пользователь не может создавать notifications напрямую.
- `Notification` создаётся для пользователей, которым нужно узнать о важном доменном событии или изменении их роли/ответственности.
- Read-only endpoints не создают notifications.
- Для MVP используется простая модель получателей, чтобы не усложнять настройки уведомлений.

## Recipients Rules

- Membership notifications отправляются затронутому пользователю.
- Approval assignment отправляется назначенному reviewer.
- Approval decisions отправляются всем участникам release.
- Checklist assignment отправляется назначенному пользователю.
- Checklist status changes отправляются всем участникам release.
- New comment отправляется всем участникам release, кроме автора comment.
- Release changes отправляются участникам project.
- Release task changes отправляются участникам project.

## Actions That Create Notification

| Module | Business action | Endpoint | Recipients | action | entity_type | metadata |
| ------ | --------------- | -------- | ---------- | ------ | ----------- | -------- |
| MembershipsModule | Добавить участника | `POST /api/v1/organizations/:organizationId/memberships` | Added user | `membership.created` | `Membership` | `{ membership_id, organization_id, organization_name, role }` |
| MembershipsModule | Изменить роль участника | `PATCH /api/v1/memberships/:membershipId` | Affected user | `membership.updated` | `Membership` | `{ membership_id, organization_id, organization_name, old_role, new_role }` |
| MembershipsModule | Удалить участника | `DELETE /api/v1/memberships/:membershipId` | Removed user | `membership.deleted` | `Membership` | `{ membership_id, organization_id, organization_name, role }` |
| ApprovalsModule | Назначить reviewer | `POST /api/v1/releases/:releaseId/approvals` | Reviewer | `approval.created` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name }` |
| ApprovalsModule | Approve approval | `PATCH /api/v1/approvals/:approvalId/approve` | Release participants | `approval.approved` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name }` |
| ApprovalsModule | Reject approval | `PATCH /api/v1/approvals/:approvalId/reject` | Release participants | `approval.rejected` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name }` |
| ApprovalsModule | Revoke approval | `PATCH /api/v1/approvals/:approvalId/revoke` | Release participants | `approval.revoked` | `Approval` | `{ approval_id, release_id, release_name, release_version, project_id, project_name, reviewer_user_id, reviewer_name }` |
| ChecklistModule | Назначить checklist item | `POST /api/v1/releases/:releaseId/checklist-items` | Assigned user | `checklist_item.assigned` | `ChecklistItem` | `{ checklist_item_id, checklist_item_title, release_id, release_name, release_version, project_id, project_name }` |
| ChecklistModule | Изменить статус checklist item | `PATCH /api/v1/checklist-items/:checklistItemId/status` | Release participants | `checklist_item.status_updated` | `ChecklistItem` | `{ checklist_item_id, checklist_item_title, old_status, new_status, release_id, release_name, release_version, project_id, project_name }` |
| CommentsModule | Создать comment | `POST /api/v1/releases/:releaseId/comments` | Release participants except author | `comment.created` | `Comment` | `{ comment_id, release_id, release_name, release_version, project_id, project_name }` |
| ReleasesModule | Создать release | `POST /api/v1/projects/:projectId/releases` | Project members | `release.created` | `Release` | `{ release_id, release_name, release_version, project_id, project_name }` |
| ReleasesModule | Изменить release | `PATCH /api/v1/releases/:releaseId` | Project members | `release.updated` | `Release` | `{ release_id, release_name, release_version, project_id, project_name, changed_fields }` |
| ReleasesModule | Удалить release | `DELETE /api/v1/releases/:releaseId` | Project members | `release.deleted` | `Release` | `{ release_id, release_name, release_version, project_id, project_name }` |
| ReleasesModule | Создать release task | `POST /api/v1/releases/:releaseId/release-tasks` | Project members | `release_task.created` | `ReleaseTask` | `{ release_task_id, release_task_name, release_task_key, release_id, release_name, release_version, project_id, project_name }` |
| ReleasesModule | Изменить release task | `PATCH /api/v1/release-tasks/:releaseTaskId` | Project members | `release_task.updated` | `ReleaseTask` | `{ release_task_id, release_task_name, release_task_key, release_id, release_name, release_version, project_id, project_name, changed_fields }` |
| ReleasesModule | Удалить release task | `DELETE /api/v1/release-tasks/:releaseTaskId` | Project members | `release_task.deleted` | `ReleaseTask` | `{ release_task_id, release_task_name, release_task_key, release_id, release_name, release_version, project_id, project_name }` |

## Actions That Do Not Create Notification

| Module | Business action | Reason |
| ------ | --------------- | ------ |
| AuthModule | Registration / login | Auth actions do not create notifications in MVP. |
| UsersModule | Profile read/update | Profile actions do not create notifications in MVP. |
| OrganizationsModule | Organization create/update/delete | Organization lifecycle actions do not create notifications in MVP. |
| AnyModule | Read-only endpoints | Read-only endpoints do not create notifications. |
