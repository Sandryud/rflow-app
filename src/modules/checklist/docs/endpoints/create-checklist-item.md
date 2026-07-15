# Создание checklist item

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/checklist-items
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает новый пункт checklist для релиза.

## Вход

```json
{
  "title": " Verify release notes ",
  "description": " Check release notes before publish ",
  "isRequired": true,
  "assignedToUserId": "user-id"
}
```

| Поле               | Обязательность | Правила                                             |
| ------------------ | -------------- | --------------------------------------------------- |
| `title`            | Да             | Строка, после trim не пустая, максимум 200 символов |
| `description`      | Нет            | Строка, после trim не пустая, максимум 400 символов |
| `isRequired`       | Нет            | Boolean                                             |
| `assignedToUserId` | Нет            | UUID пользователя, который должен выполнять пункт   |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой       | Действие                                                                            |
| --- | ---------- | ----------------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId`, `releaseId` и `dto` в `ChecklistItemService.createChecklistItem` |
| 2   | Service    | Проверяет доступ пользователя к релизу и разрешенные роли                           |
| 3   | Service    | Проверяет, что релиз находится в статусе `DRAFT`                                    |
| 4   | Repository | Создает `ChecklistItem` через `prisma.checklistItem.create`                         |

## Бизнес-правила

- создать checklist item могут пользователи с ролью `OWNER`, `MANAGER` или `DEVELOPER`;
- релиз должен находиться в статусе `DRAFT`;
- если `assignedToUserId` передан, назначенный пользователь должен быть участником той же организации;
- новый пункт создается со статусом `TODO`;
- если title дублируется в рамках релиза, возвращается `409 Conflict`.

## Prisma

Операция: `ChecklistItem.create`.

```ts
create: {
  title: dto.title,
  description: dto.description,
  isRequired: dto.isRequired ?? false,
  status: ChecklistItemStatus.TODO,
  release: { connect: { id: releaseId } },
  createdBy: { connect: { id: userId } },
  ...(dto.assignedToUserId && {
    assignedTo: { connect: { id: dto.assignedToUserId } }
  })
}
```

В ответе используется `checklistCreateSelect`.

## Ответ

HTTP `201 Created`.

```json
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
  "assignedToUserId": "user-id"
}
```

## Ошибки

| Статус | Причина                                                                                            |
| ------ | -------------------------------------------------------------------------------------------------- |
| `404`  | Пользователь не имеет доступа к релизу или назначенный пользователь не является member организации |
| `403`  | У пользователя нет права создавать checklist item                                                  |
| `409`  | Релиз не находится в статусе `DRAFT` или title уже существует в релизе                             |
| `400`  | DTO не прошел валидацию                                                                            |
