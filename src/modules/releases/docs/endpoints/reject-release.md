# Отклонение релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/reject
Authorization: Bearer <access-token>
```

Переводит релиз из статуса `IN_REVIEW` в `REJECTED`, если хотя бы один reviewer отклонил approval.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                   |
| --- | ---------- | -------------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId` и `userId` в `ReleasesService.requestReject`          |
| 2   | Service    | Проверяет membership, роль, статус release и наличие отклоненного approval |
| 3   | Policy     | Разрешает действие только ролям `OWNER` и `MANAGER`                        |
| 4   | Repository | Условно меняет статус release с `IN_REVIEW` на `REJECTED`                  |

## Бизнес-правила

- пользователь должен состоять в организации релиза;
- действие разрешено только ролям `OWNER` и `MANAGER`;
- release, project и organization не должны быть удалены;
- release должен находиться в статусе `IN_REVIEW`;
- должен существовать хотя бы один approval со статусом `REJECTED`;
- условный update защищает переход от конкурентного изменения approvals или статуса release.

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
    approvals: {
      some: { status: ApprovalStatus.REJECTED },
    },
  },
  data: { status: ReleaseStatus.REJECTED },
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
  "status": "REJECTED",
  "projectId": "project-id",
  "environmentId": "environment-id",
  "updatedAt": "2026-07-21T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                                           |
| `403`  | Роль пользователя не позволяет отклонить release                                        |
| `404`  | Нет membership либо release или его parent chain недоступны                             |
| `409`  | Release не в `IN_REVIEW`, нет отклоненного approval либо произошёл concurrency conflict |
