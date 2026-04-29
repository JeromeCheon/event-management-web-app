# Development Guidelines

## Project Overview

- **목적**: 소규모 정기 그룹(운동 모임·스터디·동문회)의 공지·RSVP·카풀·정산을 하나의 앱에서 관리
- **스택**: Next.js 16 App Router, React 19, TypeScript, Supabase (Auth + PostgreSQL + RLS), shadcn/ui new-york, TailwindCSS v4, Vercel Fluid Compute
- **폼 패턴**: React 19 `useActionState` + Server Actions + native `FormData` (React Hook Form 미사용)
- **캐싱 모델**: 모든 페이지 기본 dynamic. 캐싱이 필요한 경우에만 `'use cache'` 디렉티브 사용

---

## Project Architecture

```
app/
  auth/               # 공개 인증 페이지 (login, sign-up, forgot-password, update-password)
  protected/          # proxy 미들웨어가 자동 보호 — 하위 모든 라우트 인증 필수
    layout.tsx        # 네비게이션 바 + 푸터 공통 레이아웃
    page.tsx          # 대시보드
    profile/
    [feature]/        # 신규 도메인은 여기 추가
components/
  ui/                 # shadcn/ui 컴포넌트 — 직접 수정 최소화
lib/
  actions/            # 서버 액션 (도메인별 파일: profile.ts, groups.ts, events.ts …)
  mock/               # UI-First 단계 1 mock 데이터 (domain별 파일)
  supabase/
    client.ts         # 브라우저 전용
    server.ts         # 서버 전용 (async createClient)
    proxy.ts          # 세션 갱신 핵심 로직 + 화이트리스트
types/
  database.ts         # 모든 DB 타입의 단일 진실 공급원
proxy.ts              # 루트 미들웨어 진입점 (middleware.ts 절대 사용 금지)
```

---

## UI-First 개발 철학 (필수 준수)

각 도메인은 반드시 아래 3단계를 순서대로 진행한다.

| 단계 | 작업 내용 | 파일 위치 |
|------|----------|-----------|
| **1 — UI 마크업** | `types/database.ts`에 타입 선언, `lib/mock/[domain].ts`에 mock 데이터, 페이지·컴포넌트 마크업 완성, 폼 핸들러는 `console.log` stub | `lib/mock/`, `types/database.ts`, `app/protected/[feature]/` |
| **2 — DB 스키마** | Supabase 마이그레이션 작성, RLS 정책, `types/database.ts` 실제 컬럼과 동기화 | `supabase/migrations/`, `types/database.ts` |
| **3 — 서버 액션 통합** | `lib/actions/[domain].ts` 구현, mock import 제거, `useActionState` 연결, Playwright E2E | `lib/actions/`, 각 컴포넌트 |

- **단계 1 완료 후 반드시 사용자 검토 요청 후 단계 2 진행**
- **단계 2 완료 후 스키마 리뷰 후 단계 3 진행**
- 단계를 건너뛰거나 역순으로 진행하지 않는다

---

## 라우팅 & 미들웨어 규칙

- **`middleware.ts` 파일을 절대 생성하지 않는다** — 루트 `proxy.ts`가 미들웨어 역할을 한다
- 인증이 필요한 신규 페이지 → `app/protected/[feature]/page.tsx` 생성 (proxy 자동 적용, 추가 설정 불필요)
- 공개 경로 추가 시 → `lib/supabase/proxy.ts`의 화이트리스트에 경로 추가 필수
- 현재 화이트리스트: `/`, `/login`, `/auth/*`

---

## Supabase 클라이언트 규칙

- **서버 컴포넌트 / 서버 액션**: 반드시 `await createClient()` 를 함수 내부에서 호출
  ```typescript
  // 올바름
  export async function myAction() {
    const supabase = await createClient(); // 함수 내부에서 호출
  }
  // 금지: 모듈 레벨 전역 변수
  const supabase = await createClient(); // ❌ Fluid Compute 비호환
  ```
- **클라이언트 컴포넌트**: `createBrowserClient()` 사용 (`lib/supabase/client.ts`)
- **인증 상태 확인**:
  - 서버: `supabase.auth.getClaims()` (JWT 로컬 파싱, 빠름)
  - 클라이언트: `supabase.auth.getUser()` (네트워크 요청)
- 인증 없는 사용자 처리: 서버 액션에서 `redirect("/auth/login")` 사용

---

## 서버 액션 패턴

- 모든 서버 액션 파일에 `"use server"` 선언
- 뮤테이션 서버 액션의 시그니처:
  ```typescript
  export async function actionName(
    _prevState: ActionResult<T>,
    formData: FormData,
  ): Promise<ActionResult<T>>
  ```
- **절대 `throw`하지 않는다** — 항상 `return { success: false, error: "메시지" }` 반환
- 인증 실패 시에만 `redirect()` 사용 (throw 아님)
- 유효성 검사는 서버 액션 내부에서만 수행 (클라이언트 폼 검증 금지)
- `ActionResult<T>` 타입은 `types/database.ts`에서 import

---

## 폼 구현 규칙

- **폼 패턴**: `useActionState` + `<form action={formAction}>`
  ```typescript
  // 클라이언트 컴포넌트
  const [state, formAction, isPending] = useActionState(serverAction, initialState);
  return <form action={formAction}>...</form>;
  ```
- **Checkbox**: Radix Checkbox(`shadcn/ui`) 미사용 — 네이티브 `<input type="checkbox" name="..." value="true" />` 사용 (FormData 직렬화 호환)
- React Hook Form으로 서버 액션을 직접 연결하지 않는다

---

## 타입 관리 규칙

- **`any` 타입 절대 금지** — ESLint가 자동 차단
- **`import type`** 으로 타입만 가져올 때는 반드시 `type` 키워드 명시 (ESLint `consistent-type-imports` 강제)
- 모든 DB 관련 타입은 `types/database.ts`에서 정의 및 export
- 신규 도메인 타입 추가 시 `types/database.ts`에만 추가 (도메인 파일에 인라인 타입 선언 금지)
- `ActionResult<T>` discriminated union: `{ success: true; data: T } | { success: false; error: string }`

---

## 컴포넌트 규칙

- **`"use client"`**: 인터랙션이 필요한 리프 컴포넌트에만 부착. 서버 컴포넌트를 기본으로 한다
- **shadcn/ui 추가**: `npx shadcn-ui@latest add [component]` 명령 사용. `components/ui/` 직접 편집 최소화
- **네이밍**: 컴포넌트 파일명과 함수명 PascalCase, 나머지 camelCase
- `components/tutorial/` 디렉토리는 데모용 — 신규 기능 컴포넌트와 혼용 금지

---

## 스타일링 규칙

- Tailwind 유틸리티 클래스만 사용. 별도 CSS 파일 추가 금지 (`app/globals.css` 제외)
- shadcn/ui 테마 변수(`--primary`, `--background` 등)를 직접 덮어쓰지 않는다
- 다크/라이트 모드: `next-themes` `ThemeSwitcher` 경유, 수동 `dark:` 클래스 처리는 허용

---

## 파일 동시 수정 기준 (Multi-file Coordination)

| 작업 | 반드시 함께 수정할 파일 |
|------|------------------------|
| 신규 도메인 타입 추가 | `types/database.ts` |
| 신규 Mock 데이터 추가 | `lib/mock/[domain].ts` + `types/database.ts` |
| 신규 서버 액션 추가 | `lib/actions/[domain].ts` + `types/database.ts` (타입 확인) |
| 새 보호 페이지 추가 | `app/protected/[feature]/page.tsx` + `app/protected/layout.tsx` (네비게이션 링크) |
| 새 공개 경로 추가 | `app/[route]/page.tsx` + `lib/supabase/proxy.ts` (화이트리스트) |
| Supabase 마이그레이션 적용 | `types/database.ts` (컬럼 변경 반영) |
| ROADMAP 태스크 완료 | `docs/ROADMAP.md` (상태 업데이트) |

---

## AI 의사결정 기준

### 새 페이지를 어디에 만들 것인가?
```
인증 필요? YES → app/protected/[feature]/page.tsx
           NO  → app/[feature]/page.tsx + lib/supabase/proxy.ts 화이트리스트 추가
```

### 폼을 어떻게 구현할 것인가?
```
서버에 데이터 저장? YES → useActionState + Server Action + FormData 패턴
                   NO  → useState + 클라이언트 로직
```

### 현재 도메인이 어느 단계인가?
```
ROADMAP.md에서 [UI Mock] / [DB Schema] / [Server Action] 라벨 확인 후 해당 단계만 구현
```

### 캐싱이 필요한가?
```
자주 변경되지 않는 공개 데이터? YES → 'use cache' + cacheLife('hours') + cacheTag('tag')
그 외 모든 경우             → 캐싱 없음 (Next.js 16 기본값: dynamic)
```

---

## 금지 사항

- `middleware.ts` 파일 생성 (루트 `proxy.ts` 패턴 사용)
- 서버 액션에서 `throw new Error(...)` 사용
- 모듈 레벨 전역 Supabase 클라이언트 변수
- `any` 타입 사용
- `types/database.ts` 외부에 인라인 DB 타입 선언
- shadcn/ui Checkbox를 FormData와 함께 사용 (네이티브 `<input type="checkbox">` 사용)
- DB 스키마 없이 서버 액션 먼저 작성 (UI-First 3단계 준수)
- `pnpm` 대신 `npm` / `yarn` 사용 (패키지 매니저는 pnpm 고정)
- `components/tutorial/` 컴포넌트를 실제 기능에 재사용
