# Отклонение approval

[← Документация модуля](../docs.md)

## Endpoint

```http
PATCH /api/v1/approvals/:approvalId/reject
Authorization: Bearer <access-token>
Content-Type: application/json
```

Ожидает реализацию в текущем коде и не должен описываться как доступный сценарий, если нет рабочей логики в service.

## Вход

```json
{
  "comment": "Need another review"
}
```

| Поле      | Обязательность | Правила                                             |
| --------- | -------------- | --------------------------------------------------- |
| `comment` | Да             | Строка, после trim не пустая, максимум 400 символов |

## Текущее состояние

В текущей реализации endpoint объявлен в controller, но `ApprovalsService.rejectApproval` выбрасывает `NotImplementedException`.

## Ответ

HTTP `501 Not Implemented`.

## Ошибки

| Статус | Причина                                   |
| ------ | ----------------------------------------- |
| `501`  | Метод `rejectApproval` пока не реализован |
