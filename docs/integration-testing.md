# Integration Testing With Real PostgreSQL

Статус: proposed  
Область: backend на NestJS, Prisma и PostgreSQL  
Цель: определить реализацию воспроизводимого и масштабируемого integration-контура

## 1. Резюме решения

Integration-тесты ReleaseFlow должны запускать реальные Nest providers, Prisma Client,
SQL-запросы, constraints, индексы и транзакции на настоящем PostgreSQL.

Целевой контур:

```text
Jest global setup
  -> запускает ephemeral PostgreSQL 16 через Testcontainers
  -> создаёт template database
  -> применяет prisma migrate deploy

Jest worker
  -> создаёт собственную database из template database
  -> устанавливает DATABASE_URL до импорта AppModule/PrismaService

Test file
  -> собирает реальный Nest module
  -> использует реальный PrismaService
  -> очищает database перед каждым test case
  -> создаёт данные через test factories
  -> закрывает Nest application/module

Jest global teardown
  -> останавливает PostgreSQL container
  -> удаляет временный state file
```

Ключевые решения:

- PostgreSQL запускается через `@testcontainers/postgresql`, а не через общий
  developer `docker-compose.yml`;
- версия образа совпадает с проектом: `postgres:16-alpine`;
- схема создаётся только из committed Prisma migrations через
  `prisma migrate deploy`;
- один container используется на один запуск integration project;
- каждому Jest worker выдаётся отдельная database;
- данные очищаются перед каждым `it`;
- `PrismaService` и repositories не подменяются mock-объектами;
- внешние системы, не относящиеся к PostgreSQL, подменяются только на границе;
- тесты одного worker не используют `test.concurrent`;
- test database никогда не переиспользует development или production volume.

Это целевая архитектура, а не описание уже реализованного контура. Порядок внедрения
приведён в разделе 13.

## 2. Оценка текущего состояния

### Что уже подготовлено хорошо

- Приложение имеет feature-first структуру `src/modules/<feature>`.
- Доступ к БД изолирован в repositories и `PrismaService`.
- `PrismaService` реализует `OnModuleInit` и `OnModuleDestroy`, поэтому соединения
  можно корректно открывать и закрывать через Nest lifecycle.
- Prisma migrations хранятся в `prisma/migrations`.
- Для разработки уже используется PostgreSQL 16.
- Unit-тесты отделены по суффиксу и имеют отдельные рекомендации в
  `docs/templates/unit-testing-guidelines.md`.
- Существует отдельная Jest-конфигурация `test/jest-integration.json`.

### Проблемы, которые должен устранить контур

| Область                                  | Текущее состояние                                                 | Последствие                                              |
| ---------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| `test/integration/*.integration-spec.ts` | `PrismaService` заменён Jest mock                                 | SQL, constraints, mappings и транзакции не проверяются   |
| Граница теста                            | Controller вызывается напрямую                                    | Не проверяются HTTP routing, pipes, filters и guards     |
| PostgreSQL lifecycle                     | Отсутствует                                                       | Результат зависит от ручной настройки окружения          |
| Миграции                                 | Не выполняются test runner-ом                                     | Тесты не доказывают применимость migration history       |
| Изоляция                                 | Нет общей стратегии                                               | При подключении реальной БД появятся flaky tests         |
| Параллелизм                              | Нет database-per-worker                                           | Параллельные suites будут удалять данные друг друга      |
| `test/app.e2e-spec.ts`                   | Ожидает устаревший `GET /` и собирает приложение не как `main.ts` | Файл не отражает текущий API-контракт                    |
| Bootstrap                                | Prefix, versioning, pipe и filter настроены только в `main.ts`    | HTTP-тест легко запускает приложение с другим поведением |
| `docker-compose.yml`                     | Постоянный volume и фиксированный host port                       | Неподходящая изоляция для автоматических тестов          |

Текущие `auth.integration-spec.ts` и `users.integration-spec.ts` полезны как
component/module tests: они проверяют Nest DI и взаимодействие controller-service с
подменённой БД. При внедрении нового контура их нужно либо:

1. перенести в `test/component` и переименовать в `*.component-spec.ts`; либо
2. преобразовать в настоящие integration-тесты, убрав override `PrismaService`.

Не следует сохранять за mock-based тестами суффикс `integration-spec`.

## 3. Таксономия тестов

| Уровень     | Что проверяет                            | БД            | Nest runtime                   | Расположение                                |
| ----------- | ---------------------------------------- | ------------- | ------------------------------ | ------------------------------------------- |
| Unit        | Один service, policy, mapper или helper  | Mock          | Обычно нет                     | `src/modules/*/tests/*.spec.ts`             |
| Component   | Nest DI и несколько providers            | Mock/заглушка | `TestingModule`                | `test/component/**/*.component-spec.ts`     |
| Integration | Module/repository + реальный PostgreSQL  | Реальная      | `TestingModule`                | `test/integration/**/*.integration-spec.ts` |
| E2E/API     | Полный HTTP request и публичный контракт | Реальная      | `INestApplication` + Supertest | `test/e2e/**/*.e2e-spec.ts`                 |

Основной объект этого документа — integration level. Небольшой e2e smoke suite
должен использовать тот же database contour, но отдельную Jest-конфигурацию.

### Что обязательно проверять integration-тестами

- сложные Prisma `where`, relations и `select`;
- unique и foreign-key constraints;
- soft-delete filtering;
- optimistic/conditional update;
- транзакции, особенно mutation + `AuditEvent`;
- rollback при ошибке внутри транзакции;
- конкурентные изменения, если use case зависит от race condition;
- mapping ошибок Prisma (`P2002`, `P2025`) в application exception;
- выборки по membership, organization, project и release;
- ordering, cursor pagination и database-specific semantics.

Простые policies, DTO transformers и ветвления service без SQL остаются unit-тестами.

## 4. Почему Testcontainers

Developer `docker-compose.yml` предназначен для долгоживущей локальной БД. Он
использует фиксированное имя container, host port и persistent volume. Test runner
не должен:

- требовать ручной `docker compose up`;
- использовать данные разработчика;
- конфликтовать с уже запущенным PostgreSQL;
- оставлять volume после запуска;
- обращаться к одному фиксированному порту.

Testcontainers выдаёт случайный свободный host port, ожидает готовность container и
удаляет ресурс после suite. Один и тот же путь работает локально и в CI при наличии
Docker-compatible runtime.

Отклонённые альтернативы:

- SQLite/in-memory adapter не воспроизводит PostgreSQL constraints, locking, JSON,
  transaction и query semantics;
- общий development container связывает tests с локальным состоянием и fixed port;
- одна database для параллельных workers делает `TRUNCATE` и fixtures конфликтующими;
- container на каждый `it` даёт максимальную изоляцию, но создаёт лишний startup cost;
- rollback внешней test-транзакции не охватывает запросы из других Prisma pool
  connections.

Необходимая dev dependency:

```bash
npm install --save-dev @testcontainers/postgresql
```

`pg` и `@types/pg` уже есть в проекте.

## 5. Целевая структура

```text
test/
  component/
    auth/
      auth.module.component-spec.ts
    users/
      users.module.component-spec.ts

  integration/
    setup/
      global-setup.ts
      global-teardown.ts
      worker-setup.ts
      jest-hooks.ts
      container-state.ts
      test-database-manager.ts

    support/
      create-integration-module.ts
      database-cleaner.ts
      test-env.ts
      factories/
        user.factory.ts
        organization.factory.ts
        project.factory.ts
        environment.factory.ts
        release.factory.ts
        approval.factory.ts
        checklist-item.factory.ts

    auth/
      auth.repository.integration-spec.ts
    releases/
      releases.repository.integration-spec.ts
      releases.lifecycle.integration-spec.ts
    audit/
      audit.repository.integration-spec.ts

  e2e/
    support/
      create-test-app.ts
      auth-client.ts
    auth.e2e-spec.ts
    releases.e2e-spec.ts

  jest-integration.config.ts
  jest-e2e.config.ts
```

Правила размещения:

- infrastructure setup находится только в `test/integration/setup`;
- reusable fixtures находятся только в `test/integration/support/factories`;
- feature-specific helpers остаются рядом с тестом, пока не понадобятся второму
  feature;
- production code не импортирует ничего из `test`;
- integration-тесты группируются по feature, как и application code;
- один spec-файл соответствует одному subject/use case, а не всему модулю.

## 6. Lifecycle PostgreSQL

### 6.1 Global setup

`global-setup.ts` выполняется один раз:

1. проверяет `NODE_ENV === 'test'`;
2. запускает `PostgreSqlContainer('postgres:16-alpine')`;
3. создаёт отдельную template database, например `rflow_it_template`;
4. формирует URL template database;
5. запускает `prisma migrate deploy` с этим URL;
6. закрывает все соединения с template database;
7. сохраняет только сериализуемые connection parameters во временный state file;
8. передаёт путь к state file worker-процессам через environment variable.

Container object нельзя передавать в suites. Jest `globalSetup` и test environments
имеют разные global scopes, поэтому suites читают сериализованный state, а container
handle остаётся доступен только `global-teardown.ts`.

Для миграций используется:

```bash
npx prisma migrate deploy
```

`prisma db push` запрещён: он не проверяет committed migration history и создаёт
схему другим путём, чем test/staging/production deployment.

### 6.2 Database per worker

`worker-setup.ts` выполняется до импорта test module:

1. читает `JEST_WORKER_ID`;
2. строит безопасное имя, например `rflow_it_<runId>_w<workerId>`;
3. через administrative connection выполняет
   `CREATE DATABASE ... TEMPLATE rflow_it_template`;
4. если database уже создана этим worker, переиспользует её;
5. устанавливает `DATABASE_URL`, `POSTGRES_HOST`, `POSTGRES_PORT`,
   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`;
6. устанавливает test-only `JWT_SECRET` и `JWT_ACCESS_EXPIRES_IN`.

Имя database строится только внутри helper и валидируется регулярным выражением.
Нельзя подставлять в `CREATE DATABASE` произвольный user input.

Отдельная database на worker даёт:

- отсутствие конфликтов между параллельными spec-файлами;
- возможность использовать `TRUNCATE` без блокировки другого worker;
- реальную database-level изоляцию;
- ограниченное число containers и быстрый startup.

`maxWorkers` должен быть ограничен с учётом доступной памяти и connection pool.
Начальное значение: `2` в CI и `50%` CPU локально. После измерения времени и памяти
значение можно увеличить.

### 6.3 Очистка перед каждым test case

`jest-hooks.ts` регистрирует общий `beforeEach` и очищает все domain tables через
один test-only helper:

```sql
TRUNCATE TABLE
  "AuditEvent",
  "Comment",
  "Approval",
  "ChecklistItem",
  "ReleaseTask",
  "Release",
  "Environment",
  "Project",
  "Membership",
  "Organization",
  "User"
RESTART IDENTITY CASCADE;
```

Список таблиц должен храниться централизованно и обновляться вместе с Prisma model.
SQL является статической строкой; table names не приходят извне.

`TRUNCATE` выбран вместо последовательных `deleteMany`:

- быстрее на растущем suite;
- не требует вручную поддерживать порядок foreign keys;
- восстанавливает sequences, если они появятся;
- делает начальное состояние каждого `it` явным.

PostgreSQL берёт `ACCESS EXCLUSIVE` lock на `TRUNCATE`, поэтому один worker не
должен выполнять database test cases через `test.concurrent`. Между workers
конфликта нет, так как databases разные.

Rollback общей транзакции после каждого теста не используется. Приложение и test
helper могут работать через разные соединения Prisma pool, поэтому transaction,
открытая test runner-ом, не охватывает реальные запросы системы под тестом.

### 6.4 Teardown

Каждый spec-файл:

- закрывает `TestingModule` или `INestApplication` в `afterAll`;
- не вызывает `$disconnect` у Prisma, которым владеет чужой Nest context.

Global teardown:

- останавливает container даже после упавших tests;
- удаляет временный state file;
- не использует `--forceExit`.

`--forceExit` скрывает утечки handles. Утечки нужно диагностировать через корректный
Nest lifecycle и, временно, `--detectOpenHandles`.

## 7. Jest configuration

Целевую JSON-конфигурацию удобнее заменить TypeScript-конфигурацией, чтобы безопасно
вычислять `maxWorkers`.

```ts
// test/jest-integration.config.ts
import type { Config } from 'jest';

const config: Config = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'],
  globalSetup: '<rootDir>/test/integration/setup/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/setup/global-teardown.ts',
  setupFiles: ['<rootDir>/test/integration/setup/worker-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup/jest-hooks.ts'],
  maxWorkers: process.env.CI ? 2 : '50%',
  testTimeout: 30_000,
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^generated/(.*)$': '<rootDir>/generated/$1',
  },
};

export default config;
```

Scripts:

```json
{
  "scripts": {
    "test:unit": "jest --testRegex \"^(?!.*\\.integration\\.spec\\.ts$).*\\.spec\\.ts$\"",
    "test:component": "jest --config ./test/jest-component.config.ts",
    "test:integration": "jest --config ./test/jest-integration.config.ts",
    "test:integration:serial": "npm run test:integration -- --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.config.ts"
  }
}
```

`test:integration:serial` нужен для локальной диагностики. Основной script должен
оставаться параллельным и использовать database-per-worker.

Следует отдельно проверить совместимость major versions `jest`, `ts-jest` и
TypeScript при внедрении. Текущий suite работает, но version policy должна исключать
случайный несовместимый upgrade transformer-а.

## 8. Сборка Nest testing module

Для repository/module integration test:

```ts
export async function createIntegrationModule(
  imports: ModuleMetadata['imports'],
) {
  const moduleRef = await Test.createTestingModule({ imports }).compile();
  await moduleRef.init();
  return moduleRef;
}
```

Пример:

```ts
describe('ReleasesRepository requestReview integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let repository: ReleasesRepository;

  beforeAll(async () => {
    moduleRef = await createIntegrationModule([ReleasesModule]);
    prisma = moduleRef.get(PrismaService);
    repository = moduleRef.get(ReleasesRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('changes a draft release to in review and writes its audit event', async () => {
    const scenario = await createReleaseScenario(prisma, {
      releaseStatus: ReleaseStatus.DRAFT,
    });

    await repository.requestReview({
      releaseId: scenario.release.id,
      auditEvent: buildReviewRequestedAuditEvent(scenario),
    });

    const [release, auditEvents] = await Promise.all([
      prisma.release.findUniqueOrThrow({
        where: { id: scenario.release.id },
      }),
      prisma.auditEvent.findMany({
        where: { releaseId: scenario.release.id },
      }),
    ]);

    expect({
      status: release.status,
      auditActions: auditEvents.map(({ action }) => action),
    }).toEqual({
      status: ReleaseStatus.IN_REVIEW,
      auditActions: ['release.review_requested'],
    });
  });
});
```

В integration-тесте допустимо несколько связанных database assertions, если вместе
они доказывают одну атомарную операцию. Не нужно искусственно разделять проверку
mutation и audit event: важное свойство use case — их согласованность.

Для rollback нужен отдельный сценарий: вызвать операцию с данными, приводящими к
ошибке второй mutation, и проверить, что первая mutation также не сохранилась.

### Что не подменять

В integration test не подменяются:

- `PrismaService`;
- repository тестируемого модуля;
- transaction callback;
- policy/service, если проверяется полный use case внутри feature.

Допустимо подменять:

- email, Slack и другие network gateways;
- clock/UUID provider, если они представлены injection token;
- дорогой внешний API;
- message broker, если он не входит в scope конкретного test project.

Подмена должна происходить через Nest `overrideProvider`, а не через глобальный
`jest.mock` глубоко внутри production imports.

## 9. Test data factories

Factories создают минимальный валидный graph через реальный `PrismaService`.

```ts
type UserFactoryOverrides = Partial<{
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}>;

export async function createUser(
  prisma: PrismaService,
  overrides: UserFactoryOverrides = {},
) {
  const id = overrides.id ?? randomUUID();

  return prisma.user.create({
    data: {
      id,
      email: overrides.email ?? `user-${id}@test.local`,
      name: overrides.name ?? 'Test User',
      passwordHash: overrides.passwordHash ?? TEST_PASSWORD_HASH,
    },
  });
}
```

Правила factories:

- defaults всегда валидны;
- unique fields получают изолированное значение; для сценариев, где точное значение
  важно, оно задаётся явно через `overrides`;
- `overrides` меняют только необходимые поля;
- factory возвращает созданную Prisma entity;
- factory не содержит `expect`;
- factory не скрывает действие системы под тестом;
- общие graph factories (`createReleaseScenario`) собираются из маленьких factories;
- пароли большинства users используют заранее вычисленный test hash;
- реальные `bcrypt.hash/compare` проверяются несколькими auth integration cases, а
  не каждой factory.

Arrange разрешено выполнять напрямую через Prisma. Само действие нужно выполнять
через публичный метод subject: repository, service или HTTP endpoint. Итог следует
проверять и через возвращаемое значение, и через БД, когда persistence является
частью поведения.

Не следует хранить один глобальный seed для всех suites: скрытые зависимости между
сценариями делают tests хрупкими.

## 10. HTTP/E2E на том же контуре

`main.ts` сейчас содержит runtime configuration, которую test application не
получает автоматически. Перед полноценными HTTP-тестами нужно вынести общую
настройку:

```text
src/
  bootstrap/
    configure-app.ts
  main.ts
```

```ts
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
```

`main.ts` и `create-test-app.ts` вызывают одну функцию. Swagger можно оставить
только в production bootstrap.

```ts
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}
```

Auth e2e следует проходить через реальные `POST /api/v1/auth/register` и
`POST /api/v1/auth/login`. Для feature e2e можно использовать helper, который
создаёт user factory и подписывает JWT реальным `JwtService`, если login не является
предметом каждого сценария.

## 11. Правила написания нового integration-теста

1. Определить, нужен ли реальный PostgreSQL. Если SQL semantics не важны, написать
   unit-тест.
2. Выбрать минимальную границу: repository, feature module или HTTP.
3. Создать файл
   `test/integration/<feature>/<subject>.integration-spec.ts`.
4. Собрать реальный module один раз в `beforeAll`.
5. Получить providers через `moduleRef.get`.
6. Не добавлять локальную очистку: общий hook уже очищает database перед `it`.
7. Подготовить только нужные данные через factories.
8. Выполнить одно наблюдаемое действие.
9. Проверить результат и persisted state.
10. Закрыть module/application в `afterAll`.
11. Запустить сначала конкретный файл, затем весь integration suite.

Команды:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/releases/releases.lifecycle.integration-spec.ts

npm run test:integration
```

Naming:

```ts
it('returns only releases from active projects', async () => {});
it('rolls back the status change when audit creation fails', async () => {});
it('rejects a duplicate release version in the same project', async () => {});
```

Неудачные варианты:

```ts
it('calls prisma update', async () => {});
it('works with database', async () => {});
it('test release', async () => {});
```

Тесты проверяют поведение и database contract, а не порядок внутренних вызовов mock.

## 12. Safety и надёжность

Перед любой очисткой `database-cleaner` обязан проверить:

- `NODE_ENV === 'test'`;
- database name начинается с `rflow_it_`;
- URL был получен из state текущего Testcontainers run;
- URL не равен значению development `DATABASE_URL`, прочитанному до setup.

При нарушении любой проверки runner должен завершиться до `TRUNCATE`.

Дополнительные правила:

- не читать `.env` как источник test database;
- не логировать password или полный connection URL;
- не задавать host port вручную;
- не использовать persistent volume;
- не включать container reuse в CI;
- pin как минимум major PostgreSQL image;
- для воспроизводимости можно pin exact image tag/digest после принятия политики
  обновлений;
- таймаут startup/migrations отделять от timeout test case;
- при ошибке setup печатать stage (`container`, `migration`, `worker database`), но
  не credentials.

## 13. План внедрения

### Этап 1. Классификация и bootstrap

- создать `test/component`;
- перенести или переименовать два текущих mock-based integration specs;
- удалить/заменить устаревший `test/app.e2e-spec.ts`;
- вынести `configureApp` из `main.ts`;
- зафиксировать naming и scripts.

Критерий готовности: unit и component suites работают без PostgreSQL, а
`integration-spec` больше не содержит override `PrismaService`.

### Этап 2. PostgreSQL infrastructure

- добавить `@testcontainers/postgresql`;
- реализовать global setup/teardown и state file;
- реализовать migrated template database;
- реализовать database-per-worker;
- добавить safety guards;
- реализовать общий `TRUNCATE` hook;
- заменить `jest-integration.json` на target config.

Критерий готовности: `npm run test:integration` с чистой машины требует только
Node.js, установленные npm dependencies и Docker-compatible runtime.

### Этап 3. Factories и первые contract tests

В рекомендуемом порядке:

1. `AuthRepository`: unique email и persisted password hash;
2. `OrganizationsRepository`: organization + membership relation;
3. `ReleasesRepository`: membership queries и soft-delete;
4. release lifecycle transaction + audit event;
5. release rollback при ошибке audit mutation;
6. audit cursor ordering на одинаковом `createdAt`;
7. concurrent conditional status update.

Критерий готовности: suite обнаруживает нарушение foreign keys, unique constraints,
transaction rollback и сложных relation filters.

### Этап 4. HTTP smoke tests

- реализовать `createTestApp`;
- registration/login;
- authenticated `GET /api/v1/users/me`;
- один critical release lifecycle flow;
- проверка validation pipe и exception filter.

Критерий готовности: tests используют тот же prefix, versioning, pipes и filters,
что production bootstrap.

### Этап 5. CI и масштабирование

- запускать unit и integration как разные jobs;
- включить Docker runtime для integration job;
- ограничить workers согласно CPU/RAM;
- сохранять Jest report при падении;
- измерять container startup, migrations и tests отдельно;
- при росте suite использовать Jest sharding: каждый shard поднимает свой container,
  а внутри shard сохраняется database-per-worker;
- не делить один PostgreSQL container между разными CI jobs.

Рекомендуемый PR gate:

```text
lint
typecheck
unit
integration
build
```

E2E smoke может быть отдельным обязательным job после стабилизации.

## 14. Definition of Done

Контур считается реализованным, когда:

- integration suite не требует заранее запущенной developer database;
- в tests нет URL development/production database;
- committed migrations применяются автоматически;
- каждый worker изолирован отдельной database;
- каждый test case получает пустые domain tables;
- отсутствует override `PrismaService` в `*.integration-spec.ts`;
- Nest modules/applications закрываются без open handles;
- suite проходит параллельно и через `--runInBand`;
- повторный запуск даёт одинаковый результат;
- CI останавливает container после success и failure;
- есть минимум один test реального transaction rollback;
- документация обновляется при изменении infrastructure contract.

## 15. Источники решений

- [NestJS: Testing](https://docs.nestjs.com/fundamentals/testing) — `TestingModule`,
  `createNestApplication`, lifecycle и provider overrides.
- [Prisma: Integration testing](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
  — отдельная test database, миграции, запуск и уничтожение container.
- [Prisma Migrate: development and production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
  — использование committed migrations и `prisma migrate deploy` для test/staging/
  production environments.
- [Testcontainers for Node.js: PostgreSQL](https://node.testcontainers.org/modules/postgresql/)
  — PostgreSQL container и connection URI.
- [Testcontainers for Node.js: global setup](https://node.testcontainers.org/quickstart/global-setup/)
  — lifecycle общего container и ограничение передачи state между test contexts.
- [Jest 30: configuration](https://jestjs.io/docs/30.0/configuration) —
  `globalSetup`, `globalTeardown`, `setupFiles`, `setupFilesAfterEnv` и `maxWorkers`.
- [Jest: environment variables](https://jestjs.io/docs/environment-variables) —
  `NODE_ENV` и `JEST_WORKER_ID`.
- [PostgreSQL 16: TRUNCATE](https://www.postgresql.org/docs/16/sql-truncate.html) —
  `RESTART IDENTITY`, `CASCADE`, locking и transaction behavior.
