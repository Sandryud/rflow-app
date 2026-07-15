# Получение задач релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/releases/:releaseId/release-tasks
Authorization: Bearer <access-token>
```

Возвращает список задач, связанных с релизом, если текущий пользователь имеет доступ к этому релизу через organization membership.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                            |
| --- | ---------- | ------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId` и `userId` в `ReleasesService.getReleaseTasks` |
| 2   | Service    | Проверяет membership пользователя в организации релиза              |
| 3   | Repository | Выполняет `releaseTask.findMany({ where: { releaseId } })`          |

## Бизнес-правила

- список задач доступен только пользователям, имеющим доступ к релизу;
- если membership не найден, возвращается `404 Not Found`;
- задача не фильтруется по статусу и возвращается весь список, не удаленный на уровне модели.

## Prisma

Операция: `ReleaseTask.findMany`.

```ts
where: {
  releaseId;
}
```

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "release-task-id",
    "releaseId": "release-id",
    "key": "DEPLOY-01",
    "name": "Deploy service",
    "description": "Deploy service to staging",
    "url": "https://example.com",
    "type": "deploy",
    "createdAt": "2026-07-15T10:00:00.000Z"
  }
]
```

## Ошибки

| Статус | Причина                                                    |
| ------ | ---------------------------------------------------------- |
| `404`  | Пользователь не имеет доступа к релизу или релиз не найден |
| `401`  | Access token отсутствует, поврежден или истек              |
