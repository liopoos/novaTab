# novaTab — Agent Guidelines

## Project Overview

novaTab is a Chrome extension (Manifest V3) that replaces the new tab page with a bookmark manager, and adds a side panel. Built with Vite + React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui (Radix primitives). Uses `@crxjs/vite-plugin` for the extension build pipeline.

## Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # tsc -b && vite build → outputs to dist/
npm run preview      # Preview production build
npm run type-check   # tsc --noEmit -p tsconfig.app.json
```

**No lint or test scripts are configured.** Always run `npm run type-check` after changes — it must exit 0.

To load as an extension: `npm run build` → `chrome://extensions` → Developer mode → Load unpacked → `dist/`

## Project Structure

```
src/
  App.tsx              # Root component + global keyboard shortcuts + layout
  background.ts        # MV3 service worker (background script)
  newtab/              # New tab entry point
  sidepanel/           # Side panel entry point
  components/          # React components (UI + feature)
    ui/                # shadcn/ui primitives — do not modify styles inline
    BookmarkTree.tsx   # Sidebar folder tree with DnD, expand/collapse, pinned
    BookmarkGrid.tsx   # Bookmark card grid (search-aware)
    BookmarkCard.tsx   # Individual bookmark card with favicon fallback chain
    FolderGrid.tsx     # Subfolder card grid
    SearchBar.tsx      # Debounced search input (300ms) with clear button
    BookmarkCheckerDialog.tsx  # Bookmark connectivity checker dialog (concurrent fetch, progress, delete)
    BreadcrumbNav.tsx  # Folder breadcrumb trail
    SettingsDialog.tsx
    ShortcutsDialog.tsx
    ThemeToggle.tsx
    LanguageToggle.tsx
    SidebarBrowserButtons.tsx
  contexts/            # React contexts
    ThemeContext.tsx   # Theme state provider
    SettingsContext.tsx
  hooks/               # Custom hooks
    useBookmarkChecker.ts  # Semaphore-based concurrent bookmark probe hook
    useBookmarks.ts    # Bookmark state, selection, search, persistence
    useSettings.ts     # App settings (storage-backed, merged with defaults)
    useTheme.ts        # Theme/preset/dark mode + custom OKLCH theme
    usePinnedFolders.ts
  lib/                 # Pure utilities
    bookmarks.ts       # Chrome bookmarks API wrappers + tree utilities
    favicon.ts         # Favicon URL helpers (chrome → Clearbit → SVG fallback)
    utils.ts           # cn() helper (twMerge + clsx)
    settingsIO.ts      # Settings import/export serialization + validation
    mock-bookmarks.ts  # Mock data for non-extension (browser preview) context
    appInfo.ts         # APP_NAME, APP_VERSION from manifest.json
  types/               # Shared domain types, exported via index.ts barrel
    bookmark.ts        # BookmarkNode, BreadcrumbItem
    settings.ts        # AppSettings, ThemePreset, DEFAULT_SETTINGS, CustomThemeConfig, checkerConcurrency, checkerTimeoutMs
    index.ts           # Barrel: export * from each type file
  styles/globals.css   # Tailwind v4 entry + CSS variables for all presets
  i18n/                # i18next config + locale JSONs
    locales/en.json    # English strings
    locales/zh.json    # Chinese strings
    locales/ja.json    # Japanese strings
manifest.json          # Chrome MV3 manifest (permissions: storage, bookmarks, favicon, tabs, sidePanel)
```

## TypeScript

- `strict: true` in both `tsconfig.app.json` and `tsconfig.node.json` — no exceptions
- Target: `ESNext`; module: `ESNext`; moduleResolution: `bundler`
- Path alias: `@/` → `./src/` (use for all internal imports)
- Types include `vite/client` and `chrome` — Chrome extension API is globally typed
- `resolveJsonModule: true` — you can `import manifest from "./manifest.json"`

**Forbidden:**
- `as any`, `@ts-ignore`, `@ts-expect-error`
- Non-null assertion (`!`) without a clear comment justifying it
- Class components — use function components only

## Import Order

1. Side-effect imports first: `import "./styles/globals.css"` / `import "@/i18n"`
2. React: `import { useState, useEffect } from "react"`
3. External libraries (lucide-react, react-i18next, @dnd-kit/*, radix-ui, etc.)
4. Internal UI primitives: `"@/components/ui/..."`
5. Feature components: `"@/components/..."`
6. Hooks: `"@/hooks/..."`
7. Contexts: `"@/contexts/..."`
8. Libraries/utils: `"@/lib/..."`
9. Types (use `import type`): `import type { BookmarkNode } from "@/types"`

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase, filename matches | `SearchBar.tsx` → `export function SearchBar` |
| Hooks | `useCamelCase` | `useBookmarks.ts` → `export function useBookmarks` |
| Contexts | PascalCase + `Context` suffix | `ThemeContext.tsx` |
| Shared types | PascalCase, in `src/types/` | `BookmarkNode`, `AppSettings` |
| Utilities | verb-first camelCase | `fetchBookmarks`, `findNodeById` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_SETTINGS`, `EXPANDED_KEY` |

## Component Patterns

**Standard named export:**
```tsx
interface SearchBarProps {
  searchQuery: string;
  onSearch: (q: string) => void;
}

export function SearchBar({ searchQuery, onSearch }: SearchBarProps) { ... }
```

**forwardRef with imperative handle:**
```tsx
export interface BookmarkTreeHandle {
  collapseAll: () => void;
  expandAll: () => void;
}

export const BookmarkTree = forwardRef<BookmarkTreeHandle, BookmarkTreeProps>(
  function BookmarkTree(props, ref) {
    useImperativeHandle(ref, () => ({ collapseAll() { ... }, expandAll() { ... } }));
  }
);
```

- `App` is the only default export
- Small local-only sub-components (e.g. `TreeNode`) are declared in the same file
- Props interfaces are declared inline per file; shared domain types go in `src/types/`
- Use `cn()` from `@/lib/utils` (wraps `clsx` + `tailwind-merge`) for all dynamic classNames

## Hook Patterns

**Return type always explicitly declared:**
```ts
interface UseBookmarksReturn { roots: BookmarkNode[]; loading: boolean; error: string | null; ... }
export function useBookmarks(): UseBookmarksReturn { ... }
```

**Async data loading in useEffect:**
```ts
useEffect(() => {
  async function load() {
    try {
      setLoading(true);
      const data = await fetchBookmarks();
      setRoots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setRoots(MOCK_BOOKMARKS);
    } finally {
      setLoading(false);
    }
  }
  load();
}, []);
```

**Lazy state initializer for synchronous storage reads:**
```ts
const [settings, setSettings] = useState<AppSettings>(() => readSettingsSync());
```

**Stable callbacks via `useCallback` for setters passed to children.**

**Derived state is computed synchronously — not stored in state:**
```ts
const selectedFolder = selectedFolderId ? findNodeById(roots, selectedFolderId) : null;
```

## State Management

- No external state library — React state + context only
- Global app state lives in `useBookmarks` and `useSettings` hooks in `App.tsx`
- Persistence: use `chrome.storage.sync/local` when available, fall back to `localStorage`
- Detect chrome availability: `typeof chrome !== "undefined" && chrome.storage?.sync`
- Wrap chrome callbacks in Promises; never mix callback and async patterns
- Subscribe to `chrome.storage.onChanged` only when chrome storage is available

## Drag and Drop

- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` are in use (see `BookmarkTree.tsx` for the pinned-folders sortable list)
- Use `useSortable`, `DndContext`, `SortableContext`, and `arrayMove` following existing patterns
- Sensors: `useSensor(PointerSensor)` with a small activation distance for accidental-drag prevention

## Error Handling

- Non-critical reads (parsed persisted state): wrap in `try/catch`, return safe default in `catch {}`
- Critical async hooks: set `error` state + fallback data (e.g. `MOCK_BOOKMARKS`)
- Always use `finally` to reset loading flags
- Chrome API unavailability is not an error — use `isChromeAvailable` guard from `@/lib/favicon`

## Styling

- Tailwind CSS v4 with shadcn/ui — all styles via CSS variables defined in `src/styles/globals.css`
- Use semantic color tokens: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `bg-sidebar`, `bg-sidebar-accent`
- **Never** use raw color values (`bg-blue-500`) or manual `dark:` overrides
- **Never** override shadcn component colors via `className` prop
- Theme presets (8 total) are toggled via `data-preset` attribute on `<html>`: `default`, `rose`, `blue`, `green`, `orange`, `violet`, `rounded`, `sharp`
- Dark mode via `.dark` class on `<html>`; managed by `useTheme`
- Custom theme: applies OKLCH CSS variables directly via JS — use `applyCustomTheme` from `useTheme`
- Tailwind configured via `@tailwindcss/vite` plugin — no `tailwind.config.*` file

## i18n

- All user-visible strings go through `useTranslation()` / `t("key.name")`
- Locale files: `src/i18n/locales/en.json`, `zh.json`, and `ja.json`
- **All three files must be updated together** when adding new keys
- Namespace keys are grouped by feature (e.g. `search.placeholder`, `shortcuts.title`, `bookmarks.empty`)

## Keyboard Shortcuts

Global shortcuts are registered in `App.tsx` via `document.addEventListener`. Use `isTypingTarget(e)` guard before handling to skip shortcuts when the user is typing in an input.

| Key | Action |
|---|---|
| `/` | Focus search bar |
| `Esc` | Clear search and blur |
| `[` | Collapse all sidebar folders |
| `]` | Expand all sidebar folders |
| `H` / `Home` | Go to root (all bookmarks) |
| `?` | Open keyboard shortcuts dialog |

## Chrome Extension Notes

- Service worker: `src/background.ts` — keep it minimal, no DOM access
- `chrome.*` APIs always need availability guards for browser-preview mode
- `manifest.json` permissions: `storage`, `bookmarks`, `favicon`, `tabs`, `sidePanel`
- Favicon pipeline: `chrome.runtime.getURL("/_favicon/...")` → Clearbit by domain → inline SVG default
- `appInfo.ts` exports `APP_NAME`, `APP_VERSION` etc. read from `manifest.json` — use this, don't hardcode

## Verification Checklist (before marking work done)

- [ ] `npm run type-check` exits with code 0
- [ ] All three locale files (`en.json`, `zh.json`, `ja.json`) updated if any new UI strings added
- [ ] Semantic color tokens used (no raw Tailwind colors, no `dark:` overrides)
- [ ] No `as any`, `@ts-ignore`, empty `catch(e) {}`
- [ ] Named exports used (not default) for all components except `App`
- [ ] Chrome API access guarded with availability check
- [ ] `cn()` used for dynamic className composition (not string concatenation)
