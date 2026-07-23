# Выпуск релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/release
Authorization: Bearer <access-token>
```

Завершает жизненный цикл релиза, переводя его из статуса `APPROVED` в `RELEASED`.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                             |
| --- | ---------- | -------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId` и `userId` в `ReleasesService.requestRelease`   |
| 2   | Service    | Проверяет membership, роль, статус release и доступность environment |
| 3   | Policy     | Разрешает действие только ролям `OWNER` и `MANAGER`                  |
| 4   | Repository | Условно меняет статус release с `APPROVED` на `RELEASED`             |

## Бизнес-правила

- пользователь должен состоять в организации релиза;
- действие разрешено только ролям `OWNER` и `MANAGER`;
- release, project и organization не должны быть удалены;
- release должен находиться в статусе `APPROVED`;
- environment должен быть активным, неудалённым и принадлежать project релиза;
- условный update защищает переход от конкурентного изменения статуса или environment.

## Prisma

Операции: `Release.findFirst`, `Environment.findFirst` и `Release.update`.

```ts
release.update({
  where: {
    id: releaseId,
    deletedAt: null,
    status: ReleaseStatus.APPROVED,
    project: {
      deletedAt: null,
      organization: { deletedAt: null },
    },
    environment: {
      deletedAt: null,
      isActive: true,
      project: {
        releases: { some: { id: releaseId } },
      },
    },
  },
  data: { status: ReleaseStatus.RELEASED },
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
  "status": "RELEASED",
  "projectId": "project-id",
  "environmentId": "environment-id",
  "updatedAt": "2026-07-23T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                                    |
| `403`  | Роль пользователя не позволяет выпустить release                                 |
| `404`  | Нет membership либо release, parent chain или активный environment недоступны    |
| `409`  | Release не в `APPROVED` либо conditional update проиграл конкурентному изменению |
