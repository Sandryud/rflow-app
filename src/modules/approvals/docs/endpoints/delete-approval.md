# Удаление approval

[← Документация модуля](../docs.md)

## Endpoint

```http
DELETE /api/v1/approvals/:approvalId
Authorization: Bearer <access-token>
```

Удаляет назначение reviewer из релиза.

## Вход

- `approvalId` передается через path-параметр;
- `userId` берется из JWT;
- body отсутствует.

## Выполнение

| Шаг | Слой       | Действие                                                   |
| --- | ---------- | ---------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `approvalId` в service                 |
| 2   | Service    | Проверяет membership и роль `OWNER` / `MANAGER`            |
| 3   | Service    | Проверяет, что release находится в `DRAFT`                 |
| 4   | Service    | Проверяет, что creator не останется единственным reviewer  |
| 5   | Repository | Условно удаляет approval при доступной soft-delete цепочке |

## Бизнес-правила

- удалять approvals могут только `OWNER` и `MANAGER`;
- release должен находиться в `DRAFT`;
- approval creator можно удалить;
- если у creator есть approval, нельзя удалить последнего другого reviewer;
- если у creator нет approval, допускается удалить последнего reviewer;
- если данные изменились между проверкой и delete, возвращается `409 Conflict`.

## Prisma

Операция: условный `Approval.delete` по `approvalId` и доступному release в `DRAFT`.

## Ответ

HTTP `204 No Content`. Response body отсутствует.

## Ошибки

| Статус | Причина                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                                           |
| `403`  | Роль пользователя не позволяет управлять approvals                                      |
| `404`  | Approval недоступен или пользователь не состоит в организации release                   |
| `409`  | Release не в `DRAFT`, creator останется единственным reviewer или delete уже невозможен |
