# Одобрение approval

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/approvals/:approvalId/approve
Authorization: Bearer <access-token>
```

Утверждает approval текущим reviewer.

## Вход

- `approvalId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body отсутствует.

## Выполнение

| Шаг | Слой       | Действие                                                              |
| --- | ---------- | --------------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `approvalId` в `ApprovalsService.approveApproval` |
| 2   | Service    | Проверяет существование approval и доступ reviewer                    |
| 3   | Service    | Проверяет, что релиз находится в статусе `IN_REVIEW`                  |
| 4   | Service    | Проверяет, что approval в статусе `PENDING`                           |
| 5   | Repository | Обновляет approval на `APPROVED`                                      |

## Бизнес-правила

- approve может выполнить только reviewer, которому принадлежит approval;
- релиз должен находиться в статусе `IN_REVIEW`;
- approval должен быть в статусе `PENDING`;
- после approve автоматически сохраняются `decidedAt`, `comment: null` и статус `APPROVED`;
- если approval уже нельзя обновить, возвращается `409 Conflict`.

## Prisma

Операция: `Approval.update`.

```ts
where: {
  id: approvalId,
  reviewerUserId: userId,
  status: currentStatus,
  release: {
    status: { in: [ReleaseStatus.IN_REVIEW] },
    deletedAt: null,
    project: { deletedAt: null, organization: { deletedAt: null } }
  }
}
```

## Ответ

HTTP `200 OK`.

```json
{
  "id": "approval-id",
  "releaseId": "release-id",
  "reviewerUserId": "reviewer-user-id",
  "status": "APPROVED",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "updatedAt": "2026-07-15T10:00:00.000Z",
  "decidedAt": "2026-07-15T10:00:00.000Z",
  "comment": null
}
```

## Ошибки

| Статус | Причина                                                                             |
| ------ | ----------------------------------------------------------------------------------- |
| `404`  | Approval не найден или пользователь не имеет доступа к релизу                       |
| `403`  | Пользователь не является reviewer approval                                          |
| `409`  | Релиз не находится в `IN_REVIEW`, approval уже не `PENDING` или уже нельзя обновить |
| `401`  | Access token отсутствует, поврежден или истек                                       |
