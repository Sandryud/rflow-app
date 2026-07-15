# Получение релиза по идентификатору

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/releases/:releaseId
Authorization: Bearer <access-token>
```

Возвращает релиз по его идентификатору, если текущий пользователь имеет доступ через организацию и проект релиза.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                          |
| --- | ---------- | ----------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `releaseId` в `ReleasesService.getRelease`    |
| 2   | Service    | Проверяет membership пользователя в организации проекта релиза    |
| 3   | Repository | Выполняет `release.findFirst({ where: { id, deletedAt: null } })` |

## Бизнес-правила

- пользователь должен быть member организации, через которую доступен релиз;
- релиз должен существовать и не быть удаленным;
- если membership не найден, возвращается `404 Not Found`;
- если релиз не найден, возвращается `404 Not Found`.

## Prisma

Операция: `Release.findFirst`.

```ts
where: {
  id: releaseId,
  deletedAt: null
}
```

## Ответ

HTTP `200 OK`.

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

| Статус | Причина                                                      |
| ------ | ------------------------------------------------------------ |
| `404`  | Пользователь не имеет доступа к релизу, либо релиз не найден |
| `401`  | Access token отсутствует, поврежден или истек                |
