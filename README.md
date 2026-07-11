# RFlow App

Backend application built with NestJS, Prisma, PostgreSQL, JWT auth, and a feature-first module structure.

## Scripts

```bash
npm run start:dev
npm run lint
npm run typecheck
npm run test
```

Useful focused test examples:

```bash
npx jest src/modules/auth/tests --runInBand
npx jest src/modules/users/tests/users.service.spec.ts --runInBand
```

## Project Structure

Application code lives in `src/`.

```txt
src/
  common/       Shared types, transformers, helpers.
  config/       Application, auth, database, and env validation config.
  database/     Prisma module/service.
  modules/      Feature modules.
```

Feature modules live in `src/modules/<feature>/`. A mature module usually follows this shape:

```txt
src/modules/projects/
  dto/
    create-project.dto.ts

  projects.controller.ts
  projects.module.ts
  projects.service.ts
  projects.repository.ts
  projects.policy.ts
  projects.select.ts
  projects.types.ts
```

Not every module needs every file. Add a file only when the module has that responsibility.

## Module Responsibilities

### `*.module.ts`

Nest dependency boundary for the feature.

Use it to register:

- controllers;
- services;
- repositories;
- policies;
- feature-specific helpers.

Example:

```ts
@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, ProjectsPolicy],
})
export class ProjectsModule {}
```

### `*.controller.ts`

HTTP layer only.

Controllers should:

- define routes;
- read `@Param()`, `@Body()`, `@Req()`;
- apply guards;
- call service methods.

Controllers should not:

- query Prisma directly;
- check business permissions;
- know Prisma `select` shapes;
- hash passwords;
- sign tokens.

If every endpoint in a controller is protected, put the guard on the class:

```ts
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {}
```

### `*.service.ts`

Use case layer.

Services describe what happens in an application scenario:

- validate required runtime context;
- call repositories;
- call policies;
- call feature helpers;
- throw application exceptions;
- return typed responses.

Services should avoid long Prisma queries. Put those in repositories.

### `*.repository.ts`

Database access layer.

Repositories own Prisma calls:

- `findUnique`;
- `findFirst`;
- `findMany`;
- `create`;
- `update`;
- Prisma `where`;
- Prisma `select`.

Repositories should not contain business permission decisions. They can query membership data, but the decision belongs to a policy or service.

### `*.policy.ts`

Permission and role rules.

Use a policy when the module has role-based behavior:

```ts
assertCanCreateProject(role: MembershipRole) {
  if (!this.allowedCreateProjectRoles.has(role)) {
    throw new ForbiddenException(
      'You do not have permission to create projects',
    );
  }
}
```

Do not create a policy file when there are no permission rules yet.

### `*.select.ts`

Reusable Prisma response shapes.

Use `select` constants to keep API responses consistent:

```ts
export const projectSelect = {
  id: true,
  name: true,
  description: true,
  organizationId: true,
  createdAt: true,
} satisfies Prisma.ProjectSelect;
```

Services and controllers should not duplicate these shapes.

### `*.types.ts`

Service contract types.

Store service input params and service response types here:

```ts
export type ProjectResponse = Prisma.ProjectGetPayload<{
  select: typeof projectSelect;
}>;

export type GetProjectsParams = {
  userId: string;
  organizationId: string;
};

export type GetProjectsResponse = ProjectResponse[];

export type CreateProjectParams = {
  userId: string;
  organizationId: string;
  dto: CreateProjectDto;
};

export type CreateProjectResponse = ProjectResponse;
```

Service methods should use these explicitly:

```ts
async getProjects(params: GetProjectsParams): Promise<GetProjectsResponse> {}
```

Naming rules:

- use `*Params` for service input;
- use `*Response` for service output;
- derive entity responses from Prisma `select` when possible;
- use explicit object types when a mapper changes the shape.

Avoid generic names like `Response`. Prefer domain names:

- `ProjectResponse`;
- `LoginResponse`;
- `ReleaseTaskResponse`;
- `GetOrganizationsResponse`.

### `*.mapper.ts`

Response transformation layer.

Use a mapper when the returned shape differs from the database shape.

Example: organizations are selected with `memberships`, but the API returns `role`:

```ts
export const mapOrganizationWithRole = ({
  memberships,
  ...organization
}: OrganizationWithMembershipRole): OrganizationResponse => ({
  ...organization,
  role: memberships?.[0]?.role,
});
```

For arrays, prefer idiomatic mapping while logic is simple:

```ts
return organizations.map(mapOrganizationWithRole);
```

Add a plural mapper only when list transformation becomes non-trivial or reused.

### `dto/*.dto.ts`

Input DTOs for HTTP payloads.

DTOs are classes because `class-validator` and `class-transformer` work at runtime:

```ts
export class CreateProjectDto {
  @IsString()
  @Transform(trimStringTransformer)
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
```

Input normalization belongs at the DTO boundary when possible. For example, trim strings with `trimStringTransformer` in DTOs instead of calling `trim()` in services.

Service response types should not be named `Dto` unless they are real runtime DTO classes used for serialization or OpenAPI docs.

## Current Module Status

Active modules use the structure above:

- `auth`
- `users`
- `organizations`
- `projects`
- `environments`
- `releases`

Placeholder modules currently contain only a Nest module file:

- `approvals`
- `audit`
- `checklist`
- `comments`
- `memberships`
- `notifications`

Add structure to placeholder modules when they get real use cases.

## Design Rules

- Keep controllers thin.
- Keep services readable as use cases.
- Keep Prisma in repositories.
- Keep role checks in policies.
- Keep response shapes in `*.select.ts`.
- Keep service contracts in `*.types.ts`.
- Keep input validation and simple input normalization in DTOs.
- Add mappers only when response shape differs from database shape.
- Avoid abstractions before the module has the responsibility.

## Validation Before Commit

Run these before committing backend changes:

```bash
npm run lint
npm run typecheck
npm run test
```
