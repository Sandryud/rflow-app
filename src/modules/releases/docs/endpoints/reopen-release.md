# Возврат отклонённого релиза в работу

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/reopen
Authorization: Bearer <access-token>
```

Переводит релиз из статуса `REJECTED` в `DRAFT` и начинает новый цикл review.

## Вход

- `releaseId` передается через path-параметр;
- `userId` берется из JWT через `request.user.userId`;
- body и query-параметры отсутствуют.

## Выполнение

| Шаг | Слой       | Действие                                                                      |
| --- | ---------- | ----------------------------------------------------------------------------- |
| 1   | Controller | Передает `releaseId` и `userId` в `ReleasesService.requestReopen`             |
| 2   | Service    | Проверяет membership, роль, статус release и доступность environment          |
| 3   | Policy     | Разрешает действие только ролям `OWNER` и `MANAGER`                           |
| 4   | Repository | В транзакции меняет `REJECTED` на `DRAFT` и сбрасывает решения всех approvals |

## Бизнес-правила

- пользователь должен состоять в организации релиза;
- действие разрешено только ролям `OWNER` и `MANAGER`;
- release, project и organization не должны быть удалены;
- release должен находиться в статусе `REJECTED`;
- environment должен быть активным, неудалённым и принадлежать project релиза;
- все approvals переводятся в `PENDING`;
- у всех approvals очищаются `comment` и `decidedAt`;
- изменение release и сброс approvals выполняются атомарно;
- условный update защищает переход от конкурентного reopen.

## Prisma

Операции: `Release.findFirst`, `Environment.findFirst`, `Release.update` и `Approval.updateMany`.

```ts
prisma.$transaction(async (tx) => {
  const release = await tx.release.update({
    where: {
      id: releaseId,
      deletedAt: null,
      status: ReleaseStatus.REJECTED,
      environment: {
        deletedAt: null,
        isActive: true,
        project: {
          releases: { some: { id: releaseId } },
        },
      },
      project: {
        deletedAt: null,
        organization: { deletedAt: null },
      },
    },
    data: { status: ReleaseStatus.DRAFT },
    select: updateReleaseSelect,
  });

  await tx.approval.updateMany({
    where: { releaseId },
    data: {
      status: ApprovalStatus.PENDING,
      comment: null,
      decidedAt: null,
    },
  });

  return release;
});
```

Если conditional update перестал соответствовать состоянию release, Prisma возвращает `P2025`, который преобразуется в `409 Conflict`. Ошибка любой операции откатывает всю транзакцию.

## Ответ

HTTP `201 Created`.

```json
{
  "id": "release-id",
  "version": "1.0.0",
  "name": "Release 1.0.0",
  "status": "DRAFT",
  "projectId": "project-id",
  "environmentId": "environment-id",
  "updatedAt": "2026-07-22T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| `401`  | Access token отсутствует, поврежден или истек                                    |
| `403`  | Роль пользователя не позволяет вернуть release в работу                          |
| `404`  | Нет membership либо release, parent chain или активный environment недоступны    |
| `409`  | Release не в `REJECTED` либо conditional update проиграл конкурентному изменению |
