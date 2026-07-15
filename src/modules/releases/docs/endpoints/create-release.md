# Создание релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/projects/:projectId/releases
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает новый релиз в проекте. Для этого пользователь должен иметь доступ через organization membership и роль `OWNER` или `MANAGER`.

## Вход

```json
{
  "name": " Release 1.0.0 ",
  "description": " First release ",
  "version": "1.0.0",
  "environmentId": "environment-id",
  "plannedReleaseAt": "2026-07-15T10:00:00.000Z"
}
```

| Поле               | Обязательность | Правила                                             |
| ------------------ | -------------- | --------------------------------------------------- |
| `name`             | Да             | Строка, после trim не пустая, максимум 100 символов |
| `description`      | Нет            | Строка, после trim не пустая, максимум 400 символов |
| `version`          | Да             | Строка, после trim не пустая, максимум 50 символов  |
| `environmentId`    | Да             | UUID, должен ссылаться на активное окружение        |
| `plannedReleaseAt` | Нет            | ISO-8601 дата                                       |

Неизвестные поля отклоняются глобальным `ValidationPipe`.

## Выполнение

| Шаг | Слой       | Действие                                                                 |
| --- | ---------- | ------------------------------------------------------------------------ |
| 1   | Controller | Передает `dto`, `userId` и `projectId` в `ReleasesService.createRelease` |
| 2   | Service    | Проверяет membership пользователя и его роль                             |
| 3   | Policy     | Проверяет, что роль позволяет создавать релизы                           |
| 4   | Repository | Проверяет активное окружение и создает `Release`                         |

## Бизнес-правила

- релиз создается только в рамках действующего проекта и organization membership;
- разрешены роли `OWNER` и `MANAGER`;
- `environmentId` должен указывать на активное, неудаленное окружение проекта;
- после создания релиз получает статус `DRAFT`;
- если версия релиза дублирует существующую в этом проекте, возвращается `409 Conflict`.

## Prisma

Операция: `Environment.findFirst` и `Release.create`.

```ts
environment.findFirst({
  where: {
    projectId,
    id: environmentId,
    isActive: true,
    deletedAt: null,
  },
});
```

```ts
release.create({
  data: {
    name: dto.name,
    description: dto.description,
    version: dto.version,
    environmentId: dto.environmentId,
    plannedReleaseAt,
    createdByUserId: userId,
    status: ReleaseStatus.DRAFT,
    projectId,
  },
  select: releaseSelect,
});
```

## Ответ

HTTP `201 Created`.

```json
{
  "id": "release-id",
  "name": "Release 1.0.0",
  "description": "Release description",
  "version": "1.0.0",
  "status": "DRAFT",
  "projectId": "project-id",
  "environmentId": "environment-id",
  "createdByUserId": "user-id",
  "plannedReleaseAt": "2026-07-15T10:00:00.000Z",
  "createdAt": "2026-07-15T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                   |
| ------ | ------------------------------------------------------------------------- |
| `404`  | Пользователь не имеет доступа к проекту или активное окружение не найдено |
| `403`  | У пользователя нет права создавать релиз                                  |
| `409`  | В проекте уже существует релиз с такой версией                            |
| `400`  | DTO не прошел валидацию                                                   |
