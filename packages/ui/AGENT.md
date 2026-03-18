# @puckhub/ui

Shared UI component library — shadcn/ui-style components with Tailwind CSS, CVA variants, and React 19.

## Components (25 files)

| Component | File | Pattern | Notes |
|-----------|------|---------|-------|
| `AlertDialog` (+ Content, Header, Title, Description, Footer, Action, Cancel) | `alert-dialog.tsx` | Radix UI | Accessible confirmation dialogs |
| `Avatar` (+ Image, Fallback) | `avatar.tsx` | Radix UI | User/team avatars with fallback |
| `Badge` | `badge.tsx` | CVA + forwardRef | Variants: default, secondary, outline, accent, destructive |
| `Button` | `button.tsx` | CVA + forwardRef | Variants: default, destructive, outline, secondary, ghost, link, accent |
| `Card` (+ Header, Title, Description, Content) | `card.tsx` | forwardRef | 5 sub-components |
| `Checkbox` | `checkbox.tsx` | Radix UI | Accessible checkbox with indicator |
| `ColorInput` | `colorInput.tsx` | Composite | Color picker + hex text input |
| `Command` (+ Input, List, Empty, Group, Item, Separator) | `command.tsx` | cmdk | Command palette / combobox primitive |
| `Dialog` (+ Content, Header, Title, Description, Footer, Close) | `dialog.tsx` | Native `<dialog>` | Uses `showModal()`, backdrop click to close |
| `DropdownMenu` (+ Trigger, Content, Item, Separator, Label, etc.) | `dropdown-menu.tsx` | Radix UI | Accessible dropdown menus |
| `FormField` | `formField.tsx` | Props-based | Wraps children with label + error + description |
| `HoverCard` (+ Trigger, Content) | `hover-card.tsx` | Radix UI | Hover-triggered content cards |
| `Input` | `input.tsx` | forwardRef | Handles file inputs, focus rings |
| `Label` | `label.tsx` | Radix UI | Accessible label |
| `Popover` (+ Trigger, Content, Anchor) | `popover.tsx` | Radix UI | Floating popover panels |
| `RadioGroup` (+ Item) | `radio-group.tsx` | Radix UI | Accessible radio button group |
| `ScrollArea` (+ ScrollBar) | `scroll-area.tsx` | Radix UI | Custom scrollbar styling |
| `Select` (+ Trigger, Content, Item, Value, Group, Label, Separator) | `select.tsx` | Radix UI | Accessible select dropdown |
| `Separator` | `separator.tsx` | Radix UI | Horizontal/vertical separator |
| `Sheet` (+ Trigger, Content, Header, Title, Description, Footer, Close) | `sheet.tsx` | Radix UI | Slide-out side panel (replaced some Dialog usage) |
| `Skeleton` | `skeleton.tsx` | Simple | CSS animation via `.skeleton` class |
| `Toaster` + `toast` | `sonner.tsx` | Wrapper | Pre-configured Sonner (bottom-right, Outfit font) |
| `Switch` | `switch.tsx` | Radix UI | Accessible toggle switch |
| `Tabs` (+ List, Trigger, Content) | `tabs.tsx` | Radix UI | Accessible tab navigation |
| `Textarea` | `textarea.tsx` | forwardRef | Auto-style matching Input |

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
