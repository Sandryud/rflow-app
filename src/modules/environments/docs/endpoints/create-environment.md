# Создание окружения проекта

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/projects/:projectId/environments
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает новое окружение внутри проекта, если текущий пользователь имеет роль `OWNER` или `MANAGER` в организации проекта.

## Вход

```json
{
  "name": " staging ",
  "description": " Staging environment "
}
```

| Поле          | Обязательность | Правила                                             |
| ------------- | -------------- | --------------------------------------------------- |
| `name`        | Да             | Строка, после trim не пустая, максимум 100 символов |
| `description` | Нет            | Строка, после trim не пустая, максимум 400 символов |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой       | Действие                                                                         |
| --- | ---------- | -------------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId`, `projectId` и `dto` в `EnvironmentsService.createEnvironment` |
| 2   | Service    | Проверяет membership пользователя в организации проекта                          |
| 3   | Policy     | Проверяет, что роль участника позволяет создавать окружения                      |
| 4   | Repository | Выполняет `prisma.environment.create`                                            |

## Бизнес-правила

- создать окружение могут только участники с ролью `OWNER` или `MANAGER`;
- при отсутствии membership возвращается `404 Not Found`;
- при нарушении прав возвращается `403 Forbidden`;
- `projectId` берется из path-параметра, а не из body;
- `description` может быть опциональным, но если передан, должен содержать непустую строку после trim.

## Prisma

Операция: `Environment.create`.

```ts
data: {
  name: dto.name,
  description: dto.description,
  projectId
}
```

В ответе используется `environmentSelect`:

```ts
select: {
  id: true,
  name: true,
  projectId: true,
  description: true,
  createdAt: true,
  isActive: true,
  isDefault: true,
}
```

## Ответ

HTTP `201 Created`.

```json
{
  "id": "environment-id",
  "name": "staging",
  "projectId": "project-id",
  "description": "Staging environment",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "isActive": true,
  "isDefault": false
}
```

## Ошибки

| Статус | Причина                                       |
| ------ | --------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек |
| `404`  | Пользователь не состоит в организации проекта |
| `403`  | У пользователя нет права создавать окружения  |
| `400`  | DTO не прошел валидацию                       |
