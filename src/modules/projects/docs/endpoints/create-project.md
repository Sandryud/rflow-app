# Создание проекта

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/organizations/:organizationId/projects
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает новый проект внутри организации, если текущий пользователь имеет роль `OWNER` или `MANAGER`.

## Вход

```json
{
  "name": " RFlow Backend ",
  "description": " Release management backend "
}
```

| Поле          | Обязательность | Правила                                             |
| ------------- | -------------- | --------------------------------------------------- |
| `name`        | Да             | Строка, после trim не пустая, максимум 100 символов |
| `description` | Нет            | Строка, после trim не пустая, максимум 400 символов |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой       | Действие                                                                      |
| --- | ---------- | ----------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId`, `organizationId` и `dto` в `ProjectsService.createProject` |
| 2   | Service    | Проверяет membership пользователя в организации                               |
| 3   | Policy     | Проверяет, что роль участника позволяет создавать проекты                     |
| 4   | Repository | Создает `Project` через `prisma.project.create`                               |

## Бизнес-правила

- создать проект могут только участники организации с ролью `OWNER` или `MANAGER`;
- если membership не найден, возвращается `404 Not Found`;
- если роль участника не разрешена, возвращается `403 Forbidden`;
- `organizationId` берется из path-параметра, а не из body;
- `description` может быть опциональным, но если передан, должен содержать непустую строку после trim.

## Prisma

Операция: `Project.create`.

```ts
data: {
  name: dto.name,
  description: dto.description,
  organizationId
}
```

В ответе используется `projectSelect`:

```ts
select: {
  id: true,
  name: true,
  description: true,
  organizationId: true,
  createdAt: true,
}
```

## Ответ

HTTP `201 Created`.

```json
{
  "id": "project-id",
  "name": "RFlow Backend",
  "description": "Release management backend",
  "organizationId": "organization-id",
  "createdAt": "2026-07-15T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                       |
| ------ | ------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                 |
| `404`  | Пользователь не состоит в организации или организация удалена |
| `403`  | У пользователя нет права создавать проекты                    |
| `400`  | DTO не прошел валидацию                                       |
