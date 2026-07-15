# Получение проектов организации

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/organizations/:organizationId/projects
Authorization: Bearer <access-token>
```

Возвращает проекты организации, в которой текущий пользователь состоит, с исключением удаленных записей.

## Вход

- `organizationId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                             |
| --- | ---------- | -------------------------------------------------------------------- |
| 1   | Controller | Передает `userId` и `organizationId` в `ProjectsService.getProjects` |
| 2   | Service    | Проверяет, что пользователь является участником организации          |
| 3   | Repository | Выполняет `organization.findFirst` с вложенным `projects`            |

## Бизнес-правила

- пользователь должен быть member организации;
- в ответ попадают только неудаленные проекты (`deletedAt: null`);
- если организация не найдена или пользователь не является member, возвращается `404 Not Found`;
- набор проектов не сортируется явно, поэтому порядок не гарантирован.

## Prisma

Операция: `Organization.findFirst` с вложенной выборкой `projects`.

```ts
where: {
  id: organizationId,
  deletedAt: null,
  memberships: { some: { userId } }
}

select: {
  projects: {
    where: { deletedAt: null },
    select: projectSelect
  }
}
```

## Ответ

HTTP `200 OK`.

```json
[
  {
    "id": "project-id",
    "name": "RFlow Backend",
    "description": "Release management backend",
    "organizationId": "organization-id",
    "createdAt": "2026-07-15T10:00:00.000Z"
  }
]
```

## Ошибки

| Статус | Причина                                                       |
| ------ | ------------------------------------------------------------- |
| `404`  | Пользователь не состоит в организации или организация удалена |
| `401`  | Access token отсутствует, поврежден или истек                 |
