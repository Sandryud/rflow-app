# Получение событий аудита релиза

[← Документация модуля](../docs.md)

## Endpoint

```http
GET /api/v1/releases/:releaseId/audit-events
Authorization: Bearer <access-token>
```

Возвращает события аудита релиза в хронологическом порядке с cursor pagination.

## Вход

- `userId` берётся из JWT через `request.user.userId`;
- `releaseId` передаётся через path и проверяется `ParseUUIDPipe`;
- `limit` — необязательный query-параметр, преобразуется в число:
  - значение по умолчанию — `50`;
  - минимальное значение — `1`;
  - максимальное значение — `100`;
  - допускаются только целые числа;
- `cursor` — необязательная непустая строка в формате opaque Base64URL cursor;
- body отсутствует.

Cursor содержит `createdAt` и `id` последнего события предыдущей страницы. Клиент должен передавать полученное значение без изменения и не должен зависеть от его внутреннего формата.

## Выполнение

| Шаг | Слой       | Действие                                                                  |
| --- | ---------- | ------------------------------------------------------------------------- |
| 1   | Controller | Получает `userId`, `releaseId`, `limit` и `cursor`                        |
| 2   | Service    | Проверяет membership и декодирует cursor                                  |
| 3   | Repository | Выбирает `limit + 1` событий после cursor с доступной parent chain        |
| 4   | Service    | Отбрасывает lookahead-запись и формирует `items` и следующий `nextCursor` |

## Бизнес-правила

- endpoint доступен любому участнику организации, включая `VIEWER`;
- пользователь без membership получает `404 Not Found`;
- release, project и organization должны быть доступны и не удалены;
- события сортируются по `createdAt ASC`, затем по `id ASC`;
- actor содержит только публичные поля `id`, `name` и `email`;
- повреждённый или неподдерживаемый cursor возвращает `400 Bad Request`;
- если следующей страницы нет, `nextCursor` равен `null`;
- чтение audit log не создаёт новый AuditEvent;
- API изменения и удаления AuditEvent отсутствует.

## Prisma

Операция: `AuditEvent.findMany`.

```ts
auditEvent.findMany({
  where: {
    releaseId,
    release: {
      deletedAt: null,
      project: {
        deletedAt: null,
        organization: { deletedAt: null },
      },
    },
    ...(cursor && {
      OR: [
        { createdAt: { gt: cursor.createdAt } },
        {
          createdAt: cursor.createdAt,
          id: { gt: cursor.id },
        },
      ],
    }),
  },
  take: limit + 1,
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  select: auditEventSelect,
});
```

Для запроса используется индекс:

```prisma
@@index([releaseId, createdAt, id])
```

## Ответ

HTTP `200 OK`.

```json
{
  "items": [
    {
      "id": "audit-event-id",
      "organizationId": "organization-id",
      "projectId": "project-id",
      "releaseId": "release-id",
      "action": "release.review_requested",
      "entityType": "release",
      "entityId": "release-id",
      "metadata": {
        "fromStatus": "DRAFT",
        "toStatus": "IN_REVIEW"
      },
      "createdAt": "2026-07-26T11:31:09.904Z",
      "actor": {
        "id": "user-id",
        "name": "Jane Doe",
        "email": "jane@example.com"
      }
    }
  ],
  "nextCursor": null
}
```

Если событий нет:

```json
{
  "items": [],
  "nextCursor": null
}
```

Если следующая страница существует, `nextCursor` содержит opaque Base64URL-строку. Для её получения клиент повторяет запрос с query-параметром `cursor`.

## Ошибки

| Статус | Причина                                                                  |
| ------ | ------------------------------------------------------------------------ |
| `400`  | `releaseId` не UUID, query невалиден либо cursor повреждён               |
| `401`  | Access token отсутствует, повреждён или истёк                            |
| `404`  | Нет membership либо release, project или organization недоступны/удалены |
