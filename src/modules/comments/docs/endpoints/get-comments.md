# Получение комментариев релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/releases/:releaseId/comments
```

Возвращает активные комментарии релиза в хронологическом порядке.

## Вход

- `userId` берется из JWT;
- `releaseId` передается через path и проверяется `ParseUUIDPipe`;
- body и query отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                 |
| --- | ---------- | -------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `releaseId` в service                |
| 2   | Service    | Проверяет membership и доступность release               |
| 3   | Repository | Возвращает активные comments с публичными данными автора |

## Бизнес-правила

- чтение доступно любому участнику организации;
- release, project и organization должны быть доступны;
- soft-deleted comments не возвращаются;
- сортировка выполняется по `createdAt ASC`;
- автор содержит только `id`, `name` и `email`.

## Prisma

Операция: `Comment.findMany`.

```ts
comment.findMany({
  where: {
    releaseId,
    deletedAt: null,
    release: {
      deletedAt: null,
      project: { deletedAt: null, organization: { deletedAt: null } },
    },
  },
  orderBy: { createdAt: 'asc' },
  select: commentSelect,
});
```

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "comment-id",
    "releaseId": "release-id",
    "authorUserId": "user-id",
    "message": "Release is ready for final verification",
    "createdAt": "2026-07-18T10:00:00.000Z",
    "updatedAt": "2026-07-18T10:00:00.000Z",
    "author": {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }
]
```

Если активных comments нет, возвращается пустой массив.

## Ошибки

| Статус | Причина                                                |
| ------ | ------------------------------------------------------ |
| `400`  | `releaseId` не является UUID                           |
| `401`  | Access token отсутствует, поврежден или истек          |
| `404`  | Нет membership либо release/parent resource недоступен |
