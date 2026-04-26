# Tavit Design System

## Overview
Tavit is a GST compliance and Tally integration SaaS for Indian businesses. The UI uses a dark-first olive/sage/cream palette with a clean, data-dense aesthetic. There is no external component library — all components are hand-built with Tailwind v4 and inline styles.

## Color Tokens
All tokens are defined as CSS variables in `src/app/globals.css`.

### Brand palette (always use these; never raw hex)
| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--ink` | `#1e2118` | — | Darkest text / backgrounds |
| `--olive` | `#5a7a3a` | — | Mid-green, borders, secondary actions |
| `--olive-mid` | `#4a6630` | — | Hover state for olive |
| `--sage` | `#7ea860` | — | Primary interactive color |
| `--sage-light` | `#9cc47a` | — | Hover / highlight on sage |
| `--cream` | `#e8ddb5` | — | Off-white body text on dark bg |
| `--cream-dark` | `#d4c490` | — | Dimmed cream |
| `--surface` | `#1a1f14` | — | Card / panel background |
| `--surface-input` | `#111510` | — | Input field background |
| `--border-subtle` | `rgba(90,122,58,0.2)` | — | Hairline borders |
| `--border-focus` | `rgba(126,168,96,0.6)` | — | Focus ring color |
| `--text-muted` | `rgba(232,221,181,0.45)` | — | Placeholder / disabled text |
| `--text-dim` | `rgba(232,221,181,0.65)` | — | Secondary body text |

### Semantic tokens (shadcn-compatible)
`--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--radius` (0.5rem)

### Chart palette
`--chart-1` through `--chart-5` (greens / dark greens)

### Sidebar tokens
`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`

## Typography
- **Sans**: Geist Sans (loaded via `next/font/google` in root layout)
- **Mono**: Geist Mono (loaded via `next/font/google` in root layout)
- Applied via CSS variables `--font-geist-sans` and `--font-geist-mono` on `<html>`
- Body font is `Arial, Helvetica, sans-serif` as fallback in globals.css

## Utility Classes
```css
/* Gradient text — used on hero headlines and CTAs */
.gradient-text {
  background: linear-gradient(135deg, #7ea860 0%, #9cc47a 60%, #b8e095 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Glassmorphism card — used on feature and testimonial cards */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 1px 3px rgba(30, 33, 24, 0.06);
}
```

## Component Conventions
- **Styling**: Prefer inline style objects for component-scoped styles; use Tailwind utility classes for spacing/layout
- **Class merging**: Always use `cn()` from `@/lib/utils` (wraps `clsx` + `tailwind-merge`)
- **No external UI library**: Do not import shadcn/ui, Radix, or MUI — build from primitives
- **Client components**: Add `'use client'` only when using hooks, event handlers, or browser APIs
- **Server components**: Default for pages and data-fetching components
- **TypeScript**: Strict mode — all props must be typed, no `any`

## Layout Patterns
- **Sidebar**: Fixed left nav, 220px wide, `position: fixed`, dark background (`--sidebar`)
- **Main content**: `marginLeft: 220px` offset with `padding: 2rem`
- **Dashboard pages**: Full height with `min-height: 100vh`
- **Forms**: Centered, max-width ~440px, dark card background

## Animation Patterns
- **Framer Motion**: Used for page-level fade-ins and stagger effects
  ```tsx
  // Typical fade-up entry
  initial={{ opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  ```
- **Stagger children**: `staggerChildren: 0.08` on parent variants
- **Three.js**: Used only for the homepage dotted-surface hero — not for UI components

## Border Radius
- Default: `var(--radius)` = `0.5rem` (8px)
- Inputs and buttons: `0.5rem`
- Cards: `0.75rem`–`1rem`

## Shadows & Elevation
- Panels: `box-shadow: 0 1px 3px rgba(30,33,24,0.08)`
- Modals / popovers: `box-shadow: 0 8px 32px rgba(0,0,0,0.4)`

## Key File Paths
| File | Purpose |
|------|---------|
| `src/app/globals.css` | All CSS variables and global utilities |
| `src/lib/utils.ts` | `cn()` — the only className utility to use |
| `src/lib/validation.ts` | GSTIN / PAN validators |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client + admin |
| `src/components/dashboard/Sidebar.tsx` | Fixed nav — reference for layout context |
| `src/components/theme-provider.tsx` | Theme wrapper (next-themes) |
