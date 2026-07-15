# Создание release task

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/release-tasks
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает новую задачу внутри релиза. Для этого релиз должен находиться в статусе `DRAFT`.

## Вход

```json
{
  "name": " Deploy service ",
  "key": "DEPLOY-01",
  "description": " Deploy service to staging ",
  "url": "https://example.com",
  "type": "deploy"
}
```

| Поле          | Обязательность | Правила                                             |
| ------------- | -------------- | --------------------------------------------------- |
| `name`        | Да             | Строка, после trim не пустая, максимум 200 символов |
| `key`         | Да             | Строка, после trim не пустая, максимум 50 символов  |
| `description` | Нет            | Строка, после trim не пустая, максимум 400 символов |
| `url`         | Нет            | Валидный URL, максимум 400 символов                 |
| `type`        | Нет            | Строка, после trim не пустая, максимум 50 символов  |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой       | Действие                                                                     |
| --- | ---------- | ---------------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId`, `userId` и `dto` в `ReleasesService.createReleaseTask` |
| 2   | Service    | Проверяет membership пользователя и статус релиза                            |
| 3   | Policy     | Проверяет права на создание release task                                     |
| 4   | Repository | Создает `ReleaseTask` через `prisma.releaseTask.create`                      |

## Бизнес-правила

- доступ к release task определяется через membership в организации релиза;
- разрешены роли `OWNER`, `MANAGER` и `DEVELOPER`;
- релиз должен быть в статусе `DRAFT`;
- ключ задачи должен быть уникален в пределах release;
- при нарушении уникальности возвращается `409 Conflict`.

## Prisma

Операция: `ReleaseTask.create`.

```ts
releaseTask.create({
  data: {
    name: dto.name,
    key: dto.key,
    description: dto.description,
    url: dto.url,
    type: dto.type,
    releaseId,
  },
  select: releaseTaskSelect,
});
```

## Ответ

HTTP `201 Created`.

```json
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
```

## Ошибки

| Статус | Причина                                                             |
| ------ | ------------------------------------------------------------------- |
| `404`  | Пользователь не имеет доступа к релизу или релиз не найден          |
| `403`  | У пользователя нет права создавать task для релиза                  |
| `409`  | Релиз не находится в статусе `DRAFT` или ключ задачи уже существует |
| `400`  | DTO не прошел валидацию                                             |
