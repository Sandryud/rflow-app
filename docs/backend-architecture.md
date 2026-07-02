# Backend Architecture

Документ описывает архитектурные границы backend части ReleaseFlow на NestJS.

Главный фокус: структура проекта, ответственность модулей, зависимости, путь запроса, транзакции, audit events, notifications и guards.

## Example Request Flow

### `POST /api/v1/releases/:releaseId/request-review`

Путь запроса:

```text
JWT Guard
-> Membership Guard
-> Permission Guard
-> ReleasesController
-> ReleasesService
-> ChecklistService / ApprovalsService
-> AuditService
-> NotificationsService
-> Database
```

### Step By Step

1. JWT Guard
   - Проверяет, что пользователь авторизован через JWT.
   - Если токен валиден, backend получает текущего пользователя.

2. Membership Guard
   - Находит organization через release -> project -> organization.
   - Проверяет, что пользователь является участником этой organization.

3. Permission Guard
   - Проверяет, может ли роль пользователя выполнить request-review.
   - Owner, Admin и Developer могут выполнить действие.

4. ReleasesController
   - Принимает HTTP-запрос и достаёт releaseId.
   - Передаёт выполнение в ReleasesService.

5. ReleasesService
   - Выполняет бизнес-команду request-review.
   - Проверяет статус release и переводит его из draft в in_review.

6. ChecklistService / ApprovalsService
   - Проверяют условия готовности release к review.
   - Не меняют статус release напрямую.

7. AuditService
   - Создаёт AuditEvent release.review_requested.

8. NotificationsService
   - Создаёт notifications для участников organization.

9. Database
   - Сохраняет изменения в рамках транзакции.

---

## Project Folder Structure

```text
src/
  main.ts
  app.module.ts

  config/
  common/
  database/

  modules/
    auth/
    users/
    organizations/
    memberships/
    projects/
    environments/
    releases/
    checklist/
    approvals/
    comments/
    audit/
    notifications/

test/
  integration/
  e2e/
```

Стандартная структура feature module:

```text
modules/<module-name>/
  dto/
  entities/
  repositories/
  <module-name>.controller.ts
  <module-name>.service.ts
  <module-name>.module.ts
```

---

## Modules

| Module | Responsibility | Main entities |
| ------ | -------------- | ------------- |
| `AuthModule` | Аутентификация, регистрация и выдача JWT. | `User` |
| `UsersModule` | Текущий пользователь и его профиль. | `User` |
| `OrganizationsModule` | Организации, внутри которых живут проекты и участники. | `Organization` |
| `MembershipsModule` | Участники организации и их роли. | `Membership`, `User`, `Organization` |
| `ProjectsModule` | Проекты внутри организации. | `Project` |
| `EnvironmentsModule` | Окружения проекта, например `dev`, `stage`, `prod`. | `Environment` |
| `ReleasesModule` | Релизы проекта, их жизненный цикл и release tasks. | `Release`, `ReleaseTask` |
| `ChecklistModule` | Предрелизные checklist items. | `ChecklistItem` |
| `ApprovalsModule` | Назначение reviewers и решения по approvals. | `Approval` |
| `CommentsModule` | Комментарии участников к release. | `Comment` |
| `AuditModule` | Журнал важных доменных событий. | `AuditEvent` |
| `NotificationsModule` | Уведомления пользователей о важных событиях. | `Notification` |

---

## Module Dependencies

```text
AuthModule -> UsersModule

OrganizationsModule -> MembershipsModule

MembershipsModule -> UsersModule
MembershipsModule -> OrganizationsModule

ProjectsModule -> OrganizationsModule

EnvironmentsModule -> ProjectsModule

ReleasesModule -> ProjectsModule
ReleasesModule -> ChecklistModule
ReleasesModule -> ApprovalsModule
ReleasesModule -> AuditModule
ReleasesModule -> NotificationsModule

ApprovalsModule -> ReleasesModule
ApprovalsModule -> MembershipsModule
ApprovalsModule -> AuditModule
ApprovalsModule -> NotificationsModule

ChecklistModule -> ReleasesModule
ChecklistModule -> MembershipsModule
ChecklistModule -> AuditModule
ChecklistModule -> NotificationsModule

CommentsModule -> ReleasesModule
CommentsModule -> AuditModule
CommentsModule -> NotificationsModule
```

---

## Services Inside Modules

### AuthModule

- `AuthService`
  - регистрирует пользователя;
  - проверяет credentials при login;
  - выдаёт JWT для авторизованного пользователя.

### UsersModule

- `UsersService`
  - возвращает профиль текущего пользователя;
  - обновляет профиль текущего пользователя;
  - предоставляет поиск пользователя для внутренних сценариев других модулей.

### OrganizationsModule

- `OrganizationsService`
  - создаёт organization;
  - возвращает список organizations текущего пользователя;
  - обновляет и удаляет organization по правилам доступа.

### MembershipsModule

- `MembershipsService`
  - добавляет участника в organization;
  - изменяет роль участника;
  - удаляет участника из organization;
  - проверяет membership-ограничения, например правила для Owner/Admin.

### ProjectsModule

- `ProjectsService`
  - создаёт project внутри organization;
  - возвращает проекты organization;
  - обновляет и удаляет project.

### EnvironmentsModule

- `EnvironmentsService`
  - создаёт environment внутри project;
  - возвращает environments project;
  - обновляет и удаляет environment.

### ReleasesModule

- `ReleasesService`
  - отвечает за жизненный цикл release и переходы статусов;
  - выполняет бизнес-команды release: `request-review`, `approve`, `reject`, `release`, `cancel`;
  - координирует проверки checklist и approvals, создание audit events и notifications.

- `ReleaseTasksService`
  - отвечает за release tasks внутри release;
  - создаёт, обновляет и удаляет release tasks;
  - проверяет, что release tasks можно изменять только в разрешённом статусе release.

### ChecklistModule

- `ChecklistService`
  - создаёт, обновляет и удаляет checklist items внутри release;
  - изменяет status/comment checklist item;
  - проверяет checklist-условия, которые нужны release-командам.

### ApprovalsModule

- `ApprovalsService`
  - назначает reviewer для release;
  - выполняет approve, reject и revoke approval;
  - проверяет approval-условия, которые нужны release-командам.

### CommentsModule

- `CommentsService`
  - создаёт comments внутри release;
  - обновляет и удаляет comments;
  - проверяет правила ownership и статус release для изменения comments.

### AuditModule

- `AuditService`
  - создаёт audit events для значимых доменных изменений;
  - возвращает audit events по organization, project или release;
  - не позволяет пользователю создавать, изменять или удалять audit events напрямую.

### NotificationsModule

- `NotificationsService`
  - создаёт notifications для пользователей по доменным событиям;
  - возвращает notifications текущего пользователя;
  - отмечает notification или все notifications пользователя прочитанными.

---

## DTO, Entities And Repositories

### DTO

DTO лежат внутри feature module, который владеет endpoint-ом.

```text
modules/<module-name>/dto/
```

DTO используются для описания входных и выходных данных:

- request DTO описывает тело запроса;
- response DTO описывает данные, которые backend возвращает клиенту;
- DTO не должны содержать бизнес-логику;
- DTO не должны использоваться как database entities.

### Entities / Models

Entities/models лежат внутри feature module, который владеет данными.

```text
modules/<module-name>/entities/
```

Примеры ownership:

- `User` принадлежит `UsersModule`;
- `Organization` принадлежит `OrganizationsModule`;
- `Membership` принадлежит `MembershipsModule`;
- `Project` принадлежит `ProjectsModule`;
- `Environment` принадлежит `EnvironmentsModule`;
- `Release` и `ReleaseTask` принадлежат `ReleasesModule`;
- `ChecklistItem` принадлежит `ChecklistModule`;
- `Approval` принадлежит `ApprovalsModule`;
- `Comment` принадлежит `CommentsModule`;
- `AuditEvent` принадлежит `AuditModule`;
- `Notification` принадлежит `NotificationsModule`.

### Repositories

Repositories лежат рядом с entities внутри feature module.

```text
modules/<module-name>/repositories/
```

Repository отвечает за работу с database:

- инкапсулирует database queries;
- возвращает данные service-слою;
- не принимает HTTP request напрямую;
- не содержит permission logic;
- не принимает бизнес-решения уровня "может ли Developer отправить release на review".

Controller вызывает service, service вызывает repository.

---

## Request Lifecycle

### Write Request

```text
HTTP request
-> JWT Guard
-> Membership Guard
-> Permission Guard
-> Controller
-> Service
-> domain validation
-> transaction
-> Repository
-> AuditService
-> NotificationsService
-> Database
-> response DTO
```

### Read Request

```text
HTTP request
-> JWT Guard
-> Membership Guard
-> Permission Guard
-> Controller
-> Service
-> Repository
-> Database
-> response DTO
```

Write requests can change domain state and may create `AuditEvent` or `Notification`.

Read requests return data and usually do not create `AuditEvent` or `Notification`.

---

## AuditEvent Creation

`AuditEvent` создаёт только backend.

Пользователь не может создавать, изменять или удалять `AuditEvent` напрямую.

`AuditEvent` создаётся для значимых изменений доменной модели:

- изменение organization, membership, project, environment;
- изменение release или его статуса;
- изменение release task;
- изменение checklist item;
- изменение approval;
- изменение comment.

`GET` endpoints обычно не создают `AuditEvent`.

Audit event создаётся в service-слое после успешной бизнес-валидации. Controller не должен создавать audit events напрямую.

Пример для `POST /api/v1/releases/:releaseId/request-review`:

```text
ReleasesService
-> change release status draft -> in_review
-> AuditService creates release.review_requested
```

---

## Notification Creation

`Notification` создаёт только backend.

Пользователь не может создавать notifications напрямую.

`Notification` создаётся, когда пользователю нужно узнать о важном доменном событии или изменении своей роли/ответственности.

Основные случаи:

- пользователя добавили в organization;
- пользователю изменили role в organization;
- пользователя удалили из organization;
- пользователя назначили reviewer;
- approval был approved/rejected/revoked;
- checklist item был назначен пользователю;
- checklist item изменил status;
- появился новый comment;
- release или release task изменились.

Read-only endpoints не создают notifications.

Notification создаётся через `NotificationsService`. Другие модули не должны писать notifications напрямую в database.

Для project-scoped notifications в MVP получателями считаются участники organization, к которой относится project.

---

## Transactions

| Operation | Should use transaction | Reason |
| --------- | :--------------------: | ------ |
| Create organization | Yes | Organization and initial Owner membership must be created together. |
| Add membership | Yes | Membership, audit event and notification must stay consistent. |
| Change membership role | Yes | Membership role change, audit event and notification must stay consistent. |
| Remove membership | Yes | Membership removal, audit event and notification must stay consistent. |
| Create project | Yes | Project and audit event must stay consistent. |
| Update release | Yes | Release update, audit event and notifications must stay consistent. |
| Request review | Yes | Release status, audit event and notifications must stay consistent. |
| Approve approval | Yes | Approval status, audit event and notifications must stay consistent. |
| Change checklist item status | Yes | Checklist item status, audit event and notifications must stay consistent. |
| Create comment | Yes | Comment, audit event and notifications must stay consistent. |

---

## Guards

### JWT Guard

- проверяет, что запрос выполнен авторизованным пользователем с валидным JWT;
- применяется ко всем endpoints, кроме registration и login;
- после успешной проверки добавляет текущего пользователя в request context.

### Membership Guard

- проверяет, что текущий пользователь является участником organization, к которой относится запрашиваемый ресурс;
- умеет находить organization через разные route params: `organizationId`, `projectId`, `releaseId`, `commentId` и другие вложенные ресурсы;
- если пользователь авторизован, но не состоит в нужной organization, запрос завершается `403 Forbidden`.

### Permission Guard

- проверяет, может ли роль текущего membership выполнить конкретное action;
- использует permission matrix, где правила описаны как role + action;
- например, для `request-review` действие разрешено `Owner`, `Admin` и `Developer`, но запрещено `Reviewer`;
- проверяет общее право на действие, а сложные бизнес-условия остаются в service-слое.

### Other Guards

На текущем этапе обязательными являются `JWT Guard`, `Membership Guard` и `Permission Guard`.

Новые guards добавляются только если появляется отдельная cross-cutting проверка, которую нельзя корректно выразить через service validation или существующие guards.

---

## Architecture Rules

- Controller отвечает только за HTTP-слой: params, body, current user и вызов service.
- Guards отвечают за authentication, membership context и permission checks.
- Service отвечает за бизнес-логику, бизнес-валидацию и координацию связанных сервисов.
- Repository отвечает за database queries и не содержит permission logic.
- DTO описывают входные и выходные данные, но не являются database entities.
- Status release меняется только через отдельные бизнес-команды, а не через общий update endpoint.
- `AuditEvent` и `Notification` создаются backend-ом через соответствующие services.
- Read-only endpoints обычно не создают `AuditEvent` и `Notification`.
- Cross-module writes должны выполняться через service модуля-владельца.
- Транзакции используются для бизнес-команд, где несколько изменений должны сохраняться согласованно.
