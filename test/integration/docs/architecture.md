# Архитектура integration-контура

Документ описывает инфраструктуру integration-тестов ReleaseFlow на Jest, NestJS,
Prisma и настоящем PostgreSQL.

Инструкции по созданию feature-тестов вынесены в
[writing-tests.md](./writing-tests.md).

## Цели архитектуры

Контур должен:

- запускаться одинаково локально и в CI;
- не зависеть от developer database;
- применять committed Prisma migrations;
- поддерживать параллельные Jest workers;
- изолировать данные разных workers;
- предоставлять пустые domain tables перед каждым `it`;
- завершать PostgreSQL и удалять временный state после suite;
- прекращать выполнение до destructive SQL при небезопасном окружении.

## Зависимости и требования

Dev dependency:

```text
@testcontainers/postgresql
```

Для запуска нужны:

- установленные npm dependencies;
- Docker Desktop или другой Docker-compatible runtime;
- доступ к Docker daemon.

Запускать `docker compose up` и вручную создавать test database не нужно.
Integration-контур не использует volume и fixed port из developer
`docker-compose.yml`.

## Команды

Основной запуск:

```bash
npm run test:integration
```

Диагностический последовательный запуск:

```bash
npm run test:integration:serial
```

Последовательный режим использует `--runInBand`. Он предназначен для поиска flaky
tests, открытых handles и различий между последовательным и параллельным
выполнением. Обычный режим должен оставаться параллельным.

## Файлы контура

```text
test/
  integration/
    database/
      database-contour.integration-spec.ts

    docs/
      README.md
      architecture.md
      writing-tests.md

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
| `jest-integration.config.ts`           | Выбирает integration specs и подключает lifecycle             |
| `global-setup.ts`                      | Запускает PostgreSQL, создаёт template и применяет migrations |
| `global-teardown.ts`                   | Останавливает container и удаляет временный state             |
| `worker-setup.ts`                      | Создаёт database текущего Jest worker и устанавливает env     |
| `jest-hooks.ts`                        | Проверяет окружение и очищает domain tables перед каждым `it` |
| `container-state.ts`                   | Описывает state, формирует URL и выполняет safety validation  |
| `test-database-manager.ts`             | Выполняет administrative SQL и очистку worker database        |
| `database-contour.integration-spec.ts` | Проверяет infrastructure contract                             |

## Топология PostgreSQL

На один запуск Jest создаётся один ephemeral container:

```text
postgres:16-alpine
```

В container находятся:

```text
rflow_it_control
  |
  +-- rflow_it_template
  |
  +-- rflow_it_<runId>_w1
  +-- rflow_it_<runId>_w2
  +-- ...
```

### Control database

`rflow_it_control` создаётся вместе с container и используется только для
administrative queries:

- `CREATE DATABASE`;
- `ALTER DATABASE`;
- клонирование worker databases.

Application code и feature tests к control database не подключаются.

### Template database

`rflow_it_template` создаётся один раз во время global setup.

Для неё выполняется:

```bash
npm exec prisma -- migrate deploy
```

В процесс миграции передаётся `DATABASE_URL` template database. Схема создаётся
только из `prisma/migrations`; `prisma db push` не используется.

После migrations template закрывается для новых соединений:

```sql
ALTER DATABASE "rflow_it_template"
WITH IS_TEMPLATE TRUE ALLOW_CONNECTIONS FALSE;
```

Template остаётся неизменяемой и используется только как источник клонирования.

### Worker database

Каждый Jest worker получает database:

```text
rflow_it_<runId>_w<JEST_WORKER_ID>
```

Пример:

```text
rflow_it_a14f3b9c2d11_w2
```

Она создаётся из готовой template:

```sql
CREATE DATABASE "rflow_it_a14f3b9c2d11_w2"
WITH OWNER "rflow_test"
TEMPLATE "rflow_it_template";
```

Преимущества:

- migrations применяются один раз на Jest run;
- разные workers не изменяют данные друг друга;
- `TRUNCATE` одного worker не блокирует tests другого;
- количество containers не растёт вместе с количеством test files.

## Lifecycle запуска

```text
npm run test:integration
          |
          v
Jest читает jest-integration.config.ts
          |
          v
globalSetup
  -> start PostgreSQL container
  -> create template database
  -> prisma migrate deploy
  -> seal template
  -> write container state
          |
          v
workerSetup
  -> read state
  -> create database from template
  -> set DATABASE_URL and test env
          |
          v
setupFilesAfterEnv
  -> register safety beforeAll
  -> register cleanup beforeEach
          |
          v
integration test files
          |
          v
globalTeardown
  -> stop container
  -> remove state
```

### Jest configuration

`test/jest-integration.config.ts` выбирает:

```ts
testMatch: ['<rootDir>/test/integration/**/*.integration-spec.ts'];
```

Конфигурация задаёт:

- Node test environment;
- global setup и teardown;
- worker setup через `setupFiles`;
- common hooks через `setupFilesAfterEnv`;
- два workers в CI;
- `50%` доступных CPU локально;
- `maxConcurrency: 1`;
- timeout test case — 30 секунд;
- TypeScript transform и project aliases.

`maxConcurrency` относится к `test.concurrent`. Обычные tests внутри одного file
Jest выполняет последовательно.

### Global setup

`global-setup.ts`:

1. устанавливает `NODE_ENV=test`;
2. запускает `PostgreSqlContainer`;
3. генерирует 12-символьный `runId`;
4. собирает connection state;
5. создаёт template database;
6. запускает `prisma migrate deploy`;
7. закрывает template для соединений;
8. сохраняет сериализуемый state.

Testcontainers назначает случайный свободный host port. Контур не конфликтует с
локальным PostgreSQL на `5432`.

Если template или migrations создать не удалось, setup останавливает уже запущенный
container и возвращает исходную ошибку Jest.

### Передача state

Jest global setup и test environments используют разные global scopes. Объект
`StartedPostgreSqlContainer` нельзя передать непосредственно в worker.

Передаётся сериализуемый state:

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

Он записывается в:

```text
<os.tmpdir>/rflow-integration-<random>/container-state.json
```

Права файла — `0600`. Путь передаётся через:

```text
RFLOW_INTEGRATION_CONTAINER_STATE_PATH
```

Connection URL и password не выводятся в logs.

### Worker setup

`worker-setup.ts` выполняется до импорта test file:

1. читает container state;
2. получает `JEST_WORKER_ID`;
3. строит worker database name;
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

Environment устанавливается до импорта `AppModule`, feature modules и
`PrismaService`. Поэтому все Nest providers используют worker database, а не
developer `.env`.

Один worker может выполнить несколько test files. Повторное создание его database
безопасно обрабатывается по PostgreSQL error code `42P04`.

### Common hooks

`jest-hooks.ts` регистрирует:

- `beforeAll` для проверки test environment;
- `beforeEach` для очистки worker database.

До destructive SQL проверяется:

- `JEST_WORKER_ID` существует;
- database name соответствует `runId` и worker ID;
- `NODE_ENV === 'test'`;
- `POSTGRES_DB` совпадает с ожидаемой worker database.

### Очистка между test cases

Перед каждым `it` `TestDatabaseManager` сначала выполняет:

```sql
SELECT current_database();
```

Имя должно точно совпасть с ожидаемой worker database. Затем выполняется:

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

`_prisma_migrations` не очищается.

`CASCADE` учитывает foreign keys. `RESTART IDENTITY` сбрасывает sequences, если они
появятся в схеме.

Общая transaction с rollback после test case не используется: Nest application и
test helpers могут работать через разные connections Prisma pool, которые не
участвуют в одной внешней transaction.

### Global teardown

`global-teardown.ts`:

1. останавливает PostgreSQL container;
2. удаляет state file;
3. удаляет временную директорию;
4. очищает global references и state environment variable.

Control, template и worker databases уничтожаются вместе с ephemeral container.

## Safety

Database name должно:

- начинаться с `rflow_it_`;
- соответствовать `/^[a-z][a-z0-9_]{0,62}$/`;
- строиться только infrastructure helper-ом.

State validation проверяет:

- `runId` из 12 hexadecimal символов;
- непустые host, username и password;
- положительный integer port;
- безопасные control и template database names.

Teardown удаляет только `container-state.json` внутри директории с ожидаемым
`rflow-integration-` prefix.

Эти ограничения защищают development и production databases от случайного
`TRUNCATE`.

## Infrastructure smoke test

`database-contour.integration-spec.ts` проверяет:

- наличие `DATABASE_URL`;
- совпадение фактической database с `POSTGRES_DB`;
- наличие таблицы `User`;
- наличие `_prisma_migrations`.

Smoke test должен оставаться в suite. Он помогает отличить infrastructure failure от
ошибки feature-теста.

## Изменение Prisma schema

При добавлении или удалении Prisma model:

1. создать committed migration;
2. проверить migration на пустой PostgreSQL;
3. обновить `DOMAIN_TABLES` в `test-database-manager.ts`;
4. запустить infrastructure smoke test;
5. запустить весь integration suite.

Если новую table не добавить в `DOMAIN_TABLES`, её данные сохранятся между test
cases.

## CI

Integration job должен:

- иметь Docker-compatible runtime;
- устанавливать npm dependencies;
- выполнять `npm run test:integration`;
- не поднимать отдельный PostgreSQL service;
- не использовать production secrets;
- не делить container с другим job или shard.

В CI Jest использует не более двух workers. Ограничение следует менять только после
измерения потребления CPU, RAM и PostgreSQL connections.

## Диагностика

### Testcontainers не находит runtime

Ошибка:

```text
Could not find a working container runtime strategy
```

Проверить:

```bash
docker info
```

Docker daemon должен быть запущен и доступен текущему пользователю.

### Не применяются migrations

Проверить:

- migration SQL;
- порядок migrations;
- совместимость с PostgreSQL 16;
- отсутствие ручных изменений существующей migration history.

Не заменять `migrate deploy` на `db push`.

### Safety validation останавливает suite

Ошибки `Unsafe integration database name` и
`Unsafe integration test database environment` означают, что database name или
`process.env` были изменены вне infrastructure setup.

### Ошибка очистки

Проверить:

- все ли Prisma models добавлены в `DOMAIN_TABLES`;
- нет ли незавершённой долгой transaction;
- указывает ли connection на worker database.

### Jest не завершается

Проверить закрытие:

- `TestingModule`;
- `INestApplication`;
- вручную созданных `pg.Client`;
- timers и внешних clients.

Диагностическая команда:

```bash
npm run test:integration -- --runInBand --detectOpenHandles
```

Не добавлять `--forceExit` в основной script.

## Источники

- [NestJS testing](https://docs.nestjs.com/fundamentals/testing)
- [Prisma integration testing](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
- [Prisma Migrate environments](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/)
- [Testcontainers global setup](https://node.testcontainers.org/quickstart/global-setup/)
- [Jest configuration](https://jestjs.io/docs/30.0/configuration)
- [PostgreSQL TRUNCATE](https://www.postgresql.org/docs/16/sql-truncate.html)
