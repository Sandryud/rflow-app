# Получение релизов проекта

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/projects/:projectId/releases
Authorization: Bearer <access-token>
```

Возвращает список релизов проекта, если текущий пользователь связан с этой организацией через membership.

## Вход

- `projectId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                               |
| --- | ---------- | ---------------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `projectId` в `ReleasesService.getProjectReleases` |
| 2   | Service    | Проверяет membership пользователя в организации проекта                |
| 3   | Repository | Выполняет `release.findMany` по `projectId`                            |

## Бизнес-правила

- пользователь должен быть member организации, в которой находится проект;
- в ответ попадают только неудаленные релизы;
- если пользователь не имеет access к проекту, возвращается `404 Not Found`.

## Prisma

Операция: `Release.findMany`.

```ts
where: {
  project: { id: projectId, deletedAt: null },
  deletedAt: null
}
```

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "release-id",
    "name": "Release 1.0.0",
    "description": "Release description",
    "version": "1.0.0",
    "status": "DRAFT",
    "projectId": "project-id",
    "environmentId": "environment-id",
    "createdByUserId": "user-id",
    "plannedReleaseAt": "2026-07-15T10:00:00.000Z",
    "createdAt": "2026-07-15T10:00:00.000Z"
  }
]
```

## Ошибки

| Статус | Причина                                                      |
| ------ | ------------------------------------------------------------ |
| `404`  | Пользователь не имеет доступа к проекту или проект не найден |
| `401`  | Access token отсутствует, поврежден или истек                |
