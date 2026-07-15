# Обновление статуса checklist item

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/checklist-items/:checklistItemId/status
Authorization: Bearer <access-token>
Content-Type: application/json
```

Обновляет статус checklist-пункта.

## Вход

```json
{
  "status": "DONE",
  "comment": "Checked and approved"
}
```

| Поле      | Обязательность | Правила                                             |
| --------- | -------------- | --------------------------------------------------- |
| `status`  | Да             | Значение enum `ChecklistItemStatus`                 |
| `comment` | Нет            | Строка, после trim не пустая, максимум 500 символов |

Для перехода в `BLOCKED` комментарий обязателен.

## Выполнение

| Шаг | Слой       | Действие                                                                                    |
| --- | ---------- | ------------------------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId`, `checklistItemId` и `dto` в `ChecklistItemService.updateChecklistStatus` |
| 2   | Service    | Проверяет существование checklist item и доступ пользователя                                |
| 3   | Service    | Проверяет допустимость перехода статуса и статус релиза                                     |
| 4   | Repository | Обновляет `ChecklistItem` через `prisma.checklistItem.update`                               |

## Бизнес-правила

- допустимые переходы:
  - `TODO -> DONE`
  - `TODO -> BLOCKED`
  - `BLOCKED -> TODO`
  - `BLOCKED -> DONE`
- переход `DONE -> ...` запрещен;
- если item назначен другому пользователю, менять статус может только тот же пользователь;
- если item не назначен, менять статус могут роли `OWNER`, `MANAGER`, `DEVELOPER`, `QA`;
- статус релиза должен быть `DRAFT` или `IN_REVIEW`;
- при попытке перевести item в `BLOCKED` без комментария возвращается `400 Bad Request`;
- если item уже нельзя обновить из-за конкурентного состояния, возвращается `409 Conflict`.

## Prisma

Операция: `ChecklistItem.update`.

```ts
where: {
  id: checklistItemId,
  status: currentStatus,
  release: {
    status: { in: [ReleaseStatus.DRAFT, ReleaseStatus.IN_REVIEW] },
    deletedAt: null,
    project: {
      deletedAt: null,
      organization: { deletedAt: null }
    }
  }
}
```

Смена статуса обновляет поля `status`, `comment`, `completedBy`, `completedAt`.

## Ответ

HTTP `200 OK`.

```json
{
  "id": "checklist-item-id",
  "status": "DONE",
  "comment": null,
  "completedByUserId": "user-id",
  "completedAt": "2026-07-15T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| `404`  | Checklist item не найден или пользователь не имеет доступа к релизу                                        |
| `403`  | Item назначен другому пользователю или у пользователя нет прав обновлять статус                            |
| `409`  | Недопустимый переход статуса, релиз не в `DRAFT`/`IN_REVIEW`, или item нельзя обновить в текущем состоянии |
| `400`  | `BLOCKED` без комментария или DTO не прошел валидацию                                                      |
