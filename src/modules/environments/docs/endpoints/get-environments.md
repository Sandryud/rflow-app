# Получение окружений проекта

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/projects/:projectId/environments
Authorization: Bearer <access-token>
```

Возвращает список неудаленных окружений для проекта, к которому текущий пользователь имеет доступ через организацию.

## Вход

- `projectId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                |
| --- | ---------- | ----------------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `projectId` в `EnvironmentsService.getEnvironments` |
| 2   | Service    | Проверяет, что проект доступен текущему пользователю                    |
| 3   | Repository | Выполняет `project.findFirst` и затем `environment.findMany`            |

## Бизнес-правила

- доступ к окружениям определяется через membership пользователя в организации проекта;
- возвращаются только `deletedAt: null` окружения;
- если проект не найден или недоступен пользователю, возвращается `404 Not Found`;
- порядок элементов не гарантирован, если `orderBy` не задан.

## Prisma

Операция: `Project.findFirst` и `Environment.findMany`.

```ts
project.findFirst({
  where: {
    id: projectId,
    deletedAt: null,
    organization: {
      deletedAt: null,
      memberships: { some: { userId } },
    },
  },
});
```

```ts
environment.findMany({
  where: {
    projectId,
    deletedAt: null,
  },
  select: environmentSelect,
});
```

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "environment-id",
    "name": "staging",
    "projectId": "project-id",
    "description": "Staging environment",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "isActive": true,
    "isDefault": false
  }
]
```

## Ошибки

| Статус | Причина                                               |
| ------ | ----------------------------------------------------- |
| `404`  | Проект не найден или недоступен текущему пользователю |
| `401`  | Access token отсутствует, поврежден или истек         |
