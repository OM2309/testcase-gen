# Frontend Code Generation & Agent Rules

This document outlines the architecture, code generation standards, styling rules, composition patterns, and performance guidelines for the frontend codebase. All AI code generation agents must follow these rules strictly.

---

## 1. Project Stack

- **Framework**: React 19, Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: `shadcn/ui` (`src/components/ui/` — NEVER modify manually)
- **Server State**: TanStack Query (`@tanstack/react-query`)
- **Global Client State**: Zustand (`src/stores/`)
- **Forms & Validation**: React Hook Form + Zod
- **HTTP Client**: Axios via `src/services/apiClient.ts`

---

## 2. Architecture & File Structure Rules

### API & State Management
- **NEVER** call `axios` or service functions directly from React components.
- **ALWAYS** use TanStack Query hooks (`useQuery`, `useMutation`) for server state.
- **ALWAYS** use Zustand stores (`src/stores/useProjectStore.ts`, etc.) for global client state.
- Service functions live in `src/services/` (returning raw axios responses).
- Query hooks live in `src/queries/` (wrapping service calls with `useQuery`).
- Mutation hooks live in `src/mutations/` (wrapping service calls with `useMutation`).

### Query Keys & Cache Management
- **ALWAYS** use query keys defined in `src/lib/queryKeys.ts`. Never use raw string arrays in components.
- Invalidate related query keys in `onSuccess` callbacks after mutations.

### Loading / Error / Empty UI States
- Use TanStack Query built-in state properties (`isLoading`, `isPending`, `isError`, `error`).
- Use standardized global components from `src/components/shared/`:
  - `<PageLoader />` — Full page loading spinner
  - `<PageError message={error.message} onRetry={refetch} />` — Full page error state
  - `<EmptyState icon={...} title="..." description="..." />` — Empty data placeholder
  - `<InlineLoader />` — Section/component loading spinner
  - `<InlineError message="..." />` — Inline error alert
- **NEVER** build ad-hoc loading spinners or error containers in feature components.

### File Size & Component Limits
- **Component files**: ≤ 250 lines. If larger, decompose into helper sub-components.
- **Hook files**: ≤ 150 lines.
- **Service files**: ≤ 100 lines.
- **Type files**: ≤ 250 lines.
- Organize components in feature folders: `src/components/feature-name/ComponentName.tsx` with barrel export (`index.ts`).
- One main component per file.

### Types & Naming Conventions
- Shared types live in `src/types/index.ts`. Use `ApiResponse<T>` wrapper.
- No `any` types. Duplicate type definitions are strictly prohibited.
- **Naming**:
  - Components: `PascalCase.tsx`
  - Hooks: `useCamelCase.ts`
  - Services: `camelCase.service.ts` or `camelCaseService.ts`
  - Queries / Mutations: `feature.query.ts` / `feature.mutation.ts`
  - Types: `PascalCase` interfaces, `camelCase` type aliases

### Imports Order
1. React / Next.js core imports
2. Third-party libraries (TanStack Query, Lucide icons, etc.)
3. Local types (`src/types`)
4. Local services, queries, mutations
5. Local components (`src/components/...`)
6. Local hooks (`src/hooks/...`)
7. Local utilities (`src/lib/...`)

---

## 3. Installed Agent Skills & Guidelines (`.agents/skills/`)

The repository includes curated agent skills inside `.agents/skills/`. All code generation must conform to the following skill guidelines:

### A. shadcn/ui Component & Styling Guidelines (`.agents/skills/shadcn`)

1. **Use Existing UI Components First**:
   - Check installed `components/ui/` or `npx shadcn@latest search` before building custom UI elements.
   - Compose settings, dashboards, and complex views using existing primitives (`Card`, `Tabs`, `Table`, `Sidebar`, etc.).

2. **Styling & Tailwind Best Practices**:
   - Use Tailwind CSS classes. Never override component colors or typography manually with raw hex/RGB values.
   - Use semantic tokens (`bg-primary`, `bg-background`, `text-muted-foreground`) to maintain proper dark mode support.
   - Spacing: **NEVER use `space-x-*` or `space-y-*`**. Use flexbox with `gap-*` (`flex flex-col gap-4`).
   - Equal dimensions: Use `size-*` instead of `w-* h-*` (e.g., `size-10`).
   - Use `truncate` shorthand instead of `overflow-hidden text-ellipsis whitespace-nowrap`.
   - Use `cn()` utility function for conditional class concatenation.
   - Overlay components (`Dialog`, `Sheet`, `Popover`, `Drawer`) manage their own z-index — do not apply manual `z-index` classes.

3. **Forms & Inputs**:
   - Structure form fields with `FieldGroup` + `Field` instead of generic `div` containers with arbitrary spacing.
   - Inside input groups, use `InputGroupInput` / `InputGroupTextarea` with `InputGroupAddon`.
   - Form validation state: Apply `data-invalid` on the `Field` container and `aria-invalid` on the control element.
   - Group related checkboxes/radios using `FieldSet` + `FieldLegend`.

4. **Component Composition & Accessibility**:
   - `Dialog`, `Sheet`, and `Drawer` **must always include a Title element** (`DialogTitle`, `SheetTitle`, `DrawerTitle`). If visually unnecessary, apply `className="sr-only"`.
   - Always complete full `Card` structures (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`).
   - `Avatar` must always provide an `AvatarFallback` for load failures.
   - Pass icons as React components (`icon={CheckIcon}`) and set `data-icon="inline-start"` or `data-icon="inline-end"` on buttons. Avoid adding explicit sizing classes (`w-4 h-4`) when the button or component manages icon sizing.

### B. React Composition Patterns (`.agents/skills/vercel-composition-patterns`)

1. **Avoid Boolean Prop Proliferation**:
   - Do not accumulate boolean flags (`isCompact`, `hasHeader`, `isEditable`, `showFooter`) on a single component.
   - Replace complex boolean configs with compound components and layout composition.

2. **Compound Components & Context**:
   - Structure multi-part components using shared internal context (e.g., `<Card><Card.Header /><Card.Body /></Card>`).
   - Keep state handling encapsulated inside Provider components.

3. **Explicit Variants & Children Composition**:
   - Use explicit variant components (e.g., `<PrimaryButton />`, `<GhostButton />`) instead of mode props.
   - Prefer passing `children` for structural customization over render props (`renderHeader`, `renderFooter`).

4. **React 19 Standards**:
   - Do not use `forwardRef`; pass `ref` directly as a component prop.
   - Use React 19 `use()` API for unwrapping promises and context where applicable.

### C. Performance & Optimization Guidelines (`.agents/skills/vercel-react-best-practices`)

1. **Eliminate Waterfalls**:
   - Check cheap synchronous conditions before awaiting promises.
   - Parallelize independent async operations using `Promise.all()`.
   - Utilize Suspense boundaries for streaming UI content.

2. **Bundle Size & Dynamic Imports**:
   - Avoid importing from barrel files that re-export massive modules; import directly from source subpaths when necessary.
   - Defer non-critical or heavy component imports using `next/dynamic` or `React.lazy`.
   - Defer third-party scripts (analytics, telemetry) until after hydration.

3. **Re-render Optimization**:
   - Do not subscribe to state inside component bodies if that state is only read within event callbacks (use `useRef`).
   - Derive state during render rather than syncing state via `useEffect`.
   - Use functional state updates (`setState(prev => ...)`).
   - Pass initializer functions to `useState` for heavy initial computations (`useState(() => initialVal())`).
   - **NEVER** define sub-components inside the body of a parent component function.

4. **JavaScript & Execution Speed**:
   - Return early from functions to simplify branch logic.
   - Use `Set` and `Map` for O(1) membership and key lookups instead of repeated `Array.includes()` / `Array.find()`.
   - Combine multiple `.map()` and `.filter()` operations into a single iteration or `.reduce()`.
   - Avoid creating new object/array literals inside hot render loops.
