# Создание комментария

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/comments
```

Создает комментарий участника организации в рамках релиза.

## Вход

- `userId` берется из JWT;
- `releaseId` передается через path и проверяется `ParseUUIDPipe`;
- body проверяется через `CreateCommentDto`.

```json
{
  "message": "Release is ready for final verification"
}
```

`message` обязателен, обрезается через trim, не может быть пустым и ограничен 2000 символами.

## Выполнение

| Шаг | Слой       | Действие                                       |
| --- | ---------- | ---------------------------------------------- |
| 1   | Controller | Передает `userId`, `releaseId` и DTO в service |
| 2   | Service    | Проверяет membership и доступность release     |
| 3   | Repository | Создает comment со связями на release и автора |

## Бизнес-правила

- comment может создать любой участник организации, включая `VIEWER`;
- release, project и organization должны быть доступны и не удалены;
- автором всегда является текущий пользователь из JWT;
- создание разрешено при любом статусе release, включая `RELEASED`;
- soft-deleted release комментировать нельзя.

## Prisma

Операция: `Comment.create`.

```ts
comment.create({
  data: {
    message: dto.message,
    author: { connect: { id: userId } },
    release: { connect: { id: releaseId } },
  },
  select: commentSelect,
});
```

## Ответ

HTTP `201 Created`.

```json
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
```

## Ошибки

| Статус | Причина                                                |
| ------ | ------------------------------------------------------ |
| `400`  | UUID или DTO не прошли validation                      |
| `401`  | Access token отсутствует, поврежден или истек          |
| `404`  | Нет membership либо release/parent resource недоступен |
