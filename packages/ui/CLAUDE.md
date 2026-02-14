# @puckhub/ui

Shared UI component library — shadcn/ui-style components with Tailwind CSS, CVA variants, and React 19.

## Components (11 files, 13 exports)

| Component | File | Pattern | Notes |
|-----------|------|---------|-------|
| `Button` | `button.tsx` | CVA + forwardRef | Variants: default, destructive, outline, secondary, ghost, link, accent |
| `Card` (+ Header, Title, Description, Content) | `card.tsx` | forwardRef | 5 sub-components |
| `Input` | `input.tsx` | forwardRef | Handles file inputs, focus rings |
| `Label` | `label.tsx` | forwardRef | Simple label wrapper |
| `Textarea` | `textarea.tsx` | forwardRef | Auto-style matching Input |
| `Badge` | `badge.tsx` | CVA + forwardRef | Variants: default, secondary, outline, accent, destructive |
| `Dialog` (+ Content, Header, Title, Description, Footer, Close) | `dialog.tsx` | Native `<dialog>` | Uses `showModal()`, backdrop click to close |
| `FormField` | `form-field.tsx` | Props-based | Wraps children with label + error + description |
| `Skeleton` | `skeleton.tsx` | Simple | CSS animation via `.skeleton` class |
| `ColorInput` | `color-input.tsx` | Composite | Color picker + hex text input |
| `Toaster` + `toast` | `sonner.tsx` | Wrapper | Pre-configured Sonner (bottom-right, Outfit font) |

## Utility

```ts
import { cn } from '@puckhub/ui'  // clsx + tailwind-merge
```

## Design Patterns

- **CVA** (`class-variance-authority`) for variant-based components (Button, Badge)
- **`React.forwardRef`** on all DOM-wrapping components
- **`cn()`** for merging Tailwind classes — always use for `className` props
- **`displayName`** set on all forwardRef components
- Props extend native HTML attributes + CVA `VariantProps`

## Adding a New Component

1. Create `src/components/{name}.tsx`
2. Use `forwardRef` pattern, accept `className` prop, merge with `cn()`
3. Export from `src/index.ts`

## Theme (CSS Variables in `globals.css`)

Colors use HSL format: `--primary: 215 55% 23%` (dark blue), `--secondary: 354 85% 42%` (red), `--accent: 44 87% 65%` (gold). Sidebar has separate dark theme variables (`--sidebar-bg: #0C1929`).

## Exports

```ts
import { Button, Card, Input, Dialog, Badge, ... } from '@puckhub/ui'
import '@puckhub/ui/globals.css'  // Tailwind theme + base styles
```
