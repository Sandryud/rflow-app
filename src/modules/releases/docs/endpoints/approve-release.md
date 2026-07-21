# Подтверждение релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/approve
Authorization: Bearer <access-token>
```

Переводит релиз из статуса `IN_REVIEW` в `APPROVED`, если checklist и решения reviewers готовы к подтверждению.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                            |
| --- | ---------- | ----------------------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId` и `userId` в `ReleasesService.requestApprove`                  |
| 2   | Service    | Проверяет membership, роль, статус релиза, обязательные checklist items и approvals |
| 3   | Policy     | Разрешает действие только ролям `OWNER` и `MANAGER`                                 |
| 4   | Repository | Условно меняет статус release с `IN_REVIEW` на `APPROVED`                           |

## Бизнес-правила

- пользователь должен состоять в организации релиза;
- действие разрешено только ролям `OWNER` и `MANAGER`;
- release, project и organization не должны быть удалены;
- release должен находиться в статусе `IN_REVIEW`;
- все обязательные checklist items должны находиться в статусе `DONE`;
- approvals со статусами `PENDING` и `REJECTED` должны отсутствовать;
- должен существовать хотя бы один approval со статусом `APPROVED`;
- условный update защищает переход от конкурентного изменения readiness или статуса release.

## Prisma

Операции: `Release.findFirst` и `Release.update`.

```ts
release.update({
  where: {
    id: releaseId,
    deletedAt: null,
    status: ReleaseStatus.IN_REVIEW,
    project: {
      deletedAt: null,
      organization: { deletedAt: null },
    },
    checkListItems: {
      none: {
        isRequired: true,
        status: { not: ChecklistItemStatus.DONE },
      },
    },
    approvals: {
      some: { status: ApprovalStatus.APPROVED },
      none: {
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.REJECTED],
        },
      },
    },
  },
  data: { status: ReleaseStatus.APPROVED },
  select: updateReleaseSelect,
});
```

Если условия update перестали выполняться из-за конкурентного изменения, Prisma возвращает `P2025`, который преобразуется в `409 Conflict`.

## Ответ

HTTP `201 Created`.

```json
{
  "id": "release-id",
  "version": "1.0.0",
  "name": "Release 1.0.0",
  "status": "APPROVED",
  "projectId": "project-id",
  "environmentId": "environment-id",
  "updatedAt": "2026-07-20T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------ |
| `401`  | Access token отсутствует, поврежден или истек                                                    |
| `403`  | Роль пользователя не позволяет подтвердить release                                               |
| `404`  | Нет membership либо release или его parent chain недоступны                                      |
| `409`  | Release не в `IN_REVIEW`, checklist или approvals не готовы, либо произошёл concurrency conflict |
