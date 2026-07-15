# Вход в систему

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Аутентифицирует пользователя по email и password и возвращает JWT access token вместе с публичными данными профиля.

## Вход

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

| Поле       | Обязательность | Правила                                    |
| ---------- | -------------- | ------------------------------------------ |
| `email`    | Да             | Строка, email-формат, после trim не пустая |
| `password` | Да             | Строка, минимум 6 символов, максимум 128   |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой            | Действие                                                             |
| --- | --------------- | -------------------------------------------------------------------- |
| 1   | Controller      | Передает DTO в `AuthService.login(dto)`                              |
| 2   | Service         | Приводит email к lowercase, ищет пользователя и сверяет пароль       |
| 3   | Repository      | Выполняет `prisma.user.findUnique({ where: { email } })`             |
| 4   | PasswordService | Сравнивает переданный пароль с `passwordHash` через `bcrypt.compare` |
| 5   | TokenService    | Подписывает JWT payload `{ sub, email }`                             |

## Бизнес-правила

- email нормализуется к lowercase перед поиском пользователя;
- при отсутствии пользователя возвращается `401 Unauthorized`;
- при неверном пароле возвращается `401 Unauthorized`;
- успешный вход возвращает `accessToken` и публичный профиль пользователя;
- `sub` в JWT payload равен `user.id`, а `email` — `user.email`.

## Prisma

Операция: `User.findUnique`.

```ts
where: {
  email: dto.email.toLowerCase();
}
```

Поиск выполняется по уникальному полю `email`. Для ответа не используется отдельный `select`, потому что `login` возвращает публичный профиль из `publicUserSelect`.

## Ответ

HTTP `200 OK`.

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "user@example.com"
  }
}
```

## Ошибки

| Статус | Причина                                   |
| ------ | ----------------------------------------- |
| `401`  | Пользователь не найден или пароль неверен |
| `400`  | DTO не прошел валидацию                   |
