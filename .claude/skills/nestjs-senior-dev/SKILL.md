---
name: nestjs-senior-dev
description: Use whenever writing, reviewing, or refactoring backend code in this NestJS repo (modules, controllers, services, entities, DTOs, migrations). Enforces this repo's established conventions — plain-interface DTOs (no class-validator), action-style routes, global JWT auth via AuthGuard/@Public(), TypeORM with synchronize:false, and the isolatedModules decorator-metadata gotcha. Trigger on ".ts" files under src/, or requests to add/change a module, endpoint, entity, or migration.
---

# Senior NestJS developer

Match this repo's actual conventions, not generic NestJS-tutorial defaults (class-validator
DTOs, RESTful-only routes, feature-scoped guards). The `room`/`message`/`project` modules are
the reference implementation — check one of them before inventing a new pattern.

## Module shape

Every feature is `src/<feature>/`:

- `<feature>.entity.ts` — TypeORM entity, `@PrimaryGeneratedColumn('uuid')`, relations via
  `@ManyToOne`/`@OneToMany`/`@JoinColumn`.
- `dto/<feature>.ts` — **plain TypeScript interfaces, no `class-validator`/`class-transformer`**
  (not a dependency here, and `main.ts` has no global `ValidationPipe`). Follow the
  `XDto` / `CreateXDto = Omit<XDto, 'id'>` / `UpdateXDto = Partial<XDto>` shape from
  `room/dto/room.ts` and `project/dto/project.ts`.
- `<feature>.service.ts` — `@Injectable()`, `@InjectRepository()` for each entity it owns.
  Ownership checks (`resource.ownerId !== userId` → `ForbiddenException`) live here, not in the
  controller.
- `<feature>.controller.ts` — `@Controller('<feature>')`, action-style routes (`/create`,
  `/list`, `/:id`, not bare `@Post()`/`@Get()` REST-by-convention). **Declare literal routes
  before param routes on the same HTTP method** (`list` before `:id`) — Nest matches in
  declaration order within a controller, so a `:id` route declared first will swallow requests
  meant for a literal path.
- `<feature>.module.ts` — `TypeOrmModule.forFeature([...entities])`, register in
  `app.module.ts`'s `imports`.

## Auth

- `AuthGuard` is registered globally via `APP_GUARD` (`auth.module.ts`) — every route requires a
  valid JWT by default. Opt a route out with `@Public()` (`shared/decorators/public.decorator.ts`),
  used today only for `register`/`login`/`refresh`.
- Authenticated routes read the user via `@Request() req: { user: JwtPayload }` and
  `req.user.sub` (the user id) — see `room.controller.ts`/`project.controller.ts`. Always scope
  queries by `req.user.sub` for anything user-owned; don't trust a client-supplied user id.

## TypeScript / decorator metadata gotcha

- `isolatedModules` + `emitDecoratorMetadata` are both on (`tsconfig.json`). Any type used
  **only** in a decorated signature — a controller method parameter (`@Body()`, `@Request()`)
  or an entity property (`@Column()`) — that resolves to an interface/type (not a class) must be
  imported with `import type { X } from '...'` or a namespace import (`import * as dto from
  './dto/x'`, used by `room.controller.ts`/`ai.controller.ts`). Otherwise `tsc` fails with
  `TS1272` ("must be imported with 'import type' or a namespace import"). Array types
  (`X[]`) don't trigger this — only bare object/interface types do.

## TypeORM & migrations

- `synchronize: false` (`app.module.ts`) — **every schema change needs a real migration**,
  never rely on entity decorators alone to update the DB.
- `src/data-source.ts` is the CLI entry point; `npm run migration:generate|create|run` all use
  it. Prefer `migration:generate` (diffs against live entities) when there's a safe DB to diff
  against; hand-write the migration (`MigrationInterface`, raw `queryRunner.query()`) when you
  can't risk the generator touching unrelated tables — that's what `project/`'s initial
  migration did.
- **Never run `migration:run` against a real database without the user's explicit go-ahead** —
  it's a schema change on shared state, not a reversible local edit.

## Routing

- `main.ts` sets `app.setGlobalPrefix('api')` — route decorators should NOT include `/api`
  themselves; the prefix is applied automatically. Real paths are `http://host:port/api/<controller-path>`.
- CORS is locked to `process.env.FRONTEND_URL` — if a new frontend origin needs access, that's
  an env var change, not a code change.

## Testing (know the reality here)

- Jest's `rootDir` is `src` (`package.json`'s `jest` config), but the whole codebase imports
  cross-module entities with the absolute `src/foo/bar` style (`import { User } from
  'src/user/user.entity'`) — without `"modulePaths": ["<rootDir>/.."]` in that config, Jest
  can't resolve those imports at all and every spec touching an entity with relations fails at
  module-load time before a single test runs. This was fixed 2026-08-13 — if it regresses,
  that's the config to check.
- With module resolution fixed, most pre-existing `*.spec.ts` files (`room`, `message`, `auth`,
  `ai`, `chat`, `export.controller`) still fail — they're default `nest generate` stubs
  (`should be defined`) that never provide a mock for their injected `@InjectRepository()` (or
  equivalent) dependencies, so `Test.createTestingModule({...}).compile()` throws a DI
  resolution error. Confirmed by running `npx jest`: 11 of 14 suites fail this way. **Don't copy
  that stub shape for new code** — `project.service.spec.ts`/`project.controller.spec.ts` are
  the real pattern to copy: mock each `Repository<T>` via `{ provide: getRepositoryToken(T),
  useValue: <jest.fn() mocks> }`, and mock injected services the same way in controller specs.
  Fixing the other 11 pre-existing broken suites is a separate, larger cleanup — don't do it
  incidentally while working on something else unless asked.

## Before calling backend work done

1. `npx tsc --noEmit -p tsconfig.json` and `npx nest build` — both must be clean.
2. Check new/changed routes for the literal-before-param ordering issue above if they share a
   path prefix with an existing controller (e.g. `project/export` vs `project/:id`).
3. If entities changed, confirm a migration was written (and confirm with the user before
   running it).
