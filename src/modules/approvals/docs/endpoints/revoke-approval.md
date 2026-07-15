# Отзыв approval

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/approvals/:approvalId/revoke
Authorization: Bearer <access-token>
```

Ожидает реализацию в текущем коде и не должен описываться как доступный сценарий, если нет рабочей бизнес-логики.

## Текущее состояние

В текущей реализации endpoint объявлен в controller, но `ApprovalsService.revokeApproval` выбрасывает `NotImplementedException`.

## Ответ

HTTP `501 Not Implemented`.

## Ошибки

| Статус | Причина                                   |
| ------ | ----------------------------------------- |
| `501`  | Метод `revokeApproval` пока не реализован |
