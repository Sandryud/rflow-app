# Регистрация пользователя

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/auth/register
Content-Type: application/json
```

Создает нового пользователя, хеширует пароль и возвращает публичный профиль созданной учетной записи.

## Вход

```json
{
  "name": " John Doe ",
  "email": "user@example.com",
  "password": "secret123"
}
```

| Поле       | Обязательность | Правила                                                       |
| ---------- | -------------- | ------------------------------------------------------------- |
| `name`     | Да             | Строка, после trim не пустая, минимум 2 символа, максимум 100 |
| `email`    | Да             | Строка, email-формат, после trim не пустая                    |
| `password` | Да             | Строка, минимум 6 символов, максимум 128                      |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой            | Действие                                                           |
| --- | --------------- | ------------------------------------------------------------------ |
| 1   | Controller      | Передает DTO в `AuthService.register(dto)`                         |
| 2   | Service         | Приводит email к lowercase, проверяет дубликат и хеширует пароль   |
| 3   | Repository      | Выполняет `prisma.user.findUnique({ where: { email } })`           |
| 4   | PasswordService | Хеширует пароль через `bcrypt.hash(..., 12)`                       |
| 5   | Repository      | Выполняет `prisma.user.create({ data, select: publicUserSelect })` |

## Бизнес-правила

- email нормализуется к lowercase перед проверкой и сохранением;
- при уже существующем email в базе возвращается `409 Conflict`;
- пароль никогда не сохраняется в открытом виде: создается bcrypt-хеш;
- после регистрации клиент получает только публичный профиль:
  `id`, `name`, `email`.

## Prisma

Операция: `User.findUnique` и `User.create`.

```ts
findUnique: {
  where: { email: dto.email.toLowerCase() }
}

create: {
  data: {
    name: dto.name,
    email: dto.email.toLowerCase(),
    passwordHash: hashedPassword
  },
  select: publicUserSelect
}
```

`publicUserSelect` ограничивает выходной объект только полями `id`, `name`, `email`:

```ts
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
};
```

## Ответ

HTTP `201 Created`.

```json
{
  "id": "user-id",
  "name": "John Doe",
  "email": "user@example.com"
}
```

## Ошибки

| Статус | Причина                                   |
| ------ | ----------------------------------------- |
| `409`  | Пользователь с таким email уже существует |
| `400`  | DTO не прошел валидацию                   |
