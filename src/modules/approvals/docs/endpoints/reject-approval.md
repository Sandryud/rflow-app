# Отклонение approval

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/approvals/:approvalId/reject
Authorization: Bearer <access-token>
Content-Type: application/json
```

Фиксирует отказ назначенного reviewer с обязательной причиной.

## Вход

```json
{
  "comment": "Need another review"
}
```

| Поле      | Обязательность | Правила                                             |
| --------- | -------------- | --------------------------------------------------- |
| `comment` | Да             | Строка, после trim не пустая, максимум 400 символов |

## Выполнение

| Шаг | Слой       | Действие                                                           |
| --- | ---------- | ------------------------------------------------------------------ |
| 1   | Controller | Передает `userId`, `approvalId` и `dto` в service                  |
| 2   | Service    | Проверяет доступ пользователя и соответствие назначенному reviewer |
| 3   | Service    | Проверяет `IN_REVIEW` у release и `PENDING` у approval             |
| 4   | Repository | Атомарно обновляет approval на `REJECTED`                          |

## Бизнес-правила

- решение принимает только `approval.reviewerUserId`;
- reviewer должен оставаться участником организации release;
- release должен находиться в `IN_REVIEW`;
- исходный status approval должен быть `PENDING`;
- comment обязателен;
- при отказе `decidedAt` устанавливается в текущее время;
- параллельное или уже недоступное обновление возвращает `409 Conflict`.

## Prisma

Операция: условный `Approval.update` по `id`, reviewer, текущему status и доступному release.

Обновляемые поля:

```ts
{
  status: ApprovalStatus.REJECTED,
  comment: dto.comment,
  decidedAt: new Date(),
}
```

## Ответ

HTTP `200 OK`.

```json
{
  "id": "approval-id",
  "releaseId": "release-id",
  "reviewerUserId": "reviewer-user-id",
  "status": "REJECTED",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-16T10:00:00.000Z",
  "decidedAt": "2026-07-16T10:00:00.000Z",
  "comment": "Release requires changes"
}
```

## Ошибки

| Статус | Причина                                                                       |
| ------ | ----------------------------------------------------------------------------- |
| `400`  | Comment отсутствует, пуст после trim или превышает 400 символов               |
| `401`  | Access token отсутствует, поврежден или истек                                 |
| `403`  | Текущий пользователь не является назначенным reviewer                         |
| `404`  | Approval недоступен или пользователь не состоит в организации release         |
| `409`  | Release не в `IN_REVIEW`, approval не в `PENDING` или уже конкурентно изменён |
