# Datastar Patterns

**Version: v1.0.0-RC.7** (vendored in `src/vendor/datastar.js`). See `references/datastar/` for full API docs.

## Core Concepts

- **Signals**: `data-signals="{title: '', _loading: false}"` (use `_` prefix for private signals)
- **Binding**: `data-bind="title"` for two-way form binding
- **Actions**: `data-on:submit__prevent="@post('/url')"` for server communication
- **Display**: `data-show="$_loading"` for conditional rendering
- **Expressions only**: Use `x && fn()` not `if (x) fn()` in attributes

## Form Pattern

**Every form with `@post`/`@put`/`@patch`/`@delete` MUST have a loading state.** Use Datastar's built-in `data-indicator` to automatically track request state:

```tsx
<form
  data-signals={JSON.stringify({ title: "" })}
  data-on:submit__prevent="@post('/dash/posts')"
  data-indicator="_loading"
  class="flex flex-col gap-4"
>
  <input data-bind="title" class="input" />
  <div id="form-message"></div>
  <button type="submit" class="btn" data-attr-disabled="$_loading">
    <span data-show="!$_loading">Save</span>
    <span data-show="$_loading">Processing...</span>
  </button>
</form>
```

**How it works:**

- `data-indicator="_loading"` on the form: automatically sets `_loading` to `true` when `@post` starts, `false` when finished
- `data-attr-disabled="$_loading"` on the button: prevents double-submission
- Two `<span>` with `data-show`: toggles between normal label and loading text
- Use `_` prefix so the loading signal is private (not sent to server)

**Multiple forms on same page:** Use unique signal names to avoid conflicts (e.g., `_profileLoading`, `_passwordLoading`).

## Server Response

**Default: Use non-SSE helpers** for single-operation responses (most cases):

```typescript
import { dsRedirect, dsToast, dsSignals } from "@/lib/sse";

// Redirect (Datastar detects text/html -> patch-elements)
return dsRedirect("/dash/posts");

// Redirect with cookie forwarding (e.g. auth)
return dsRedirect("/dash", { headers: { "Set-Cookie": cookie } });

// Toast notification
return dsToast("Settings saved successfully.");
return dsToast("Something went wrong.", "error");

// Signal patch (Datastar detects application/json -> patch-signals)
return dsSignals({ _uploadError: "File too large" });
```

**SSE: Only when you need multiple operations** in one response:

```typescript
import { sse } from "@/lib/sse";

return sse(c, async (stream) => {
  await stream.patchElements('<div id="msg">Success!</div>');
  await stream.toast("Saved!");
});
```

## Key Rules

- **Loading states required**: Every form with `@post`/`@put`/`@patch`/`@delete` must use `data-indicator` + `data-attr-disabled` on the submit button. No exceptions.
- `@post` sends non-private signals as JSON body
- Define signals on parent element containing all children that need access
- Use `throwIfNamespace: false` in SWC config for colon syntax (`data-on:click`)
- For complex interactions (file uploads), use plain JS instead of Datastar
- Prefer `dsRedirect`/`dsToast`/`dsSignals` over `sse()` for single-event responses
