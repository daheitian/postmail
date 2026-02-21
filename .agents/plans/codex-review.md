### P06：用户可见字符串未全量走 `t()` + `@context`

- `packages/core/src/routes/compose.tsx:89`：fallback 文案 `"Invalid input"`。
- `packages/core/src/routes/compose.tsx:127`：JSON toast `"Draft saved."`。
- `packages/core/src/routes/compose.tsx:142`：SSE toast `"Draft saved."`。
- `packages/core/src/routes/dash/settings.tsx:177`：SSE toast `"Settings saved successfully."`。
- `packages/core/src/routes/dash/settings.tsx:205`：JSON toast `"Footer saved successfully."`。
- `packages/core/src/routes/dash/settings.tsx:236`：JSON toast `"SEO settings saved successfully."`。
- `packages/core/src/routes/dash/settings.tsx:256`：`dsToast("Storage not configured.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:323`：`dsToast("Upload failed. Please try again.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:365`：JSON toast `"Avatar display setting saved successfully."`。
- `packages/core/src/routes/dash/settings.tsx:419`：`dsToast("Invalid theme selected.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:438`：`dsToast("Invalid font theme selected.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:462`：`dsToast("Custom CSS saved successfully.")`。
- `packages/core/src/routes/dash/settings.tsx:495`：`dsToast("Name is required.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:504`：`dsToast("Failed to update profile.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:507`：`dsToast("Profile saved successfully.")`。
- `packages/core/src/routes/dash/settings.tsx:518`：`dsToast("Passwords do not match.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:531`：`dsToast("Current password is incorrect.", "error")`。
- `packages/core/src/routes/dash/settings.tsx:535`：SSE toast `"Password changed successfully."`。
- `packages/core/src/routes/auth/signin.tsx:128`：`dsToast("Auth not configured", "error")`。
- `packages/core/src/routes/auth/signin.tsx:135`：fallback `"Invalid input"`。
- `packages/core/src/routes/auth/signin.tsx:150`：`dsToast("Invalid email or password", "error")`。
- 相关 API 错误文案（同属 P06 范围）：
- `packages/core/src/routes/api/upload.ts:139`：`{ error: "Storage not configured" }`
- `packages/core/src/routes/api/upload.ts:149`：`{ error: "No file provided" }`
- `packages/core/src/routes/api/upload.ts:230`：`{ error: "Upload failed" }`

### P07：错误模型不统一（service 原生 Error + 路由 ad-hoc）

- `packages/core/src/services/auth.ts:59`：`throw new Error("Invalid or expired reset token")`
- `packages/core/src/services/auth.ts:67`：`throw new Error("No user account found")`
- 路由层 ad-hoc 典型位置：
- `packages/core/src/routes/auth/signin.tsx:128`、`packages/core/src/routes/auth/signin.tsx:150`（直接 `dsToast`）
- `packages/core/src/routes/dash/settings.tsx:256`、`packages/core/src/routes/dash/settings.tsx:323`（直接 `dsToast`）
- `packages/core/src/routes/api/upload.ts:139`、`packages/core/src/routes/api/upload.ts:230`（直接 `c.json({ error: ... }, status)`）

### P08：配置策略非完全 fail-fast

- `packages/core/src/app.tsx:107`：AUTH_SECRET 缺失仅 `console.warn`，应用继续运行。
- `packages/core/src/app.tsx:277`：运行时才返回 `"Auth not configured. Set AUTH_SECRET."`。
- `packages/core/src/lib/storage.ts:233`：`createStorageDriver(...)` 返回 `StorageDriver | null`。
- `packages/core/src/lib/storage.ts:243`：S3 配置缺失返回 `null`（延迟到请求路径报错）。
- `packages/core/src/lib/storage.ts:255`：R2 缺失返回 `null`。
- `packages/core/src/middleware/auth.ts:46`：API 请求期才返回 `"Authentication not configured"`。

### P10：BaseCoat 语义类使用不一致（`.btn` + 变体叠加）

- `packages/core/src/routes/dash/index.tsx:66`：
- 现状：`class="btn btn-primary w-full"`（违反 BaseCoat 变体“自包含”约束）。

### P11：inline style / 硬编码尺寸未收敛到 tokens/classes

- Auth 路由：
- `packages/core/src/routes/auth/signin.tsx:79`：`style="display:none"`
- `packages/core/src/routes/auth/reset.tsx:85`：`style="display:none"`
- `packages/core/src/routes/auth/setup.tsx:95`：`style="display:none"`
- UI Dash：
- `packages/core/src/ui/dash/posts/PostForm.tsx:242`：`style="min-width:6rem"`
- `packages/core/src/ui/dash/posts/PostForm.tsx:243`：`style="min-width:5rem"`
- `packages/core/src/ui/dash/collections/CollectionForm.tsx:159`：`style="min-width:7rem"`
- `packages/core/src/ui/dash/collections/CollectionForm.tsx:160`：`style="min-width:5rem"`
- `packages/core/src/ui/dash/PageForm.tsx:153`：`style="display:none"`
- `packages/core/src/ui/dash/pages/LinkFormContent.tsx:86`：`style="display:none"`
- `packages/core/src/ui/dash/settings/AccountContent.tsx:60`：`style="display:none"`
- `packages/core/src/ui/dash/settings/AccountContent.tsx:154`：`style="display:none"`
- `packages/core/src/ui/dash/settings/AppearanceContent.tsx:248`：`style="display:none"`
- UI Components：
- `packages/core/src/ui/components/jant-settings-avatar.ts:115`：`style="width:64px;height:64px"`
- `packages/core/src/ui/components/jant-settings-avatar.ts:121`：`style="width:64px;height:64px"`
- `packages/core/src/ui/components/jant-compose-editor.ts:152`：`style="font-size:0.9rem"`
- `packages/core/src/ui/components/jant-compose-editor.ts:204`：`style="font-size:0.78rem"`
- `packages/core/src/ui/components/jant-compose-dialog.ts:360`：`style="pointer-events:none"`
