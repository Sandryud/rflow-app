# Получение approvals релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/releases/:releaseId/approvals
Authorization: Bearer <access-token>
```

Возвращает список approval-запросов для релиза.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                  |
| --- | ---------- | ------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `releaseId` в `ApprovalsService.getApprovals`         |
| 2   | Service    | Проверяет доступ пользователя к релизу                                    |
| 3   | Repository | Выполняет `approval.findMany` по `releaseId` с сортировкой по `createdAt` |

## Бизнес-правила

- список доступен только тем, у кого есть organization membership по релизу;
- при отсутствии доступа возвращается `404 Not Found`;
- порядок результатов гарантирован: `createdAt asc`.

## Prisma

Операция: `Approval.findMany`.

```ts
where: {
  releaseId,
  release: {
    deletedAt: null,
    project: { deletedAt: null, organization: { deletedAt: null } }
  }
}

orderBy: { createdAt: 'asc' }
```

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "approval-id",
    "releaseId": "release-id",
    "reviewerUserId": "reviewer-user-id",
    "status": "PENDING",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "updatedAt": "2026-07-15T10:00:00.000Z",
    "decidedAt": null,
    "comment": null
  }
]
```

## Ошибки

| Статус | Причина                                       |
| ------ | --------------------------------------------- |
| `404`  | Пользователь не имеет доступа к релизу        |
| `401`  | Access token отсутствует, поврежден или истек |
