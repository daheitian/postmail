# Coding Standards

Detailed coding standards referenced from [CLAUDE.md](../../CLAUDE.md). The principles in CLAUDE.md take precedence if there is any conflict.

## Module Dependency Direction

```
routes -> services -> db
routes -> viewmodels -> ui
```

- Shared utilities/types may be imported anywhere if they do not introduce upward coupling.
- Shared app-level types (e.g. `AppVariables`) live in `src/types/app-context.ts`, not in composition roots.

### Forbidden Edges

- Routes must not import DB drivers/query builders or execute raw SQL.
- Services must not import route modules or UI/component modules.
- UI/components must not import services, DB modules, or route modules.
- Feature modules must not import shared types from `src/app.tsx` or other app composition roots.

## Error Handling

### Service Error Taxonomy

Services throw typed domain errors with clear intent:

| Error                  | HTTP Status | When                            |
| ---------------------- | ----------- | ------------------------------- |
| `ValidationError`      | 400         | Invalid input                   |
| `UnauthorizedError`    | 401         | Not authenticated               |
| `ForbiddenError`       | 403         | Authenticated but not allowed   |
| `NotFoundError`        | 404         | Resource doesn't exist          |
| `ConflictError`        | 409         | State conflict (e.g. duplicate) |
| `RateLimitError`       | 429         | Too many requests               |
| `ExternalServiceError` | 500         | Third-party failure             |

Unknown/unhandled errors map to `500`.

### Logging Policy

- Log expected/recoverable client errors at `info`/`warn`.
- Log server/fatal errors at `error` with context and stack.
- **Never** log secrets, tokens, password hashes, or raw credentials.

### Recoverable vs Fatal

- Recoverable errors return typed failures to the caller.
- Fatal startup/infrastructure errors fail fast with clear messages.

## Testing Strategy

See also: [testing-guide.md](./testing-guide.md) for practical patterns and helpers.

### Coverage Expectations

- **Service layer**: happy path + at least one meaningful failure/edge case per changed path.
- **Route layer**: request validation, auth/authorization behavior, error mapping, one success contract path.
- **UI layer**: complex state transitions and event contracts. Do not over-test static markup.

### Principles

- **Test what we own**: business logic, contracts, boundary behavior. Do not test third-party internals.
- **Regression policy**: every bug fix includes a test that fails before the fix.
- **Test environment**: in-memory SQLite helpers, fresh DB state per test (`beforeEach`).
