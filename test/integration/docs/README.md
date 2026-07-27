# Integration Tests

Документ описывает реализованный integration-контур ReleaseFlow: как Jest запускает
настоящий PostgreSQL, применяет Prisma migrations, изолирует параллельные workers,
очищает данные и завершает инфраструктуру.

## Назначение

Integration-тесты проверяют совместную работу:

- NestJS dependency injection;
- services и repositories;
- `PrismaService` и сгенерированного Prisma Client;
- настоящих SQL-запросов PostgreSQL;
- foreign keys, unique constraints и индексов;
- Prisma transactions;
- committed migration history.

В integration-тестах `PrismaService` не заменяется mock-объектом. Если для сценария
не важны SQL, constraints или транзакции, его следует реализовать как unit-тест в
`src/modules/<feature>/tests`.

## Требования

Для запуска нужны:

- установленные npm dependencies;
- запущенный Docker Desktop или другой Docker-compatible container runtime;
- доступ текущего пользователя к Docker daemon.

Предварительно запускать `docker compose up` или создавать test database вручную не
нужно.

## Команды

Запуск всех integration-тестов:

```bash
npm run test:integration
```

Запуск конкретного файла:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/database/database-contour.integration-spec.ts
```

Последовательный диагностический запуск:

```bash
npm run test:integration:serial
```

Основной режим — `test:integration`. Последовательный режим выполняет tests в одном
Jest worker через `--runInBand` и нужен только для отладки flaky tests, открытых
handles или отличий между последовательным и параллельным выполнением.

## Структура

```text
test/
  integration/
    database/
      database-contour.integration-spec.ts

    docs/
      README.md

    setup/
      container-state.ts
      global-setup.ts
      global-teardown.ts
      jest-hooks.ts
      test-database-manager.ts
      worker-setup.ts

  jest-integration.config.ts
```

| Файл                                   | Ответственность                                               |
| -------------------------------------- | ------------------------------------------------------------- |
| `jest-integration.config.ts`           | Выбирает integration specs и подключает lifecycle hooks       |
| `global-setup.ts`                      | Один раз запускает PostgreSQL и применяет migrations          |
| `global-teardown.ts`                   | Останавливает container и удаляет временный state             |
| `worker-setup.ts`                      | Создаёт отдельную database для текущего Jest worker           |
| `jest-hooks.ts`                        | Проверяет безопасное окружение и очищает БД перед каждым `it` |
| `container-state.ts`                   | Хранит topology constants, environment setup и safety checks  |
| `test-database-manager.ts`             | Создаёт databases, закрывает template и выполняет `TRUNCATE`  |
| `database-contour.integration-spec.ts` | Проверяет, что worker database создана и мигрирована          |

## Общая схема

```text
npm run test:integration
          |
          v
Jest globalSetup
          |
          +-- start postgres:16-alpine
          |
          +-- create rflow_it_template
          |
          +-- prisma migrate deploy
          |
          +-- seal template database
          |
          +-- write temporary container state
          |
          v
Jest worker 1 ------------------- Jest worker 2
          |                                |
          v                                v
rflow_it_<runId>_w1              rflow_it_<runId>_w2
          |                                |
          +-- beforeEach: TRUNCATE          +-- beforeEach: TRUNCATE
          |
          v
real Nest providers + real Prisma + real PostgreSQL
          |
          v
Jest globalTeardown
          |
          +-- stop container
          +-- remove temporary state
```

## Топология PostgreSQL

На один запуск Jest создаётся один PostgreSQL container из образа
`postgres:16-alpine`.

Внутри него используются три типа databases.

### Control database

Имя:

```text
rflow_it_control
```

Это начальная database, создаваемая самим PostgreSQL container. Через неё
`TestDatabaseManager` выполняет administrative queries:

- `CREATE DATABASE`;
- `ALTER DATABASE`;
- клонирование worker databases.

Application tests к control database не подключаются.

### Template database

Имя:

```text
rflow_it_template
```

Global setup создаёт её один раз и запускает:

```bash
npm exec prisma -- migrate deploy
```

В `DATABASE_URL` процесса миграции передаётся URL именно template database. Prisma
применяет все migrations из `prisma/migrations`, включая создание таблицы
`_prisma_migrations`.

После миграций выполняется:

```sql
ALTER DATABASE "rflow_it_template"
WITH IS_TEMPLATE TRUE ALLOW_CONNECTIONS FALSE;
```

Запрет новых соединений нужен, чтобы PostgreSQL мог стабильно клонировать template.
Tests никогда не записывают данные в эту database.

### Worker database

Для каждого Jest worker строится имя:

```text
rflow_it_<runId>_w<JEST_WORKER_ID>
```

Пример:

```text
rflow_it_a14f3b9c2d11_w2
```

Database создаётся через:

```sql
CREATE DATABASE "rflow_it_a14f3b9c2d11_w2"
WITH OWNER "rflow_test"
TEMPLATE "rflow_it_template";
```

Клонирование template быстрее повторного применения всех migrations для каждого
worker. Каждый worker получает отдельное физическое пространство данных, поэтому
параллельные test files не удаляют и не изменяют записи друг друга.

## Полный lifecycle запуска

### 1. Jest читает конфигурацию

`test/jest-integration.config.ts` задаёт:

```ts
testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'];
```

Другие `*.spec.ts` в integration project не попадут.

Конфигурация также задаёт:

- `globalSetup` и `globalTeardown`;
- `setupFiles` для worker setup;
- `setupFilesAfterEnv` для Jest hooks;
- `maxWorkers: 2` в CI;
- `maxWorkers: 50%` доступных CPU локально;
- `maxConcurrency: 1`;
- timeout одного test case — 30 секунд;
- aliases, совпадающие с production TypeScript aliases.

`maxConcurrency: 1` ограничивает только `test.concurrent`. Изоляция test files между
Jest workers обеспечивается отдельными databases.

### 2. Global setup запускает container

`global-setup.ts` выполняется один раз до всех test suites:

1. устанавливает `NODE_ENV=test`;
2. запускает `PostgreSqlContainer`;
3. создаёт случайный `runId`;
4. собирает connection state;
5. создаёт template database;
6. применяет Prisma migrations;
7. закрывает template для новых соединений;
8. сохраняет state во временный файл.

Container запускается со случайным свободным host port. Поэтому integration suite
не конфликтует с локальным PostgreSQL на `5432` и с параллельно запущенным
developer-контуром.

Если создание template или migrations завершаются ошибкой, global setup
останавливает уже запущенный container и пробрасывает исходную ошибку в Jest.

### 3. State передаётся worker-процессам

Jest global setup и test environments работают в разных global scopes. Передать
`StartedPostgreSqlContainer` напрямую в test file нельзя.

Поэтому `container-state.ts` сохраняет сериализуемые параметры:

```ts
type ContainerState = {
  runId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  controlDatabase: string;
  templateDatabase: string;
};
```

State записывается в системную временную директорию:

```text
<os.tmpdir>/rflow-integration-<random>/container-state.json
```

Файлу назначаются права `0600`. Путь передаётся workers через:

```text
RFLOW_INTEGRATION_CONTAINER_STATE_PATH
```

Пароль и полный connection URL не выводятся в test logs.

### 4. Worker setup создаёт изолированную database

`worker-setup.ts` запускается до импорта test file:

1. читает state;
2. получает `JEST_WORKER_ID`;
3. строит безопасное имя worker database;
4. создаёт database из template;
5. устанавливает environment variables.

Устанавливаются:

```text
NODE_ENV=test
PORT=0
POSTGRES_HOST=<container host>
POSTGRES_PORT=<random mapped port>
POSTGRES_USER=rflow_test
POSTGRES_PASSWORD=rflow_test
POSTGRES_DB=rflow_it_<runId>_w<workerId>
DATABASE_URL=postgresql://...
JWT_ACCESS_EXPIRES_IN=15m
JWT_SECRET=rflow-integration-test-secret
```

Это происходит до импорта `AppModule` и создания `PrismaService`. Поэтому
`PrismaService` получает URL worker database, а не URL из developer `.env`.

Worker setup может вызываться для нескольких test files одного worker. Повторная
попытка создать уже существующую worker database обрабатывается по PostgreSQL error
code `42P04`.

### 5. Jest hooks проверяют окружение

`jest-hooks.ts` регистрирует общий `beforeAll`.

До первого теста проверяется:

- существует `JEST_WORKER_ID`;
- имя database соответствует текущим `runId` и worker ID;
- `NODE_ENV` равен `test`;
- `POSTGRES_DB` равен ожидаемой worker database.

При несовпадении suite останавливается до выполнения destructive SQL.

### 6. Данные очищаются перед каждым тестом

Общий `beforeEach` вызывает:

```ts
databaseManager.cleanDatabase(databaseName);
```

Перед очисткой manager выполняет:

```sql
SELECT current_database();
```

Полученное имя должно точно совпасть с ожидаемой worker database. После этого
выполняется одна статическая команда:

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

`TRUNCATE` обеспечивает пустые domain tables перед каждым `it`.
`_prisma_migrations` не очищается, поэтому worker database остаётся мигрированной.

`CASCADE` учитывает foreign keys, а `RESTART IDENTITY` сбрасывает sequences, если
они используются или появятся позже.

### 7. Выполняется test case

После общего `beforeEach` test получает:

- настоящую PostgreSQL database;
- применённую production migration history;
- пустые domain tables;
- собственную database, недоступную другим workers;
- test environment для Nest ConfigModule и Prisma.

Arrange можно выполнять напрямую через `PrismaService`. Само действие следует
выполнять через public API тестируемого subject: repository, service или HTTP
endpoint.

### 8. Global teardown освобождает ресурсы

После завершения suites `global-teardown.ts`:

1. останавливает PostgreSQL container;
2. удаляет `container-state.json`;
3. удаляет временную директорию state;
4. очищает global references и environment variable.

Container содержит control, template и все worker databases. Отдельно удалять
databases не требуется: они уничтожаются вместе с ephemeral container.

## Safety checks

Любое database name должно:

- начинаться с `rflow_it_`;
- соответствовать `/^[a-z][a-z0-9_]{0,62}$/`;
- не превышать ограничение PostgreSQL identifier;
- быть построено внутри integration infrastructure.

State дополнительно проверяет:

- `runId` — 12 hexadecimal символов;
- непустые host, username и password;
- положительный integer port;
- безопасные имена control и template databases.

Удаляется только файл с точным именем `container-state.json` внутри временной
директории с префиксом `rflow-integration-`. Произвольный путь teardown не удаляет.

Эти проверки защищают development и production databases от случайного `TRUNCATE`.

## Database contour smoke test

`database-contour.integration-spec.ts` проверяет инфраструктурный контракт:

- `DATABASE_URL` доступен;
- фактическая database совпадает с `POSTGRES_DB`;
- таблица `User` создана migrations;
- таблица `_prisma_migrations` существует.

Smoke test должен оставаться в suite. Он позволяет отличить ошибку инфраструктуры
от ошибки feature integration test.

## Как добавить integration-тест

### 1. Выбрать расположение

```text
test/integration/<feature>/<subject>.integration-spec.ts
```

Примеры:

```text
test/integration/releases/releases.repository.integration-spec.ts
test/integration/releases/releases.lifecycle.integration-spec.ts
test/integration/audit/audit.repository.integration-spec.ts
```

### 2. Собрать настоящий Nest module

```ts
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@database/prisma.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AuthRepository } from '@modules/auth/auth.repository';

describe('AuthRepository integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let repository: AuthRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    await moduleRef.init();

    prisma = moduleRef.get(PrismaService);
    repository = moduleRef.get(AuthRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  // tests
});
```

`moduleRef.init()` запускает Nest lifecycle hooks, включая подключение
`PrismaService`. `moduleRef.close()` вызывает `OnModuleDestroy` и закрывает
соединение.

Не добавляйте:

```ts
.overrideProvider(PrismaService).useValue(prismaMock)
```

Такой тест не проверяет integration с PostgreSQL.

### 3. Подготовить минимальные данные

Пока общие factories не реализованы, данные можно создавать через реальный
`PrismaService`:

```ts
const user = await prisma.user.create({
  data: {
    email: 'release-owner@test.local',
    name: 'Release Owner',
    passwordHash: 'integration-test-hash',
  },
});
```

Не удаляйте данные вручную в `afterEach`: общий hook очистит database перед
следующим `it`.

Когда появятся reusable factories, они будут располагаться в:

```text
test/integration/support/factories/
```

### 4. Выполнить действие через subject

```ts
const result = await repository.findUserByEmail(user.email);
```

Не используйте Prisma для выполнения действия, если проверяется repository или
service. Prisma используется для arrange и для независимой проверки persisted
state.

### 5. Проверить результат и состояние БД

```ts
expect(result).toMatchObject({
  id: user.id,
  email: user.email,
});
```

Для mutations полезно независимо прочитать persisted state:

```ts
const storedRelease = await prisma.release.findUniqueOrThrow({
  where: { id: release.id },
});

expect(storedRelease.status).toBe(ReleaseStatus.IN_REVIEW);
```

Если use case атомарно изменяет несколько сущностей, например release и
`AuditEvent`, один test должен проверить согласованность всей операции.

## Правила изоляции тестов

- Каждый `it` самостоятельно создаёт нужные данные.
- Tests не зависят от порядка запуска.
- Нельзя использовать общий изменяемый seed.
- Нельзя выполнять database tests через `test.concurrent`.
- Нельзя обращаться к development `docker-compose.yml`.
- Нельзя переопределять `DATABASE_URL` внутри test case.
- Нельзя вызывать общий cleaner вручную.
- Нельзя использовать `--forceExit` для скрытия незакрытых connections.
- Каждый созданный `TestingModule` или `INestApplication` закрывается в `afterAll`.

Jest может выполнять разные files параллельно: они находятся в разных worker
databases. Test cases внутри одного file должны оставаться последовательными,
поскольку используют одну database и общий `TRUNCATE`.

## Изменение Prisma schema

При добавлении или удалении Prisma model:

1. создать committed migration;
2. проверить, что `prisma migrate deploy` работает на пустой БД;
3. обновить `DOMAIN_TABLES` в `test-database-manager.ts`;
4. запустить database contour test;
5. запустить весь integration suite.

Команда `prisma db push` в integration setup не используется. Контур намеренно
проверяет тот же migration history, который применяется в test/staging/production.

Если новую domain table не добавить в `DOMAIN_TABLES`, её данные сохранятся между
test cases и могут вызвать flaky tests.

## CI

Integration job должен:

- иметь Docker-compatible runtime;
- установить npm dependencies;
- запускать `npm run test:integration`;
- не поднимать отдельный PostgreSQL service;
- не передавать production secrets;
- разрешать Testcontainers автоматически остановить container.

В CI используется максимум два Jest worker. Это ограничивает количество
одновременных PostgreSQL connections и потребление памяти. Значение можно менять
после измерения suite.

Каждый CI job должен поднимать собственный container. Нельзя делить один container
между независимыми jobs или shards.

## Диагностика

### `Could not find a working container runtime strategy`

Testcontainers не может подключиться к Docker daemon.

Проверить:

```bash
docker info
```

Нужно запустить Docker Desktop или настроить права на container runtime socket.

### Ошибка `prisma migrate deploy`

Global setup завершится до запуска tests.

Проверить:

- migration SQL;
- последовательность migrations;
- совместимость migration с PostgreSQL 16;
- отсутствие ручного изменения committed migrations.

Не заменяйте `migrate deploy` на `db push`: это скроет проблему migration history.

### `Unsafe integration database name`

Имя не прошло safety validation. Database name должно создаваться через
`buildWorkerDatabaseName`, а не собираться в test file.

### `Unsafe integration test database environment`

`NODE_ENV` или `POSTGRES_DB` изменились после worker setup. Проверьте test и imports,
которые модифицируют `process.env`.

### Ошибка во время `TRUNCATE`

Частые причины:

- в Prisma schema появилась новая table, но `DOMAIN_TABLES` не обновлён;
- test оставил активную долгую transaction;
- database connection указывает не на текущую worker database.

### Jest не завершается

Проверить, что:

- `TestingModule` закрывается через `moduleRef.close()`;
- `INestApplication` закрывается через `app.close()`;
- вручную созданный `pg.Client` вызывает `client.end()` в `finally`;
- timers и внешние clients закрываются.

Для диагностики:

```bash
npm run test:integration -- --runInBand --detectOpenHandles
```

Не добавляйте `--forceExit` в основной script.

## Текущее состояние

Реализованы:

- PostgreSQL Testcontainer;
- template database;
- автоматическое применение Prisma migrations;
- отдельная database на Jest worker;
- environment setup;
- централизованная очистка;
- safety checks;
- global teardown;
- infrastructure smoke test.

Следующие этапы:

- test factories;
- repository integration tests;
- transaction rollback tests;
- service/module integration tests;
- общий Nest integration helper;
- HTTP/E2E helper на том же PostgreSQL contour.
