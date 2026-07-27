# Руководство по написанию integration-тестов

Документ определяет правила создания feature integration tests в ReleaseFlow.

Устройство PostgreSQL и Jest lifecycle описано отдельно в
[architecture.md](./architecture.md).

## Когда нужен integration-тест

Пишите integration-тест, когда поведение зависит от:

- Prisma query с relations, filters, ordering или pagination;
- PostgreSQL foreign key или unique constraint;
- transaction и rollback;
- conditional update;
- soft-delete filtering;
- преобразования Prisma error в application exception;
- совместной работы нескольких реальных Nest providers;
- persisted state после service/repository operation.

Используйте unit-тест, если сценарий проверяет:

- чистую business rule без database semantics;
- policy, mapper, cursor parser или transformer;
- ветвление service, которое надёжнее проверить через dependency mocks;
- точный вызов одной dependency.

Integration-тест не должен повторять все unit cases. Он проверяет важные контракты
между application code, Prisma и PostgreSQL.

## Граница теста

Выбирайте минимальную границу, которая доказывает нужное поведение.

### Repository integration

Подходит для:

- сложных Prisma queries;
- relations и selects;
- constraints;
- conditional mutations;
- transaction implementation.

Subject — настоящий repository. Arrange и независимые assertions выполняются через
`PrismaService`.

### Service/module integration

Подходит для:

- use case, который координирует несколько repositories/providers;
- mapping database errors;
- transaction + audit;
- business operation, результат которой нужно проверить в БД.

Subject — настоящий service, его repositories и policies. Не подменяйте внутренние
database dependencies.

### HTTP feature integration

Используйте, если нужно проверить:

- DTO transformation и validation;
- route binding;
- guards, pipes или filters;
- HTTP status и response contract.

Собирайте минимальный feature module через `createNestApplication`, а не весь
`AppModule`, если полный application graph не является предметом сценария.

Полный пользовательский flow через несколько modules относится к E2E.

## Расположение и naming

Файл:

```text
test/integration/<feature>/<subject>.integration-spec.ts
```

Примеры:

```text
test/integration/auth/auth.integration-spec.ts
test/integration/releases/releases.repository.integration-spec.ts
test/integration/releases/releases.lifecycle.integration-spec.ts
test/integration/audit/audit.repository.integration-spec.ts
```

Один spec должен иметь понятный subject. Не создавайте один большой файл на весь
feature, если в нём смешиваются независимые use cases.

Названия `describe` и `it` пишутся на английском:

```ts
describe('ReleasesRepository requestReview integration', () => {});

it('changes a draft release to in review and writes its audit event', async () => {});
it('rolls back the release status when audit creation fails', async () => {});
it('returns only active releases visible to the organization member', async () => {});
```

Название описывает наблюдаемое поведение, а не Prisma method:

```ts
// Плохо
it('calls findUnique', async () => {});
it('works with database', async () => {});
```

## Базовая структура spec

Рекомендуемый порядок:

1. imports;
2. local types;
3. immutable constants;
4. fixture builders или local factories;
5. `describe`;
6. `beforeAll`;
7. вложенные `describe` по operations;
8. test cases;
9. `afterAll`.

Пример repository integration:

```ts
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { OrganizationsModule } from '@modules/organizations/organizations.module';
import { OrganizationsRepository } from '@modules/organizations/organizations.repository';

describe('OrganizationsRepository integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let repository: OrganizationsRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [OrganizationsModule],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    repository = moduleRef.get(OrganizationsRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('returns only active organizations of the user', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

`moduleRef.init()` запускает Nest lifecycle, включая подключение
`PrismaService`. `moduleRef.close()` закрывает providers и database connections.

Если feature module зависит от configuration namespace, импортируйте настоящий
`ConfigModule.forRoot` с production config factories. Не создавайте неполный
TestingModule только ради короткого примера.

## Реальные и подменяемые зависимости

В integration-тесте не подменяются:

- `PrismaService`;
- repository тестируемого feature;
- transaction callback;
- service/policy, если они входят в выбранную границу.

Допустимо подменять только внешние boundaries, не входящие в scope:

- email gateway;
- Slack/Teams client;
- сторонний HTTP API;
- message broker;
- clock или UUID provider, зарегистрированный через injection token.

Подмену выполняйте через Nest `overrideProvider`. Не используйте deep
`jest.mock` production module internals.

Запрещённый пример:

```ts
await Test.createTestingModule({
  imports: [FeatureModule],
})
  .overrideProvider(PrismaService)
  .useValue(prismaMock)
  .compile();
```

Такой test является component test с mock database, а не integration test.

## Arrange — Act — Assert

Каждый test визуально следует AAA:

```ts
it('finds the user by normalized email', async () => {
  const user = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      name: 'Jane Doe',
      passwordHash: 'integration-test-hash',
    },
  });

  const result = await repository.findUserByEmail(user.email);

  expect(result).toMatchObject({
    id: user.id,
    email: user.email,
  });
});
```

Комментарии `Arrange`, `Act`, `Assert` нужны только в длинных сценариях, где границы
иначе неочевидны.

## Test data

Каждый `it` создаёт минимальный graph, необходимый сценарию.

До появления общих factories данные можно создавать через реальный
`PrismaService`. Повторяющуюся подготовку выносите в local factory:

```ts
type UserOverrides = Partial<{
  email: string;
  name: string;
  passwordHash: string;
}>;

const createUser = (prisma: PrismaService, overrides: UserOverrides = {}) =>
  prisma.user.create({
    data: {
      email: overrides.email ?? 'user@test.local',
      name: overrides.name ?? 'Test User',
      passwordHash: overrides.passwordHash ?? 'integration-test-password-hash',
    },
  });
```

Правила:

- defaults должны создавать валидную entity;
- в factory передаются только важные overrides;
- factory возвращает созданную Prisma entity;
- factory не содержит `expect`;
- factory не выполняет действие системы под тестом;
- общий fixture не изменяется внутри `it`;
- unique values не должны конфликтовать внутри одного scenario.

Если factory используется несколькими features, перенесите её в:

```text
test/integration/support/factories/
```

Не создавайте глобальный seed для всех test files. Он создаёт скрытые зависимости и
усложняет параллельное выполнение.

## Очистка данных

Infrastructure автоматически очищает domain tables перед каждым `it`.

Поэтому в feature spec не нужны:

- `deleteMany`;
- ручной `TRUNCATE`;
- очистка в `afterEach`;
- пересоздание schema;
- собственный PostgreSQL container.

После завершения одного `it` его данные могут оставаться до следующего global
`beforeEach`. Test не должен проверять состояние, оставленное предыдущим test case.

## Проверка persisted state

Для query достаточно проверить result subject.

Для mutation проверяйте:

1. публичный result или exception;
2. persisted state независимым Prisma query.

Пример:

```ts
await service.requestReview({
  userId: actor.id,
  releaseId: release.id,
});

const storedRelease = await prisma.release.findUniqueOrThrow({
  where: { id: release.id },
});

expect(storedRelease.status).toBe(ReleaseStatus.IN_REVIEW);
```

Если операция должна быть атомарной, связанные изменения проверяются вместе:

```ts
expect({
  releaseStatus: storedRelease.status,
  auditActions: auditEvents.map(({ action }) => action),
}).toEqual({
  releaseStatus: ReleaseStatus.IN_REVIEW,
  auditActions: ['release.review_requested'],
});
```

Несколько связанных assertions допустимы, когда вместе доказывают один database
contract.

## Ошибки и negative cases

Проверяйте внешний application contract:

- тип Nest exception для service/module test;
- HTTP status и response для HTTP feature test;
- отсутствие mutation в persisted state;
- сохранение исходного состояния после rollback.

Не привязывайтесь к внутреннему порядку Prisma calls. Это предмет unit-теста с mocks,
а не integration-теста.

Для database constraints обязательно проверяйте реальные конфликты:

- duplicate unique value;
- missing foreign key;
- conditional update, не нашедший допустимую строку;
- race condition, если business rule зависит от concurrency.

## Transactions

Для transaction-сценария нужны минимум:

- success test, проверяющий все согласованные mutations;
- failure test, проверяющий rollback всех mutations.

Не подменяйте transaction client mock-объектом. Иначе PostgreSQL rollback не
проверяется.

Не оборачивайте весь test case во внешнюю transaction ради очистки. Nest providers
могут использовать другие connections Prisma pool, которые не участвуют в этой
transaction.

## Parallelism

Разные test files могут выполняться параллельно: каждый Jest worker имеет отдельную
database.

Внутри database spec запрещено:

```ts
test.concurrent('...', async () => {});
```

Concurrent cases одного worker используют общую database и могут конфликтовать с
fixtures или cleanup.

Если нужно проверить race condition, запускайте конкурирующие promises внутри
одного обычного `it` и проверяйте итоговое состояние.

## Время, UUID и случайность

- Используйте фиксированные даты, когда ordering или expiration входят в contract.
- Передавайте timestamps явно через factory overrides.
- Для unique полей используйте понятные scenario-specific values.
- Не проверяйте полный JWT или случайный UUID на точное значение.
- Проверяйте payload/format и связи с persisted entity.
- Не используйте случайность для ветвления test scenario.

Если production behavior зависит от текущего времени или UUID, предпочтителен
injected provider, который можно контролировать через Nest override.

## HTTP feature integration

HTTP test должен собирать минимальный application. Целевая форма после выделения
общего production/test bootstrap helper:

```ts
const moduleRef = await Test.createTestingModule({
  imports: [FeatureTestingModule],
}).compile();

const app = moduleRef.createNestApplication();
configureApp(app);
await app.init();
```

Используйте тот же global prefix, versioning, pipes и filters, что production
bootstrap. `configureApp` пока не выделен в текущем проекте. Перед добавлением
нескольких HTTP integration specs его нужно вынести из `main.ts` в общий helper.
Не копируйте bootstrap configuration вручную в каждый spec.

Проверяйте:

- status;
- публичное response body;
- validation errors;
- persisted state для mutations.

Не проверяйте private fields и implementation details.

## Anti-patterns

Не добавляйте:

- mock `PrismaService`;
- shared mutable seed;
- зависимость tests от порядка запуска;
- ручную очистку database;
- `test.concurrent` для database cases;
- `sleep` для ожидания database state;
- `--forceExit`;
- assertions по внутреннему порядку repository calls;
- production secrets или developer `DATABASE_URL`;
- один огромный integration spec на весь module;
- fixtures с данными, не относящимися к сценарию.

Не используйте snapshot для больших API/database объектов. Явный expected object
лучше показывает контракт и безопаснее реагирует на изменение схемы.

## Команды разработчика

Весь suite:

```bash
npm run test:integration
```

Один файл:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/<feature>/<subject>.integration-spec.ts
```

Один test name:

```bash
npm run test:integration -- \
  --runTestsByPath test/integration/<feature>/<subject>.integration-spec.ts \
  --testNamePattern "rolls back"
```

Диагностика незакрытых resources:

```bash
npm run test:integration -- --runInBand --detectOpenHandles
```

## Checklist нового spec

Перед завершением:

- [ ] выбран минимальный integration boundary;
- [ ] файл имеет суффикс `.integration-spec.ts`;
- [ ] используется реальный `PrismaService`;
- [ ] setup выполняется один раз в `beforeAll`;
- [ ] Nest module/application закрывается в `afterAll`;
- [ ] каждый `it` создаёт собственные fixtures;
- [ ] отсутствует ручная очистка;
- [ ] action выполняется через subject;
- [ ] mutation проверяется через persisted state;
- [ ] negative case проверяет отсутствие частичной mutation;
- [ ] transaction имеет rollback scenario;
- [ ] отсутствуют `test.concurrent`, `sleep` и `--forceExit`;
- [ ] конкретный spec и полный integration suite проходят.

## Источники

- [NestJS testing](https://docs.nestjs.com/fundamentals/testing)
- [Prisma integration testing](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
- [Jest test API](https://jestjs.io/docs/api)
