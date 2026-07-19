# Отправка релиза на review

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/request-review
Authorization: Bearer <access-token>
```

Переводит релиз из статуса `DRAFT` в `IN_REVIEW`, если релиз готов к началу согласования.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                      |
| --- | ---------- | ----------------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId` и `userId` в `ReleasesService.requestReview`             |
| 2   | Service    | Проверяет membership, роль пользователя, статус релиза и готовность approvals |
| 3   | Policy     | Разрешает действие только ролям `OWNER` и `MANAGER`                           |
| 4   | Repository | Проверяет доступность release context и условно меняет `DRAFT` на `IN_REVIEW` |

## Бизнес-правила

- пользователь должен состоять в организации релиза;
- действие разрешено только ролям `OWNER` и `MANAGER`;
- release, project и organization не должны быть удалены;
- environment должен существовать, быть активным, неудаленным и принадлежать project релиза;
- текущий статус release должен быть `DRAFT`;
- у release должен быть хотя бы один approval;
- хотя бы один reviewer должен отличаться от создателя release;
- все approvals должны находиться в статусе `PENDING`;
- условный update защищает переход от конкурентного изменения статуса;

## Prisma

Операции: `Release.findFirst` и `Release.update`.

Контекст готовности:

```ts
release.findFirst({
  where: {
    id: releaseId,
    deletedAt: null,
    project: {
      deletedAt: null,
      organization: { deletedAt: null },
    },
    environment: {
      isActive: true,
      deletedAt: null,
      project: {
        releases: { some: { id: releaseId } },
      },
    },
  },
  select: {
    id: true,
    status: true,
    createdByUserId: true,
    projectId: true,
    environmentId: true,
    approvals: {
      select: {
        reviewerUserId: true,
        status: true,
      },
    },
  },
});
```

Условный переход:

```ts
release.update({
  where: {
    id: releaseId,
    status: ReleaseStatus.DRAFT,
    deletedAt: null,
    project: {
      deletedAt: null,
      organization: { deletedAt: null },
    },
  },
  data: { status: ReleaseStatus.IN_REVIEW },
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
  "status": "IN_REVIEW",
  "projectId": "project-id",
  "environmentId": "environment-id",
  "updatedAt": "2026-07-19T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                                                  |
| `403`  | Роль пользователя не позволяет отправить release на review                                     |
| `404`  | Нет membership либо release, parent chain или допустимый environment недоступны                |
| `409`  | Release не в `DRAFT`, approvals не готовы или условный update проиграл конкурентному изменению |
