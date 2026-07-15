# Получение текущего пользователя

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/users/me
Authorization: Bearer <access-token>
```

Возвращает публичный профиль текущего аутентифицированного пользователя.

## Вход

- body и query-параметры отсутствуют;
- `JwtAuthGuard` проверяет access token;
- controller получает `userId` из `request.user.userId`.

## Выполнение

| Шаг | Слой       | Действие                                              |
| --- | ---------- | ----------------------------------------------------- |
| 1   | Controller | Вызывает `UsersService.getUser(req.user.userId)`      |
| 2   | Service    | Проверяет наличие `id` и ищет пользователя            |
| 3   | Repository | Выполняет `prisma.user.findUnique({ where: { id } })` |

## Бизнес-правила

- endpoint защищен `JwtAuthGuard` и доступен только при валидном JWT;
- `userId` берется из токена и не передается в body/query;
- при отсутствии `id` в service прямой вызов приводит к `UnauthorizedException`;
- если пользователь не найден, возвращается `401 Unauthorized`;
- ответ содержит только публичные поля пользователя: `id`, `name`, `email`.

## Prisma

Операция: `User.findUnique`.

```ts
where: {
  id;
}
```

Для ответа используется `userSelect`:

```ts
select: {
  email: true,
  id: true,
  name: true,
}
```

## Ответ

HTTP `200 OK`.

```json
{
  "id": "user-id",
  "name": "John Doe",
  "email": "user@example.com"
}
```

## Ошибки

| Статус | Причина                                                      |
| ------ | ------------------------------------------------------------ |
| `401`  | Access token отсутствует, поврежден или истек                |
| `401`  | `id` не передан в service или текущий пользователь не найден |
