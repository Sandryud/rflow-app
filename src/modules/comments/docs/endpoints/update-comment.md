# Изменение комментария

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/comments/:commentId
```

Изменяет текст собственного комментария.

## Вход

- `userId` берется из JWT;
- `commentId` передается через path и проверяется `ParseUUIDPipe`;
- body проверяется через `UpdateCommentDto`.

```json
{
  "message": "Updated release verification note"
}
```

`message` обязателен, обрезается через trim, не может быть пустым и ограничен 2000 символами.

## Выполнение

| Шаг | Слой       | Действие                                                      |
| --- | ---------- | ------------------------------------------------------------- |
| 1   | Controller | Передает `userId`, `commentId` и DTO в service                |
| 2   | Service    | Проверяет доступность, membership, ownership и статус release |
| 3   | Repository | Условно обновляет message и возвращает безопасный response    |

## Бизнес-правила

- пользователь может изменить только собственный comment;
- `OWNER` и `MANAGER` не могут редактировать чужой текст;
- изменение запрещено при статусе release `RELEASED`;
- comment и вся родительская soft-delete цепочка должны быть доступны;
- конкурентный `P2025` преобразуется в `409 Conflict`.

## Prisma

Операция: условный `Comment.update`.

```ts
comment.update({
  where: {
    id: commentId,
    authorUserId: userId,
    deletedAt: null,
    release: {
      status: { not: ReleaseStatus.RELEASED },
      deletedAt: null,
      project: { deletedAt: null, organization: { deletedAt: null } },
    },
  },
  data: { message },
  select: commentSelect,
});
```

## Ответ

HTTP `200 OK`.

```json
{
  "id": "comment-id",
  "releaseId": "release-id",
  "authorUserId": "user-id",
  "message": "Updated release verification note",
  "createdAt": "2026-07-18T10:00:00.000Z",
  "updatedAt": "2026-07-18T11:00:00.000Z",
  "author": {
    "id": "user-id",
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

## Ошибки

| Статус | Причина                                                   |
| ------ | --------------------------------------------------------- |
| `400`  | UUID или DTO не прошли validation                         |
| `401`  | Access token отсутствует, поврежден или истек             |
| `403`  | Текущий пользователь не является автором                  |
| `404`  | Нет membership либо comment/parent resource недоступен    |
| `409`  | Release имеет статус `RELEASED` или update уже невозможен |
