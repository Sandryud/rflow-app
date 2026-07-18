# Unit Testing Guidelines

## Назначение

Этот документ задаёт единый стандарт unit-тестов для backend ReleaseFlow на NestJS и Jest.

Unit-тест проверяет поведение одного класса в изоляции. Его зависимости заменяются mock-объектами; реальная база данных, HTTP-сервер и внешние сервисы не запускаются.

## Обязательные правила ReleaseFlow

1. Названия `describe` и `it` пишутся на английском языке.
2. Название `it` описывает наблюдаемое поведение, а не детали реализации.
3. Один `it` проверяет один сценарий и содержит один `expect`; допустимый максимум — два связанных `expect`.
4. Повторяющиеся fixtures, mock factories и builders выносятся из `it`.
5. Общая очистка mocks выполняется в `beforeEach`.
6. Тесты не зависят от порядка выполнения и не используют общее изменяемое состояние.
7. Unit-тест service не подключается к Prisma/PostgreSQL и не вызывает реальный repository.
8. Проверяется публичное поведение класса: результат, exception либо важное взаимодействие с зависимостью.

Хорошие названия:

```ts
it('allows the author to update an active comment', async () => {});
it('forbids a manager from updating another user comment', async () => {});
it('returns not found when the user is not an organization member', async () => {});
it('maps a concurrent Prisma update failure to ConflictException', async () => {});
```

Неудачные названия:

```ts
it('works', async () => {});
it('test updateComment', async () => {});
it('should call findCommentById then findReleaseMembership', async () => {});
```

## Структура файла

Тест располагается рядом с модулем:

```text
src/modules/comments/tests/comments.service.spec.ts
```

Рекомендуемый порядок содержимого:

1. imports;
2. mock types;
3. неизменяемые fixtures;
4. fixture builders;
5. mock factories;
6. `createService`;
7. `describe`;
8. `beforeEach`;
9. группы методов через вложенные `describe`;
10. `it` cases.

## Изолированное создание service

Для обычного service предпочтительно прямое создание класса. Такой тест быстрее и явно показывает зависимости:

```ts
type CommentsRepositoryMock = {
  findCommentById: jest.Mock;
  findReleaseMembership: jest.Mock;
  findRelease: jest.Mock;
  updateComment: jest.Mock;
  softDeleteComment: jest.Mock;
};

type CommentsPolicyMock = {
  canModerateComment: jest.Mock;
};

const createCommentsRepositoryMock = (): CommentsRepositoryMock => ({
  findCommentById: jest.fn(),
  findReleaseMembership: jest.fn(),
  findRelease: jest.fn(),
  updateComment: jest.fn(),
  softDeleteComment: jest.fn(),
});

const createCommentsPolicyMock = (): CommentsPolicyMock => ({
  canModerateComment: jest.fn(),
});

const createService = () => {
  const repository = createCommentsRepositoryMock();
  const policy = createCommentsPolicyMock();
  const service = new CommentsService(
    repository as unknown as CommentsRepository,
    policy as unknown as CommentsPolicy,
  );

  return { policy, repository, service };
};
```

Используй `Test.createTestingModule()` из `@nestjs/testing`, когда предмет проверки зависит от Nest DI: custom injection token, factory provider, scope, override guard/interceptor или корректность сборки provider graph. Не поднимай `TestingModule` только ради создания простого service.

## Fixtures и builders

Fixtures должны содержать только данные, важные для сценариев. Для вариаций используй builder с `overrides`:

```ts
const activeComment = {
  id: 'comment-id',
  releaseId: 'release-id',
  authorUserId: 'author-id',
  release: { status: ReleaseStatus.DRAFT },
};

const createComment = (overrides: Partial<typeof activeComment> = {}) => ({
  ...activeComment,
  ...overrides,
});
```

Не изменяй общий fixture внутри `it`. Создавай новый объект через builder или spread.

## Arrange — Act — Assert

Каждый тест визуально следует AAA без обязательных комментариев:

```ts
it('allows the author to update an active comment', async () => {
  const { repository, service } = createService();
  repository.findCommentById.mockResolvedValue(activeComment);
  repository.findReleaseMembership.mockResolvedValue(authorMembership);
  repository.updateComment.mockResolvedValue(updatedComment);

  const result = await service.updateComment(updateParams);

  expect(result).toEqual(updatedComment);
});
```

Комментарии `// Arrange`, `// Act`, `// Assert` добавляй только в длинный тест, где разделение иначе неочевидно.

## Один `it` — одна проверяемая мысль

Результат и вызов dependency обычно проверяются отдельными тестами:

```ts
it('returns the updated comment', async () => {
  // ...arrange
  const result = await service.updateComment(updateParams);
  expect(result).toEqual(updatedComment);
});

it('updates the comment with the current user and normalized DTO message', async () => {
  // ...arrange
  await service.updateComment(updateParams);
  expect(repository.updateComment).toHaveBeenCalledWith(
    'comment-id',
    'author-id',
    'Updated message',
  );
});
```

Два `expect` допустимы, когда они вместе доказывают один негативный сценарий:

```ts
it('forbids another user from updating the comment', async () => {
  // ...arrange
  await expect(service.updateComment(updateParams)).rejects.toThrow(
    ForbiddenException,
  );
  expect(repository.updateComment).not.toHaveBeenCalled();
});
```

Не объединяй в одном `it` несколько ролей, статусов или переходов. Для однотипной матрицы используй `it.each`, сохраняя один сценарий на строку таблицы.

## Exceptions

Для exception проверяй класс NestJS-ошибки:

```ts
await expect(service.updateComment(updateParams)).rejects.toThrow(
  ConflictException,
);
```

Текст проверяй отдельным тестом только тогда, когда он является частью публичного API-контракта. Не привязывай каждый unit-тест к формулировке сообщения.

Для негативного сценария полезно вторым `expect` проверить отсутствие mutation:

```ts
expect(repository.updateComment).not.toHaveBeenCalled();
```

## Async-код

- Всегда `await` Promise или возвращай его из `it`.
- Для успешного результата используй обычный `await`.
- Для ошибок используй `await expect(promise).rejects...`.
- Не смешивай `done` callback с `async/await`.
- Не оставляй пустые `catch`: такой тест может получить ложный успех.

## Mocks

В `beforeEach` очищай историю вызовов:

```ts
beforeEach(() => {
  jest.clearAllMocks();
});
```

Различия:

- `clearAllMocks` очищает вызовы, но сохраняет реализации;
- `resetAllMocks` также сбрасывает реализации;
- `restoreAllMocks` восстанавливает методы, подменённые через `jest.spyOn`.

Для текущего стиля ReleaseFlow по умолчанию используется `clearAllMocks`. Если mock-объект создаётся заново внутри `createService` в каждом `it`, тест дополнительно защищён от утечки настроек.

Настраивай только зависимости, до которых должен дойти конкретный сценарий. Это помогает обнаружить неправильный порядок проверок.

## Что проверять в service

### Успешный сценарий

- возвращаемый безопасный response;
- ключевой вызов repository с корректными параметрами;
- JWT `userId` используется как actor/author, а не значение из DTO.

### Доступ и ownership

- отсутствие membership возвращает `404`;
- недостаточная роль возвращает `403`;
- автор может изменить/удалить собственный ресурс;
- модератор может выполнить только разрешённую операцию;
- роль не расширяет права там, где действует строгое ownership;
- mutation repository не вызывается после отказа.

### Soft delete

- удалённый ресурс воспринимается как отсутствующий;
- повторное последовательное удаление возвращает `404`;
- применяется update `deletedAt`, а не физический delete;
- soft-deleted записи не попадают в list response.

Repository-фильтры Prisma лучше проверять отдельными repository integration-тестами. Service unit-тест проверяет, что выбран правильный repository-метод и корректно обработан его результат.

### State machine и статусы

- разрешённое состояние допускает mutation;
- запрещённое состояние возвращает `409`;
- mutation не вызывается при конфликте;
- проверяется каждый значимый запрещённый переход или статус.

### Prisma errors и race conditions

Условный update/delete может завершиться `P2025`, если состояние изменилось после предварительных проверок. Unit-тест должен доказать преобразование ошибки в `409`:

```ts
const error = new Prisma.PrismaClientKnownRequestError(
  'Conditional update failed',
  {
    code: 'P2025',
    clientVersion: 'test',
  },
);

repository.updateComment.mockRejectedValue(error);

await expect(service.updateComment(updateParams)).rejects.toThrow(
  ConflictException,
);
```

Если операция обрабатывает `P2002`, отдельно проверь преобразование в `409`. Не проверяй реализацию Prisma — проверяй mapping ошибки service.

## Что не относится к service unit-тесту

- `ParseUUIDPipe`, HTTP status и route decorators — controller/e2e уровень;
- работа `class-validator`/`class-transformer` — DTO unit или e2e уровень;
- реальный SQL, constraints и транзакции — integration уровень;
- JWT signature и guard pipeline — auth/e2e уровень;
- точная структура Prisma `where` — repository integration уровень.

Не дублируй один и тот же контракт на всех уровнях без причины.

## Обязательная матрица CommentsService

### `createComment`

- участник любой роли, включая VIEWER, может создать comment;
- автор берётся из текущего `userId`;
- отсутствие membership → `404`;
- недоступный release → `404`;
- статус `RELEASED` не блокирует создание.

### `getComments`

- участник любой роли получает список;
- отсутствие membership → `404`;
- недоступный release → `404`;
- repository response возвращается без преобразования.

Сортировка и исключение soft-deleted comments проверяются на repository integration-уровне либо e2e.

### `updateComment`

- автор обновляет собственный comment;
- другой пользователь получает `403`;
- OWNER/MANAGER не могут редактировать чужой текст;
- отсутствие membership → `404`;
- отсутствующий/удалённый comment → `404`;
- `RELEASED` → `409`;
- `P2025` → `409`;
- repository mutation не вызывается при отказе.

### `deleteComment`

- автор удаляет собственный comment;
- OWNER/MANAGER удаляют чужой comment;
- DEVELOPER/QA/VIEWER не удаляют чужой comment;
- отсутствие membership → `404`;
- отсутствующий или уже удалённый comment → `404`;
- `RELEASED` → `409`;
- `P2025` → `409`;
- для автора repository получает ownership filter;
- для модератора чужого comment ownership filter отсутствует;
- repository mutation не вызывается при отказе.

## Когда использовать `it.each`

Используй таблицу для одинаковой бизнес-ветки с разными входами:

```ts
it.each([MembershipRole.DEVELOPER, MembershipRole.QA, MembershipRole.VIEWER])(
  'forbids a %s from deleting another user comment',
  async (role) => {
    // ...arrange
    await expect(service.deleteComment(deleteParams)).rejects.toThrow(
      ForbiddenException,
    );
  },
);
```

Не используй `it.each`, если разные строки требуют разного setup или проверяют разные причины отказа.

## Проверки перед завершением

Запускай сначала целевой файл, затем весь unit suite:

```bash
npx jest src/modules/comments/tests/comments.service.spec.ts --runInBand
npm run test:unit -- --runInBand
npm run typecheck
```

Перед ревью проверь:

- каждое название `it` читается как бизнес-требование;
- один тест падает по одной понятной причине;
- в `it` не больше двух `expect`;
- повторяющийся setup вынесен;
- негативные тесты не допускают mutation;
- mocks не подключаются к реальной инфраструктуре;
- тесты проходят независимо и в любом порядке.

## Источники подхода

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Mock Functions](https://jestjs.io/docs/mock-function-api)
- [Jest Configuration](https://jestjs.io/docs/configuration)
