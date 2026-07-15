# Получение организаций пользователя

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/organizations
Authorization: Bearer <access-token>
```

Возвращает неудаленные организации, в которых текущий пользователь имеет
membership.

## Вход

- body и query-параметры отсутствуют;
- `JwtAuthGuard` проверяет access token;
- controller получает `userId` из `request.user.userId`.

## Выполнение

| Шаг | Слой       | Действие                                                 |
| --- | ---------- | -------------------------------------------------------- |
| 1   | Controller | Вызывает `OrganizationsService.getOrganizations(userId)` |
| 2   | Service    | Проверяет наличие `userId`                               |
| 3   | Repository | Выполняет `prisma.organization.findMany`                 |
| 4   | Mapper     | Преобразует `memberships[0].role` в поле `role`          |

## Бизнес-правила

- доступны только организации с membership текущего пользователя;
- организации с заполненным `deletedAt` исключаются;
- роль выбирается только для текущего пользователя;
- при отсутствии организаций возвращается пустой массив;
- порядок результата не гарантирован, так как `orderBy` не задан;
- отсутствие `userId` при прямом вызове service приводит к
  `BadRequestException`.

## Prisma

Операция: `Organization.findMany`.

```ts
where: {
  deletedAt: null,
  memberships: {
    some: { userId }
  }
}
```

Для ответа применяется `organizationWithRoleSelect(userId)`:

```ts
select: {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  memberships: {
    where: { userId },
    select: { role: true }
  }
}
```

`memberships.some` ограничивает список организаций, а вложенный
`memberships.where` получает роль для ответа.

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "organization-id",
    "name": "RFlow",
    "description": "Release management",
    "createdAt": "2026-07-15T10:00:00.000Z",
    "role": "OWNER"
  }
]
```

## Ошибки

| Статус | Причина                                                           |
| ------ | ----------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                     |
| `400`  | Service вызван без `userId`; обычный HTTP-запрос защищен guard’ом |
