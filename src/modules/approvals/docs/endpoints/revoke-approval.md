# Отзыв approval

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/approvals/:approvalId/revoke
Authorization: Bearer <access-token>
```

Отзывает ранее принятое решение reviewer и возвращает approval в `PENDING`.

## Вход

- `approvalId` передается через path-параметр;
- `userId` берется из JWT;
- body отсутствует.

## Выполнение

| Шаг | Слой       | Действие                                                  |
| --- | ---------- | --------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `approvalId` в service                |
| 2   | Service    | Проверяет membership и соответствие назначенному reviewer |
| 3   | Service    | Проверяет, что release находится в `IN_REVIEW`            |
| 4   | Service    | Запрещает revoke из `PENDING`                             |
| 5   | Repository | Атомарно возвращает approval в `PENDING`                  |

## Бизнес-правила

- revoke выполняет только назначенный reviewer;
- разрешены переходы `APPROVED → PENDING` и `REJECTED → PENDING`;
- `PENDING → PENDING` запрещён и возвращает `409 Conflict`;
- release должен находиться в `IN_REVIEW`;
- при revoke `comment` и `decidedAt` очищаются.

## Prisma

```ts
{
  status: ApprovalStatus.PENDING,
  comment: null,
  decidedAt: null,
}
```

## Ответ

HTTP `200 OK`.

```json
{
  "id": "approval-id",
  "releaseId": "release-id",
  "reviewerUserId": "reviewer-user-id",
  "status": "PENDING",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-16T11:00:00.000Z",
  "decidedAt": null,
  "comment": null
}
```

## Ошибки

| Статус | Причина                                                                  |
| ------ | ------------------------------------------------------------------------ |
| `401`  | Access token отсутствует, поврежден или истек                            |
| `403`  | Текущий пользователь не является назначенным reviewer                    |
| `404`  | Approval недоступен или пользователь не состоит в организации release    |
| `409`  | Release не в `IN_REVIEW`, approval уже `PENDING` или конкурентно изменён |
