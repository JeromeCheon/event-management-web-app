# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 개발

### 빠른 시작

```bash
# 의존성 설치
pnpm install

# 로컬 개발 서버 (http://localhost:3000)
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start

# 타입 검사
pnpm type-check

# 린트 검사
pnpm lint

# 린트 자동 수정
pnpm lint:fix

# 코드 포맷
pnpm format

# 포맷 검사만
pnpm format:check
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://kolojnowwfkkmbairjta.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_KxXv0T9PS8z5QV21ZpHDBA_XGmJ6F1b
```

> 위 키는 **공개 키**입니다 (커밋 안전). `SUPABASE_SERVICE_ROLE_KEY`는 절대 `.env.local`에 추가하지 마세요.

## 개발 도구

### Prettier

- 코드 포매터: `pnpm format` (전체 포맷), `pnpm format:check` (검사만)
- `prettier-plugin-tailwindcss`로 Tailwind 클래스 자동 정렬
- 설정 파일: `.prettierrc`

### ESLint

- `pnpm lint` — 검사, `pnpm lint:fix` — 자동 수정
- 추가 규칙:
  - `eslint-plugin-unused-imports`: 미사용 import 자동 제거
  - `eslint-plugin-simple-import-sort`: import 순서 자동 정렬
  - `@typescript-eslint/no-explicit-any`: `any` 타입 사용 금지
  - `@typescript-eslint/consistent-type-imports`: `import type` 강제

### 타입 검사

- `pnpm type-check` — `tsc --noEmit` 실행 (전체 프로젝트 타입 검사)

### Git Hooks (Husky + lint-staged)

- **pre-commit**: staged 파일에 ESLint(`--max-warnings 0`) + Prettier 자동 실행
- **pre-push**: 전체 TypeScript 타입 검사 실행
- 경고가 하나라도 있으면 커밋이 차단됩니다

## 아키텍처

### 고수준 구조

**Next.js 16 + Supabase + shadcn/ui** 기반 이벤트 관리 앱입니다. 인증 시스템은 완성되어 있으며, 이벤트 관리 기능은 기획 단계입니다.

### 인증 흐름

**미들웨어 (프록시 패턴)**

- `proxy.ts` (루트) — 모든 요청의 진입점
- `lib/supabase/proxy.ts` — 세션 갱신 핵심 로직
  - 속도를 위해 `getUser()` 대신 `getClaims()` (JWT 로컬 파싱) 사용
  - 미인증 사용자를 자동으로 `/auth/login`으로 리다이렉트
  - 화이트리스트 경로: `/`, `/login`, `/auth/*`

**왜 "proxy"인가?**  
Vercel Fluid Compute는 함수형 미들웨어 패턴을 요구합니다. `next.config.ts`에서 `proxy.ts`를 import하여 전통적인 `middleware.ts`를 대체합니다.

### Supabase 클라이언트 패턴

컨텍스트에 따라 두 개의 별도 클라이언트를 사용합니다:

1. **`lib/supabase/client.ts`** — 브라우저/클라이언트 컴포넌트
   - `createBrowserClient` (`NEXT_PUBLIC_` 키 사용)
   - `onAuthStateChange()`로 세션 상태 동기화

2. **`lib/supabase/server.ts`** — 서버 컴포넌트/액션
   - `createServerClient` (비동기, `next/headers`의 `cookies()` 사용)
   - **중요**: 전역 변수 사용 금지 (Fluid Compute 비호환)
   - 각 함수 내부에서 `await createClient()` 호출

### 서버 액션 패턴

모든 사용자 뮤테이션은 React 19 `useActionState` + Server Actions를 사용합니다:

```typescript
// lib/actions/profile.ts
"use server";

export async function updateProfile(
  _prevState: ActionResult<Profile>,
  formData: FormData,
): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  // ... 폼 로직 처리
  return { success: true, data: updatedProfile };
}
```

클라이언트 측:

```typescript
// components/profile-form.tsx
"use client";

const [state, formAction, isPending] = useActionState(
  updateProfile,
  initialState,
);
// <form action={formAction}>
```

**핵심 패턴:**

- 타입이 있는 응답에 `ActionResult<T>` 타입 사용 (성공/실패)
- 클라이언트 facing 서버 액션에서 절대 `throw` 금지 — 항상 `return { success: false, error }` 반환
- 인증 실패 시 `redirect()` 사용 (서버 사이드 리다이렉트 강제)

## 디렉토리 구조

```
├── app/
│   ├── auth/                    # 인증 페이지 및 핸들러
│   │   ├── login, sign-up, forgot-password 등
│   │   └── confirm/route.ts     # OTP 이메일 인증
│   ├── protected/               # 인증 필요 라우트 (proxy 보호)
│   │   ├── layout.tsx           # 보호된 레이아웃 (네비바 + 푸터)
│   │   ├── page.tsx             # 대시보드
│   │   └── profile/             # 사용자 프로필
│   │       └── page.tsx         # 프로필 조회 및 수정
│   ├── layout.tsx               # 루트 레이아웃 (ThemeProvider, Geist 폰트)
│   ├── page.tsx                 # 홈 (공개)
│   └── globals.css              # Tailwind 임포트
│
├── components/
│   ├── ui/                      # shadcn/ui 컴포넌트 (new-york 스타일)
│   │   ├── button.tsx, input.tsx, card.tsx, badge.tsx 등
│   │   └── textarea.tsx         # 커스텀 (shadcn/ui 미포함)
│   ├── auth-button.tsx          # 로그인/로그아웃 토글
│   ├── login-form.tsx           # 클라이언트 폼 (useActionState)
│   ├── sign-up-form.tsx
│   ├── profile-form.tsx         # 프로필 수정 폼
│   └── ...
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # 브라우저 클라이언트
│   │   ├── server.ts            # 서버 클라이언트 (async)
│   │   └── proxy.ts             # 세션 갱신 (루트 proxy.ts에서 사용)
│   ├── actions/
│   │   └── profile.ts           # 프로필 서버 액션
│   └── utils.ts                 # cn(), hasEnvVars
│
├── types/
│   └── database.ts              # 프로필 타입 (단일 진실 공급원)
│
├── proxy.ts                     # 미들웨어 진입점 (루트 레벨)
├── tsconfig.json                # 경로 별칭: @/* → ./
├── next.config.ts               # cacheComponents: true
├── tailwind.config.ts           # 테마 색상
└── components.json              # shadcn/ui 레지스트리 (new-york 스타일)
```

## 핵심 컨벤션

### 타입 안전성

- **`any` 타입 금지** — strict 모드 활성화, ESLint로도 강제
- **데이터베이스 타입**: `types/database.ts`에 유지 (단일 진실 공급원)
- API 응답에 discriminated union 사용: `ActionResult<T>` = `{ success: true; data: T } | { success: false; error: string }`

### 컴포넌트

- **네이밍**: 컴포넌트는 PascalCase (예: `ProfileForm`, `AuthButton`)
- **"use client" 위치**: 인터랙티브가 필요한 리프 컴포넌트에만 배치
- **기본 서버 컴포넌트**: 브라우저로 전송되는 JavaScript 최소화

### 폼

- **유효성 검사**: 클라이언트가 아닌 서버(서버 액션)에서 수행
- **FormData 패턴**: `useFormContext`나 state ref 대신 네이티브 HTML 폼 + `useActionState` 사용
- **FormData의 Checkbox**: Radix 버튼은 직렬화되지 않으므로 shadcn `Checkbox` 대신 네이티브 `<input type="checkbox" />` 사용

### 데이터베이스

- **TypeScript 자동 생성 미사용**: 현재 수동으로 `types/database.ts` 관리
- **향후 마이그레이션**: 스키마 안정화 후 `supabase gen types typescript` 사용
- **RLS 필수**: 모든 테이블에 행 수준 보안 정책 적용

### 스타일링

- **CSS 프레임워크**: `tailwindcss-animate` 포함 Tailwind CSS
- **테마**: `next-themes` (다크/라이트 모드, `<ThemeSwitcher />` 경유)
- **컴포넌트 라이브러리**: shadcn/ui "new-york" 스타일 (`components.json`에 정의)

## 최근 추가 사항 (프로필 관리)

2026-04-28 기준, 완전한 사용자 프로필 시스템이 구현되었습니다:

### 데이터베이스 스키마

`auth.users`와 연결된 `profiles` 테이블:

- 회원가입 시 `handle_new_user()` 트리거로 자동 생성
- 필드: `display_name`, `bio`, `avatar_url`, `phone`, `role` (attendee/organizer/admin), `is_public`
- RLS 정책: 본인 프로필 + 공개 프로필 읽기 가능, 본인 프로필만 수정 가능
- `updated_at` 자동 갱신 트리거

### 추가된 코드 파일

1. **`types/database.ts`** — Profile 인터페이스 + ActionResult 타입
2. **`lib/actions/profile.ts`** — `getMyProfile()`, `updateProfile()` 서버 액션
3. **`components/ui/textarea.tsx`** — Textarea 컴포넌트 (shadcn/ui 미포함)
4. **`components/profile-form.tsx`** — 프로필 수정 폼 (클라이언트 컴포넌트)
5. **`app/protected/profile/page.tsx`** — 통계 헤더 포함 프로필 페이지
6. **`app/protected/layout.tsx`** — "프로필" 네비게이션 링크 추가

### 중요 참고사항

- 서버 액션 `updateProfile`은 FormData 사용 (네이티브 폼 제출 패턴)
- `getMyProfile()`의 폴백 INSERT로 트리거 실패 처리
- 유효성 검사는 서버 사이드 전용 (액션에서 길이 체크, 폼에서는 미수행)
- 에러 메시지는 `ActionResult`로 반환, 절대 throw 금지

## 인증 상태 확인

```typescript
// 서버 컴포넌트
const { data: claimsData } = await supabase.auth.getClaims();
const userId = claimsData?.claims?.sub;

// 클라이언트 컴포넌트
const supabase = createBrowserClient();
const {
  data: { user },
} = await supabase.auth.getUser();
```

프록시 미들웨어가 `/protected/*` 라우트의 인증을 강제합니다. 미인증 사용자는 `/auth/login`으로 리다이렉트됩니다.

## 자주 하는 작업

### 새 보호 페이지 추가

1. `app/protected/[feature]/page.tsx` 생성 (proxy 미들웨어가 자동으로 보호)
2. `getMyProfile()`로 현재 사용자 정보 접근
3. 뮤테이션은 서버 액션 사용

### 인증 폼 수정

- 폼은 `components/`에 위치 (예: `login-form.tsx`)
- `"use client"` + `useState` + 서버 액션 사용 (React Hook Form 미사용, 수동 폼 제출 방식)
- 성공 시 서버 액션의 `redirect()`로 리다이렉트

### shadcn/ui 컴포넌트 추가

```bash
npx shadcn-ui@latest add [component-name]
```

`components.json`이 업데이트되고 `components/ui/`에 파일이 추가됩니다.

### Supabase 쿼리 (인증 외)

`lib/supabase/server`의 `createClient()`를 서버 액션에서 사용합니다:

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

## 배포

- **호스팅**: Vercel (Next.js 최적화)
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (이메일/비밀번호, 관리형 JWT)

환경 변수는 Supabase Vercel Integration을 통해 자동으로 동기화됩니다.
