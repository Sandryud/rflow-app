# API Permission Matrix

Обозначения:

- `A` = Allow
- `D` = Deny

Состояния пользователя:

- `Anonymous` — пользователь без JWT.
- `Authenticated` — пользователь с JWT; действие не зависит от роли в конкретной `Organization`.
- `Non-member` — пользователь с JWT, но без `Membership` в конкретной `Organization`.
- `Owner`, `Admin`, `Developer`, `Reviewer` — роли `Membership` внутри конкретной `Organization`.

## Global Permissions

Действия, которые не требуют существующей `Organization` или не проверяются через роль внутри организации.

| Действие | Anonymous | Authenticated | Комментарий |
| -------- | :-------: | :-----------: | ----------- |
| Зарегистрироваться | A | A | Можно обновить/заменить текущую сессию; UI может сначала сделать logout |
| Войти в систему | A | A | Можно обновить/заменить текущую сессию; UI может сначала сделать logout |
| Получить свой профиль | D | A | Получить свой профиль может только авторизованный пользователь |
| Изменить свой профиль | D | A | Изменить свой профиль может только авторизованный пользователь |
| Получить список пользователей | D | D | Публичный список всех пользователей не доступен в MVP |
| Создать организацию | D | A | Создать организацию может только авторизованный пользователь |
| Получить список своих организаций | D | A | Получить список своих организаций может только авторизованный пользователь |
| Получить свои notifications | D | A | Получить свои notifications может только авторизованный пользователь |
| Отметить notification прочитанным | D | A | Отметить notification прочитанным может только авторизованный пользователь |
| Отметить все notifications прочитанными | D | A | Отметить все notifications прочитанными может только авторизованный пользователь |

---

## Organization Role Permissions

Действия, которые проверяются через `Membership` пользователя в конкретной `Organization`.

### OrganizationsModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Получить организацию | A | A | A | A | D | Организация доступна участникам организации. |
| Изменить организацию | A | D | D | D | D | Организацию может изменить только Owner. |
| Удалить организацию | A | D | D | D | D | Организацию может удалить только Owner; используется soft delete. |

---

### MembershipsModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Добавить участника | A | A | D | D | D | Owner может добавить Owner/Admin/Developer/Reviewer.<br>Admin может добавить только Developer/Reviewer. |
| Получить список участников | A | A | A | A | D | |
| Получить участника | A | A | A | A | D | |
| Изменить роль участника | A | A | D | D | D | Owner может назначать Owner/Admin/Developer/Reviewer.<br>Owner не может понизить свою роль, если он единственный Owner в организации.<br>Admin может назначать только Developer/Reviewer.<br>Admin не может назначать Owner/Admin.<br>Admin не может менять роль Owner/Admin.<br>Admin не может менять свою роль. |
| Удалить участника | A | A | D | D | D | Admin не может удалить Owner/Admin; Admin не может удалить себя.<br>Owner не может удалить себя, если он является единственным Owner в организации. |

---

### ProjectsModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Создать проект | A | A | D | D | D | Новый проект может создать Owner или Admin. |
| Получить список проектов | A | A | A | A | D | Список проектов доступен участникам организации. |
| Получить проект | A | A | A | A | D | Проект доступен участникам организации. |
| Изменить проект | A | A | D | D | D | Проект может изменить Owner или Admin. |
| Удалить проект | A | A | D | D | D | Проект может удалить Owner или Admin; используется soft delete, связанные сущности сразу не удаляются. |

---

### EnvironmentsModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Создать environment | A | A | D | D | D | Environment может создать Owner или Admin. |
| Получить список environments | A | A | A | A | D | Список environments доступен участникам организации. |
| Получить environment | A | A | A | A | D | Environment доступен участникам организации. |
| Изменить environment | A | A | D | D | D | Environment может изменить Owner или Admin. |
| Удалить environment | A | A | D | D | D | Environment может удалить Owner или Admin; используется soft delete. |

---

### ReleasesModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Создать release | A | A | D | D | D | Release может создать Owner или Admin. |
| Получить список releases | A | A | A | A | D | Список releases доступен участникам организации. |
| Получить release | A | A | A | A | D | Release доступен участникам организации. |
| Изменить release | A | A | A | D | D | Release может изменить Owner, Admin или Developer; только пока release в статусе draft. |
| Удалить release | A | A | A | D | D | Release может удалить Owner, Admin или Developer; только пока release в статусе draft. |
| Отправить release на review | A | A | A | D | D | Статус меняется только через бизнес-команду; доступно Owner, Admin или Developer. |
| Approve release | A | A | D | A | D | Approve доступен Owner, Admin и назначенным reviewers. |
| Reject release | A | A | D | A | D | Reject доступен Owner, Admin и назначенным reviewers. |
| Mark release as released | A | A | D | D | D | Финальный release выполняет Owner или Admin после необходимых approvals. |
| Cancel release | A | A | A | D | D | Cancel доступен Owner, Admin или Developer до финального release. |
| Создать release task | A | A | A | D | D | Release task может создать Owner, Admin или Developer; только пока release в статусе draft. |
| Получить список release tasks | A | A | A | A | D | Список release tasks доступен участникам организации. |
| Изменить release task | A | A | A | D | D | Release task может изменить Owner, Admin или Developer; только пока release в статусе draft. |
| Удалить release task | A | A | A | D | D | Release task может удалить Owner, Admin или Developer; только пока release в статусе draft. |

---

### ChecklistModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Создать checklist item | A | A | A | D | D | Только пока release в статусе draft. |
| Получить список checklist items | A | A | A | A | D | Список checklist items доступен участникам организации. |
| Изменить checklist item | A | A | A | D | D | Только пока release в статусе draft. |
| Изменить статус checklist item | A | A | A | A | D | Reviewer может менять только status/comment, не структуру checklist item. |
| Удалить checklist item | A | A | A | D | D | Только пока release в статусе draft. |

---

### ApprovalsModule

В этом модуле `reviewer` означает пользователя, назначенного в конкретный `Approval`, а не обязательно `Membership.role = Reviewer`.

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Назначить reviewer | A | A | D | D | D | Reviewer должен быть участником организации; creator не может быть единственным approving reviewer. |
| Получить список approvals | A | A | A | A | D | Список approvals доступен участникам организации. |
| Approve approval | A | A | A | A | D | Только назначенный reviewer. |
| Reject approval | A | A | A | A | D | Только назначенный reviewer; comment обязателен. |
| Revoke approval | A | A | A | A | D | Только назначенный reviewer; только пока release в статусе in_review. |
| Удалить approval | A | A | D | D | D | Только пока release в статусе draft. |

---

### CommentsModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Создать comment | A | A | A | A | D | Comment может создать любой участник организации, включая release в статусе released. |
| Получить список comments | A | A | A | A | D | Список comments доступен участникам организации. |
| Изменить comment | A | A | A | A | D | Можно изменить только свой comment; только если release.status != released. |
| Удалить comment | A | A | A | A | D | Свой comment может удалить любой участник; чужой comment может удалить только Owner/Admin; только если release.status != released; используется soft delete. |

---

### AuditModule

| Действие | Owner | Admin | Developer | Reviewer | Non-member | Комментарий |
| -------- | :---: | :---: | :-------: | :------: | :--------: | ----------- |
| Получить audit events организации | A | A | A | A | D | Audit events организации доступны участникам организации. |
| Получить audit events проекта | A | A | A | A | D | Audit events проекта доступны участникам организации. |
| Получить audit events релиза | A | A | A | A | D | Audit events релиза доступны участникам организации. |
