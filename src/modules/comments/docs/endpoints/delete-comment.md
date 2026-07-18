# Удаление комментария

[← Документация модуля](../docs.md)

## Endpoint

```http
DELETE /api/v1/comments/:commentId
```

Мягко удаляет комментарий автора или модерируемый комментарий.

## Вход

- `userId` берется из JWT;
- `commentId` передается через path и проверяется `ParseUUIDPipe`;
- body и query отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                      |
| --- | ---------- | ------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `commentId` в service                     |
| 2   | Service    | Проверяет доступность, membership, статус, ownership или роль |
| 3   | Policy     | Определяет право `OWNER` / `MANAGER` на модерацию             |
| 4   | Repository | Условно устанавливает `deletedAt`                             |

## Бизнес-правила

- автор может удалить собственный comment;
- `OWNER` и `MANAGER` могут удалить чужой comment;
- `DEVELOPER`, `QA` и `VIEWER` не могут удалить чужой comment;
- удаление запрещено при статусе release `RELEASED`;
- используется soft delete, физическая запись сохраняется;
- повторное последовательное удаление возвращает `404`;
- конкурентный `P2025` преобразуется в `409 Conflict`.

## Prisma

Операция: условный `Comment.update`.

```ts
comment.update({
  where: {
    id: commentId,
    authorUserId,
    deletedAt: null,
    release: {
      status: { not: ReleaseStatus.RELEASED },
      deletedAt: null,
      project: { deletedAt: null, organization: { deletedAt: null } },
    },
  },
  data: { deletedAt: new Date() },
  select: commentSelect,
});
```

Для модерации чужого comment `authorUserId` не передается после проверки policy.

## Ответ

HTTP `204 No Content`.

```json
{}
```

Response body отсутствует.

## Ошибки

| Статус | Причина                                                       |
| ------ | ------------------------------------------------------------- |
| `400`  | `commentId` не является UUID                                  |
| `401`  | Access token отсутствует, поврежден или истек                 |
| `403`  | Пользователь не автор и не имеет роль модератора              |
| `404`  | Нет membership, comment удален или parent resource недоступен |
| `409`  | Release имеет статус `RELEASED` или soft delete невозможен    |
