# Integration-тесты модуля `auth`

Документ является планом реализации integration-тестов для
[`src/modules/auth`](../../../src/modules/auth). Общие правила feature-тестов
описаны в [writing-tests.md](./writing-tests.md), а устройство PostgreSQL-контура —
в [architecture.md](./architecture.md).

## Цель

Тесты должны доказать бизнес-контракт регистрации, входа и использования
выданного access token на реальных:

- Nest providers модуля `AuthModule`;
- `PrismaService` и PostgreSQL;
- unique constraint `User.email`;
- `bcrypt`;
- `JwtService`, `JwtStrategy` и `JwtAuthGuard`;
- DTO transformation и validation;
- HTTP routes, versioning, global pipe и exception filter.

Внутренние providers `AuthRepository`, `AuthPasswordService` и
`AuthTokenService` не подменяются. Иначе тест не проверит совместную работу
database, password hashing и JWT.

Под словом «авторизация» в этом документе понимаются вход пользователя и
проверка bearer token. Role-based access control не входит в `AuthModule` и
относится к integration-тестам соответствующих feature-модулей.

## Фактический контракт модуля

### Регистрация

`AuthService.register`:

1. приводит email к lowercase;
2. ищет пользователя по нормализованному email;
3. возвращает `ConflictException`, если пользователь найден;
4. хеширует пароль через `bcrypt` с cost factor `12`;
5. создаёт `User`;
6. возвращает только `id`, `name`, `email`.

HTTP DTO дополнительно удаляет пробелы по краям `email` и `name`. Пароль не
trim-ится.

### Вход

`AuthService.login`:

1. приводит email к lowercase;
2. находит `User` по email;
3. сравнивает переданный пароль с `passwordHash`;
4. для отсутствующего пользователя и неверного пароля возвращает одинаковый
   `UnauthorizedException('Invalid email or password')`;
5. подписывает JWT с payload `{ sub: user.id, email: user.email }`;
6. возвращает access token и публичные поля пользователя.

HTTP DTO удаляет пробелы только по краям email. Пароль передаётся без
преобразования.

### Access token

`JwtStrategy`:

- извлекает JWT из `Authorization: Bearer <token>`;
- проверяет подпись через `JWT_SECRET`;
- отклоняет истёкший token;
- преобразует payload в `request.user` вида
  `{ userId: payload.sub, email: payload.email }`.

Стратегия не загружает пользователя из database и не реализует отзыв token.
Проверка существования или активности пользователя не должна молча добавляться
в эти тесты без отдельного изменения production-контракта.

## Границы и расположение specs

Тесты разделены по наблюдаемым контрактам:

```text
test/integration/auth/
  auth.service.integration-spec.ts
  auth.register.http.integration-spec.ts
  auth.login.http.integration-spec.ts
  auth.jwt-guard.integration-spec.ts

  support/
    auth-http.assertions.ts
    auth-payload.factory.ts
    auth-test-app.ts
    user.factory.ts
```

| Spec                                     | Subject          | Что доказывает                                        |
| ---------------------------------------- | ---------------- | ----------------------------------------------------- |
| `auth.service.integration-spec.ts`       | `AuthService`    | PostgreSQL, bcrypt, JWT и service business rules      |
| `auth.register.http.integration-spec.ts` | `POST /register` | routing, DTO, status, response и persisted state      |
| `auth.login.http.integration-spec.ts`    | `POST /login`    | credentials, DTO, JWT response и error contract       |
| `auth.jwt-guard.integration-spec.ts`     | `JwtAuthGuard`   | совместимость выданного token с Passport JWT strategy |

Это не E2E всего приложения: каждый spec собирает минимальный Nest graph только
для `auth`.

## Предварительное изменение bootstrap

В `main.ts` сейчас inline настраиваются:

- global prefix `api`;
- URI versioning с default version `1`;
- `ValidationPipe`;
- `HttpExceptionFilter`.

Для HTTP integration specs эту конфигурацию нужно вынести в
общий production/test helper, как требует
[writing-tests.md](./writing-tests.md#http-feature-integration). Например:

```text
src/
  configure-app.ts
  main.ts
```

Минимальный контракт helper:

```ts
import {
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

import { HttpExceptionFilter } from '@common/filters/http-exception.filter';

export const configureApp = (app: INestApplication): void => {
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
};
```

`main.ts` вызывает `configureApp(app)` до Swagger setup и `listen`. Integration
spec вызывает тот же helper до `app.init()`. Swagger в minimal test application
подключать не нужно.

Не копируйте bootstrap options непосредственно в spec: тест может продолжить
проходить после расхождения production и test configuration.

## Общий TestingModule

Worker setup уже устанавливает безопасные значения:

```text
JWT_SECRET=rflow-integration-test-secret
JWT_ACCESS_EXPIRES_IN=15m
DATABASE_URL=<worker database>
```

Общая конфигурация вынесена в auth-local helper:

```ts
const moduleRef = await createAuthTestingModule();

await moduleRef.init();

const prisma = moduleRef.get(PrismaService);
const authService = moduleRef.get(AuthService);
const jwtService = moduleRef.get(JwtService);
```

Lifecycle создаётся один раз на файл:

```ts
beforeAll(async () => {
  // compile, init, get providers
});

afterAll(async () => {
  await moduleRef.close();
});
```

Global integration hook очищает domain tables перед каждым `it`. В auth specs не
должно быть `deleteMany`, `TRUNCATE`, очистки в `afterEach` или собственного
container.

## Test data

Пользователей для login arrange нужно создавать независимо от
`AuthService.register`, иначе одна операция под тестом станет fixture builder для
другой.

Factory, общую для трёх auth specs, следует хранить локально для feature:

```text
test/integration/auth/support/user.factory.ts
```

Реализация:

```ts
import * as bcrypt from 'bcrypt';

type UserOverrides = Partial<{
  email: string;
  name: string;
  password: string;
}>;

const createUser = async (
  prisma: PrismaService,
  overrides: UserOverrides = {},
) => {
  const password = overrides.password ?? 'password123';
  const passwordHash = await bcrypt.hash(password, 4);

  return prisma.user.create({
    data: {
      email: overrides.email ?? 'jane@example.com',
      name: overrides.name ?? 'Jane Doe',
      passwordHash,
    },
  });
};
```

Низкий cost factor допустим только для fixture: subject при регистрации всё равно
использует production factor `12`. Проверять корректность fixture-хеша нужно
поведением login, а не точным значением hash.

Если factory понадобится другим features, её следует перенести в
`test/integration/support/factories/user.factory.ts`.

## Матрица обязательных сценариев

### `auth.service.integration-spec.ts`

#### Регистрация

| ID   | Сценарий                          | Arrange / Act                                                | Обязательные assertions                                                                                                                                                           |
| ---- | --------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-S1 | Успешная регистрация              | `register` с mixed-case email                                | result содержит только `id`, `name`, `email`; email в result и БД lowercase; в БД ровно один user; `passwordHash !== password`; `bcrypt.compare(password, passwordHash) === true` |
| R-S2 | Дубликат без учёта регистра email | В БД есть `jane@example.com`, регистрация `JANE@EXAMPLE.COM` | `ConflictException` с публичным сообщением; user count остаётся `1`; исходная запись и hash не изменены                                                                           |
| R-S3 | Конкурентный дубликат             | Два одновременных `register` одного email                    | один fulfilled result, один rejected `PrismaClientKnownRequestError` с кодом `P2002`; в БД ровно один user с email                                                                |

R-S1 не должен проверять полный UUID, timestamps или точную строку bcrypt hash.
Для проверки отсутствия private fields используйте exact keys или
`toStrictEqual`, а не только частичный `toMatchObject`.

R-S3 запускается обычным `it`, внутри которого используется `Promise.allSettled`.
Не используйте `test.concurrent`: cases одного spec разделяют worker database.

#### Вход

| ID   | Сценарий                   | Arrange / Act                                         | Обязательные assertions                                                                                                             |
| ---- | -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| L-S1 | Успешный вход              | User с реальным bcrypt hash; login с mixed-case email | возвращены token и публичный user; `passwordHash` отсутствует; JWT валиден с test secret; `sub === user.id`; `email === user.email` |
| L-S2 | Пользователь не существует | Login с валидным по форме, отсутствующим email        | `UnauthorizedException`; сообщение `Invalid email or password`; token не возвращён; БД не изменилась                                |
| L-S3 | Пароль неверен             | User существует, передан другой password              | тот же тип и то же сообщение, что в L-S2; сохранённый hash не изменён                                                               |
| L-S4 | Пароль не нормализуется    | Hash создан для `' password123 '`                     | точный пароль с пробелами успешно входит; `'password123'` получает `UnauthorizedException`                                          |

L-S2 и L-S3 намеренно проверяют одинаковый внешний ответ. Это защита от
user-enumeration: API не раскрывает, существует ли email.

Для L-S1 token проверяется криптографически:

```ts
const payload = await jwtService.verifyAsync(result.accessToken);

expect(payload).toMatchObject({
  sub: user.id,
  email: user.email,
});
expect(payload.exp - payload.iat).toBe(15 * 60);
```

Не сравнивайте полный token с фиксированной строкой: он зависит от `iat`.

### HTTP integration specs

HTTP application:

```ts
const app = await createAuthTestApp();
```

`createAuthTestApp` использует тот же `createAuthTestingModule`, вызывает
production `configureApp` и инициализирует Nest application. Valid payloads
собираются через `buildRegisterPayload` и `buildLoginPayload`: добавление нового
обязательного поля потребует изменить один default object, а не каждый
validation case.

Все запросы направляются на production paths:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
```

#### HTTP business contract

| ID   | Сценарий                                                                                 | Ожидаемый HTTP contract                                                                                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R-H1 | Регистрация с пробелами в `name`, `email`, password и mixed-case email                   | `201`; response содержит trimmed name и lowercase email; private fields отсутствуют; БД содержит те же нормализованные значения; bcrypt hash принимает только исходный password со значимыми пробелами |
| R-H2 | Повторная регистрация normalized email                                                   | `409`; message `User with this email already exists`; в БД остаётся один user                                                                                                                          |
| L-H1 | Вход с пробелами вокруг email, mixed-case email и точным password со значимыми пробелами | `201` — текущий Nest contract `@Post` без `@HttpCode(200)`; response содержит `accessToken` и public user; token payload связан с persisted user                                                       |
| L-H2 | Вход с неизвестным email                                                                 | `401`; message `Invalid email or password`                                                                                                                                                             |
| L-H3 | Вход с неверным password                                                                 | HTTP body L-H2 и L-H3 совпадает по `statusCode`, `message`, `error`; различаться могут только `path` и `timestamp`                                                                                     |

Документация endpoint сейчас указывает для login статус `200`, но фактический
controller возвращает Nest default `201` для `@Post`. Integration test фиксирует
текущее поведение без изменения production-модуля. Переход на `200` требует
отдельной задачи: добавить `@HttpCode(HttpStatus.OK)`, обновить endpoint docs и
изменить expected status в HTTP spec.

Для response mutation недостаточно проверить только status. После R-H1 user
повторно читается через `PrismaService`, и отдельно проверяются:

- `name`;
- `email`;
- отсутствие plaintext password;
- совместимость `passwordHash` с исходным password.

`HttpExceptionFilter` добавляет динамический `timestamp`. Проверяйте, что это
валидная ISO date, но не фиксируйте точное значение и не snapshot-ьте весь body.

#### DTO validation

Validation cases оформляются через `describe.each` или `it.each`. Каждый invalid
register case должен возвращать `400` и оставлять `prisma.user.count()` равным
нулю.

Регистрация:

| Поле       | Invalid partitions                                                                  |
| ---------- | ----------------------------------------------------------------------------------- |
| `email`    | отсутствует; не строка; whitespace-only; неверный email format                      |
| `name`     | отсутствует; не строка; whitespace-only; 1 символ после trim; 101 символ после trim |
| `password` | отсутствует; не строка; пустая строка; 5 символов; 129 символов                     |
| payload    | содержит неизвестное поле при корректных остальных полях                            |

Login cases возвращают `400` и не должны возвращать `accessToken`:

| Поле       | Invalid partitions                                              |
| ---------- | --------------------------------------------------------------- |
| `email`    | отсутствует; не строка; whitespace-only; неверный email format  |
| `password` | отсутствует; не строка; пустая строка; 5 символов; 129 символов |
| payload    | содержит неизвестное поле при корректных остальных полях        |

Для каждого validation case достаточно проверять:

```ts
expect(response.body).toMatchObject({
  statusCode: 400,
  error: 'Bad Request',
  path: expectedPath,
});
expect(response.body.message).toEqual(expect.any(Array));
```

Не фиксируйте полный текст сообщений `class-validator`: integration contract
здесь состоит в отклонении partition и отсутствии mutation. Точные decorator
messages не являются бизнес-логикой приложения.

Границы `name` длиной `2` и `100`, а также password длиной `6` и `128` являются
валидными. Добавьте два table-driven HTTP cases: один одновременно использует
минимальные границы, второй — максимальные. Оба запроса должны вернуть `201` и
создать валидного пользователя. Так не понадобятся четыре одинаковых
registration flow.

### `auth.jwt-guard.integration-spec.ts`

В spec создаётся только test controller, предоставляющий наблюдаемую защищённую
route:

```ts
@Controller('auth-test')
class ProtectedTestController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: RequestWithUser) {
    return request.user;
  }
}
```

Controller передаётся в общий helper:

```ts
const app = await createAuthTestApp([ProtectedTestController]);
```

Endpoint доступен по:

```text
GET /api/v1/auth-test/me
```

| ID  | Сценарий                          | Обязательные assertions                                    |
| --- | --------------------------------- | ---------------------------------------------------------- |
| J-1 | Token, выданный успешным login    | `200`; body равен `{ userId: user.id, email: user.email }` |
| J-2 | Header отсутствует                | `401`; handler не выполняет бизнес-действие                |
| J-3 | Token подписан другим secret      | `401`                                                      |
| J-4 | Token истёк                       | `401`                                                      |
| J-5 | Header не имеет bearer JWT format | `401`                                                      |

Для J-1 token нужно получить через настоящий `AuthService.login`, а не подписать
вручную. Так тест докажет сквозной контракт `AuthTokenService` → `JwtStrategy`.

Для J-3 и J-4 допустимо создать token отдельным `JwtService`, потому что создание
невалидного внешнего input является arrange, а не подменой subject:

```ts
const invalidIssuer = new JwtService({ secret: 'different-test-secret' });
const wrongSignatureToken = await invalidIssuer.signAsync({
  sub: user.id,
  email: user.email,
});

const expiredToken = await jwtService.signAsync(
  { sub: user.id, email: user.email },
  { expiresIn: -1 },
);
```

Не добавляйте `sleep` для expiration test.

## Известный production gap: конкурентная регистрация

Сейчас `AuthService.register` выполняет read-before-write:

```text
findUnique(email) -> bcrypt.hash(password) -> user.create(...)
```

Два параллельных запроса могут оба не найти пользователя. PostgreSQL корректно
отклонит второй `INSERT` по unique constraint, но Prisma error `P2002` сейчас не
преобразуется в `ConflictException`. Внешний результат второго запроса будет
`500`, хотя бизнес-контракт дубликата требует `409`.

В текущем scope production code не изменяется. R-S3 фиксирует фактический
database contract: один `INSERT` успешен, второй отклоняется `P2002`, в таблице
остаётся одна строка. Это делает race condition наблюдаемым, не выдавая `P2002`
за желаемый публичный API contract.

Преобразование `P2002` в `ConflictException` следует выполнять отдельной
production-задачей. После такого изменения R-S3 нужно обновить: rejection должен
стать `ConflictException`, а HTTP-сценарий — возвращать `409`.

Проверка `findUnique` может остаться как fast path, но database constraint
является окончательной защитой инварианта.

## Что оставить unit-тестам

Integration suite не должна повторять assertions по внутренним вызовам из
`src/modules/auth/tests`.

В unit-тестах остаются:

- точный вызов `bcrypt.hash(password, 12)`;
- точный вызов repository methods и порядок orchestration;
- прямой unit contract `JwtStrategy.validate`;
- отдельные редкие ветки DTO decorators, если они не меняют HTTP contract.

В integration-тестах проверяется наблюдаемый результат:

- реальный hash принимает исходный password;
- реальный token проверяется с ожидаемым payload и TTL;
- реальные rows созданы или не изменены;
- внешний exception/HTTP response соответствует бизнес-правилу.

## Не закреплять без решения продукта

Текущие decorators позволяют password из шести пробелов: password не trim-ится,
`IsNotEmpty` считает такую строку непустой, а `MinLength(6)` — достаточно длинной.

Это потенциальный password-policy gap. До решения продукта:

- обязательно проверяйте сохранение значимых пробелов сценарием L-S4;
- не добавляйте отдельный test, утверждающий, что whitespace-only password
  является желаемым контрактом;
- после ужесточения policy добавьте HTTP negative case и сохраните отсутствие
  trim, если пробелы разрешены как часть непустого password.

## Порядок реализации

1. Вынести `configureApp` и подключить его в `main.ts`.
2. Добавить local user factory.
3. Реализовать service scenarios R-S1, R-S2 и L-S1–L-S4.
4. Добавить R-S3 и убедиться, что он воспроизводит необработанный `P2002`.
5. Реализовать HTTP business и validation scenarios.
6. Реализовать protected test controller и JWT guard scenarios.
7. Запустить каждый spec отдельно, затем весь integration suite.
8. Запустить unit tests, lint и typecheck.

## Команды

Service:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/auth/auth.service.integration-spec.ts
```

Register HTTP:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/auth/auth.register.http.integration-spec.ts
```

Login HTTP:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/auth/auth.login.http.integration-spec.ts
```

JWT guard:

```bash
npm run test:integration -- --runTestsByPath \
  test/integration/auth/auth.jwt-guard.integration-spec.ts
```

Полный integration suite:

```bash
npm run test:integration
```

Финальные проверки:

```bash
npm run test:unit
npm run lint
npm run typecheck
```

## Definition of Done

- [ ] Реальные `PrismaService`, PostgreSQL, bcrypt и JWT не подменены.
- [ ] Успешная регистрация проверена по response и persisted state.
- [ ] Email trim/lowercase проверены на соответствующих HTTP/service boundaries.
- [ ] Пароль никогда не появляется в response и не хранится как plaintext.
- [ ] Duplicate email возвращает conflict и не изменяет исходного пользователя.
- [ ] Конкурентный duplicate приводит к одному success, одному `P2002` и одной
      строке в БД; production gap явно задокументирован.
- [ ] Успешный login выдаёт token с правильными `sub`, `email` и TTL.
- [ ] Неизвестный email и неверный password неразличимы для клиента.
- [ ] Значимые пробелы password не теряются.
- [ ] Register/login DTO partitions возвращают `400`.
- [ ] Минимальные и максимальные допустимые DTO boundaries принимаются.
- [ ] Unknown payload fields отклоняются.
- [ ] Выданный login token принимается `JwtAuthGuard`.
- [ ] Missing, malformed, expired и wrong-signature tokens отклоняются.
- [ ] Каждый mutation/negative case независимо проверяет database state.
- [ ] Specs не используют ручную очистку, `test.concurrent`, `sleep` или snapshots.
- [ ] Отдельные specs и полный integration suite проходят.
