# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

### Quick Start

```bash
# Install dependencies
pnpm install

# Local development server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Type checking
pnpm tsc --noEmit

# Linting
pnpm lint
```

### Environment Setup

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kolojnowwfkkmbairjta.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_KxXv0T9PS8z5QV21ZpHDBA_XGmJ6F1b
```

> These are **public** keys (safe to commit). Never add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.

## Architecture

### 🏗️ High-Level Structure

This is a **Next.js 15 + Supabase + shadcn/ui** event management application. The authentication system is production-ready, but the event management features are still in planning phase.

### Authentication Flow

**Middleware (Proxy Pattern)**

- `proxy.ts` (root) — Entry point for all requests
- `lib/supabase/proxy.ts` — Core session refresh logic
  - Uses `getClaims()` (JWT local parse) instead of `getUser()` for speed
  - Automatically redirects unauthenticated users to `/auth/login`
  - Whitelists paths: `/`, `/login`, `/auth/*`

**Why "proxy" instead of "middleware"?**  
Vercel Fluid Compute requires functional middleware pattern. The `proxy.ts` import in `next.config.ts` replaces traditional `middleware.ts`.

### Supabase Client Pattern

Two separate clients by context:

1. **`lib/supabase/client.ts`** — Browser/Client Components
   - `createBrowserClient` (uses `NEXT_PUBLIC_` keys)
   - Sync session state via `onAuthStateChange()`

2. **`lib/supabase/server.ts`** — Server Components/Actions
   - `createServerClient` (async, uses `cookies()` from `next/headers`)
   - **Critical**: Never use global variables (Fluid Compute incompatible)
   - Always call `await createClient()` inside each function

### Server Actions Pattern

All user mutations use React 19 `useActionState` + Server Actions:

```typescript
// lib/actions/profile.ts
"use server";

export async function updateProfile(
  _prevState: ActionResult<Profile>,
  formData: FormData,
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  // ... handle form logic
  return { success: true, data: updatedProfile };
}
```

Client side:

```typescript
// components/profile-form.tsx
"use client";

const [state, formAction, isPending] = useActionState(
  updateProfile,
  initialState,
);
// <form action={formAction}>
```

**Key patterns:**

- Use `ActionResult<T>` type for typed responses (success/error)
- Never `throw` from server actions in client-facing flows — always `return { success: false, error }`
- Use `redirect()` for auth failures (forces server-side redirect)

## Directory Structure

```
├── app/
│   ├── auth/                    # Authentication pages & handlers
│   │   ├── login, sign-up, forgot-password, etc.
│   │   └── confirm/route.ts     # OTP email verification
│   ├── protected/               # Authenticated user routes (proxy guards)
│   │   ├── layout.tsx           # Protected layout (navbar + footer)
│   │   ├── page.tsx             # Dashboard
│   │   └── profile/             # User profile (NEW)
│   │       └── page.tsx         # Profile view & edit
│   ├── layout.tsx               # Root layout (ThemeProvider, Geist font)
│   ├── page.tsx                 # Home (public)
│   └── globals.css              # Tailwind imports
│
├── components/
│   ├── ui/                      # shadcn/ui components (new-york style)
│   │   ├── button.tsx, input.tsx, card.tsx, badge.tsx, etc.
│   │   └── textarea.tsx         # Custom (not in shadcn/ui)
│   ├── auth-button.tsx          # Login/logout toggle
│   ├── login-form.tsx           # Client form (useActionState)
│   ├── sign-up-form.tsx
│   ├── profile-form.tsx         # NEW: Profile edit form
│   └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client (async)
│   │   └── proxy.ts             # Session refresh (used by root proxy.ts)
│   ├── actions/
│   │   └── profile.ts           # NEW: Server actions for profiles
│   └── utils.ts                 # cn(), hasEnvVars
│
├── types/
│   └── database.ts              # NEW: Profile types (single source of truth)
│
├── proxy.ts                     # Entry point for middleware (root level)
├── tsconfig.json                # Path alias: @/* → ./
├── next.config.ts               # cacheComponents: true
├── tailwind.config.ts           # Theme colors
└── components.json              # shadcn/ui registry (new-york style)
```

## Key Conventions

### Type Safety

- **No `any` types** — strict mode enabled
- **Database types**: Keep in `types/database.ts` (single source of truth)
- Use discriminated unions for API responses: `ActionResult<T>` = `{ success: true; data: T } | { success: false; error: string }`

### Components

- **Naming**: PascalCase for components (e.g., `ProfileForm`, `AuthButton`)
- **"use client" placement**: Only at the leaf where interactivity is needed
- **Server Components by default**: Minimize JavaScript sent to browser

### Forms

- **Validation**: On server (server actions), not client
- **FormData pattern**: Use native HTML forms + `useActionState` instead of `useFormContext` or state refs
- **Checkbox in FormData**: Use native `<input type="checkbox" />`, not shadcn `Checkbox` (Radix button doesn't serialize)

### Database

- **No TypeScript auto-generation yet**: Currently using manual `types/database.ts`
- **Future migration**: Use `supabase gen types typescript` after schema stabilizes
- **RLS is mandatory**: All tables must have Row Level Security policies

### Styling

- **CSS Framework**: Tailwind CSS with `tailwindcss-animate`
- **Theming**: `next-themes` (dark/light modes via `<ThemeSwitcher />`)
- **Component library**: shadcn/ui "new-york" style (defined in `components.json`)

## Recent Additions (Profile Management)

As of 2026-04-28, a complete user profile system has been implemented:

### Database Schema

New `profiles` table linked to `auth.users`:

- Auto-created on signup via `handle_new_user()` trigger
- Fields: `display_name`, `bio`, `avatar_url`, `phone`, `role` (attendee/organizer/admin), `is_public`
- RLS policies: Users can read own profile + public profiles, update own only
- Updated at trigger for automatic `updated_at` timestamp

### Code Files Added

1. **`types/database.ts`** — Profile interface + ActionResult type
2. **`lib/actions/profile.ts`** — `getMyProfile()`, `updateProfile()` server actions
3. **`components/ui/textarea.tsx`** — Textarea component (not in shadcn/ui)
4. **`components/profile-form.tsx`** — Profile edit form (Client Component)
5. **`app/protected/profile/page.tsx`** — Profile page with stats header
6. **`app/protected/layout.tsx`** — Added "프로필" nav link

### Important Notes

- Server action `updateProfile` uses `FormData` (native form submission pattern)
- Fallback INSERT in `getMyProfile()` handles trigger failures
- Validation is server-side only (length checks in action, not in form)
- Error messages returned via `ActionResult`, never thrown

## Authentication State

Check user auth status with:

```typescript
// Server Component
const { data: claimsData } = await supabase.auth.getClaims();
const userId = claimsData?.claims?.sub;

// Client Component
const supabase = createBrowserClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

The proxy middleware enforces auth for `/protected/*` routes. Unauthenticated users are redirected to `/auth/login`.

## Common Tasks

### Add a New Protected Page

1. Create `app/protected/[feature]/page.tsx` (proxy middleware guards it)
2. Use `getMyProfile()` to access current user info
3. Use server actions for mutations

### Modify Auth Forms

- Forms are in `components/` (e.g., `login-form.tsx`)
- They use `"use client"` + `useState` + server action (manual form submission style, not React Hook Form)
- Success typically redirects via `redirect()` from server action

### Add a New UI Component from shadcn/ui

```bash
npx shadcn-ui@latest add [component-name]
```

This updates `components.json` and adds to `components/ui/`.

### Query Supabase (Beyond Auth)

Use server actions + `createClient()` from `lib/supabase/server`:

```typescript
// lib/actions/events.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getMyEvents() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", claimsData.claims.sub);

  return data;
}
```

## Deployment

- **Hosting**: Vercel (optimized for Next.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, managed JWTs)

Environment variables are automatically synced via the Supabase Vercel Integration.
