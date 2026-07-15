# Получение checklist релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/releases/:releaseId/checklist-items
Authorization: Bearer <access-token>
```

Возвращает список checklist-пунктов для конкретного релиза.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                        |
| --- | ---------- | ------------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `releaseId` в `ChecklistItemService.getChecklistItems`      |
| 2   | Service    | Проверяет, что пользователь имеет доступ к релизу через organization membership |
| 3   | Repository | Выполняет `checklistItem.findMany({ where: { releaseId } })`                    |

## Бизнес-правила

- доступ к checklist определяется через membership пользователя в организации релиза;
- если пользователь не имеет доступа к релизу, возвращается `404 Not Found`;
- список возвращается без дополнительной фильтрации по статусу.

## Prisma

Операция: `ChecklistItem.findMany`.

```ts
where: {
  releaseId;
}
```

Для ответа используется `checklistGetItemsSelect`.

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "checklist-item-id",
    "title": "Verify release notes",
    "status": "TODO",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "createdByUserId": "user-id",
    "releaseId": "release-id",
    "description": "Check release notes before publish",
    "comment": null,
    "isRequired": true,
    "assignedToUserId": "user-id",
    "completedByUserId": null,
    "completedAt": null
  }
]
```

## Ошибки

| Статус | Причина                                       |
| ------ | --------------------------------------------- |
| `404`  | Пользователь не имеет доступа к релизу        |
| `401`  | Access token отсутствует, поврежден или истек |
