# Создание организации

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/organizations
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает организацию и membership владельца для текущего пользователя.

## Вход

```json
{
  "name": " RFlow ",
  "description": " Release management "
}
```

| Поле          | Обязательность | Правила                                             |
| ------------- | -------------- | --------------------------------------------------- |
| `name`        | Да             | Строка, после trim не пустая, максимум 100 символов |
| `description` | Нет            | Строка, после trim не пустая, максимум 400 символов |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой       | Действие                                                        |
| --- | ---------- | --------------------------------------------------------------- |
| 1   | Controller | Передает `{ dto, userId }` в service                            |
| 2   | Service    | Проверяет аргументы и формирует данные организации и membership |
| 3   | Repository | Выполняет `prisma.organization.create`                          |
| 4   | Mapper     | Преобразует `memberships[0].role` в поле `role`                 |

## Бизнес-правила

- `userId` берется из JWT и не принимается в body;
- создатель всегда получает роль `MembershipRole.OWNER`;
- организация и membership создаются одной вложенной Prisma-операцией;
- отсутствующий `description` не передается в Prisma и сохраняется как `null`;
- пустой или состоящий из пробелов `description` отклоняется DTO;
- одинаковые названия организаций разрешены текущей моделью;
- отсутствие `userId` или DTO при прямом вызове service приводит к
  `BadRequestException`.

## Prisma

Операция: `Organization.create` с вложенным `Membership.create`.

```ts
data: {
  name: dto.name,
  ...(dto.description && {
    description: dto.description
  }),
  memberships: {
    create: {
      userId,
      role: MembershipRole.OWNER
    }
  }
}
```

Вложенное создание атомарно: ошибка membership отменяет создание организации.

Для ответа применяется `organizationWithRoleSelect(userId)`, описанный в
[основном документе](../docs.md#общий-контракт-организации).

## Ответ

HTTP `201 Created`.

```json
{
  "id": "organization-id",
  "name": "RFlow",
  "description": "Release management",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "role": "OWNER"
}
```

## Ошибки

| Статус | Причина                                                   |
| ------ | --------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек             |
| `400`  | DTO не прошел валидацию или service вызван без аргументов |

Ошибки Prisma отдельно не преобразуются в доменные HTTP-исключения.
