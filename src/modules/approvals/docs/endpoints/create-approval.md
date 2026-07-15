# Создание approval

[← Документация модуля](../docs.md)

## Endpoint

```http
POST /api/v1/releases/:releaseId/approvals
Authorization: Bearer <access-token>
Content-Type: application/json
```

Создает approval для выбранного reviewer в рамках релиза.

## Вход

```json
{
  "reviewerUserId": "reviewer-user-id"
}
```

| Поле             | Обязательность | Правила                                             |
| ---------------- | -------------- | --------------------------------------------------- |
| `reviewerUserId` | Да             | UUID пользователя, который должен подтвердить релиз |

## Выполнение

| Шаг | Слой       | Действие                                                                   |
| --- | ---------- | -------------------------------------------------------------------------- |
| 1   | Controller | Передает `userId`, `releaseId` и `dto` в `ApprovalsService.createApproval` |
| 2   | Service    | Проверяет membership создателя approval и доступ к релизу                  |
| 3   | Policy     | Проверяет, что пользователь может создавать approval                       |
| 4   | Service    | Проверяет, что релиз находится в статусе `DRAFT`                           |
| 5   | Repository | Создает `Approval` со статусом `PENDING`                                   |

## Бизнес-правила

- создание approval доступно только участникам с ролью `OWNER` или `MANAGER`;
- релиз должен находиться в статусе `DRAFT`;
- reviewer должен быть участником той же организации;
- creator релиза не может быть единственным reviewer;
- в рамках одного релиза у reviewer не может быть более одного approval;
- при конфликте `P2002` возвращается `409 Conflict`.

## Prisma

Операция: `Approval.create`.

```ts
approval.create({
  data: {
    release: { connect: { id: releaseId } },
    reviewer: { connect: { id: dto.reviewerUserId } },
    status: ApprovalStatus.PENDING,
  },
  select: createApprovalSelect,
});
```

## Ответ

HTTP `201 Created`.

```json
{
  "id": "approval-id",
  "releaseId": "release-id",
  "reviewerUserId": "reviewer-user-id",
  "status": "PENDING",
  "createdAt": "2026-07-15T10:00:00.000Z"
}
```

## Ошибки

| Статус | Причина                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `404`  | Пользователь не имеет access к релизу, либо reviewer не состоит в организации                                                 |
| `403`  | У пользователя нет права создавать approval                                                                                   |
| `409`  | Релиз не находится в `DRAFT`, reviewer уже имеет approval для релиза, либо creator релиза не может быть единственным reviewer |
| `400`  | DTO не прошел валидацию                                                                                                       |
