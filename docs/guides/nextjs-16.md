# Next.js 16 개발 지침

이 문서는 Claude Code에서 Next.js 16 (v16.2.2 기준) 프로젝트를 개발할 때 따라야 할 핵심 규칙과 가이드라인을 제공합니다.

> **v15 → v16 주요 변경점 요약**
> - `fetch`가 기본적으로 **캐시되지 않음** (v15와 반대)
> - `unstable_cacheLife` / `unstable_cacheTag` → **`cacheLife` / `cacheTag`** (stable 승격)
> - **`'use cache'` 디렉티브** 도입: 새로운 Cache Components 모델
> - `unauthorized()` / `forbidden()`이 `next/server` → **`next/navigation`** 으로 이동
> - **Turbopack 파일시스템 캐시** 실험적 지원 추가
> - `dynamic = "force-dynamic"` 더 이상 필요 없음 (기본이 dynamic)

---

## 🚀 필수 규칙 (엄격 준수)

### App Router 아키텍처

```typescript
// ✅ 올바른 방법: App Router 사용
app/
├── layout.tsx          // 루트 레이아웃
├── page.tsx            // 메인 페이지
├── loading.tsx         // 로딩 UI (Suspense fallback 자동 래핑)
├── error.tsx           // 에러 UI
├── not-found.tsx       // 404 페이지
├── unauthorized.tsx    // 🔄 v16: 401 UI (unauthorized() 호출 시 렌더링)
├── forbidden.tsx       // 🔄 v16: 403 UI (forbidden() 호출 시 렌더링)
└── dashboard/
    ├── layout.tsx
    └── page.tsx

// ❌ 금지: Pages Router 사용
pages/
├── index.tsx
└── dashboard.tsx
```

### Server Components 우선 설계

```typescript
// 🚀 필수: 기본적으로 모든 컴포넌트는 Server Components
export default async function UserDashboard() {
  const user = await getUser()

  return (
    <div>
      <h1>{user.name}님의 대시보드</h1>
      {/* 상호작용이 필요한 경우에만 Client Component로 분리 */}
      <InteractiveChart data={user.analytics} />
    </div>
  )
}

// ✅ Client Component는 리프 노드에만 최소 배치
'use client'

import { useState } from 'react'

export function InteractiveChart({ data }: { data: Analytics[] }) {
  const [range, setRange] = useState('week')
  return <Chart data={data} range={range} />
}
```

### 🔄 async params / searchParams (v15 이후 필수, v16에서도 동일)

```typescript
// ✅ 올바른 방법: params와 searchParams는 Promise — await 필수
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const { page = '1', sort = 'asc' } = await searchParams

  const user = await getUser(id)
  return <UserProfile user={user} />
}

// generateMetadata도 동일하게 async 처리
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  return { title: `페이지 - ${slug}` }
}

// ✅ Client Component에서는 React.use()로 언래핑
'use client'

import { use } from 'react'

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = use(params)
  const { query } = use(searchParams)
}

// ❌ 금지: 동기식 접근 (v15+ deprecated, v16에서 에러)
export default function Page({ params }: { params: { id: string } }) {
  const user = getUser(params.id) // 에러 발생
}
```

---

## 🆕 v16 신기능: Cache Components 모델

### `'use cache'` 디렉티브

v16의 핵심 변경사항입니다. 기본적으로 모든 페이지는 **동적(dynamic)** 이며, `'use cache'`를 명시한 범위만 캐시됩니다.

```typescript
// ✅ 페이지 단위 캐시
export default async function ProductPage() {
  'use cache'
  cacheLife('hours') // 1시간 캐시

  const products = await getProducts()
  return <ProductList products={products} />
}

// ✅ 컴포넌트 단위 캐시 (더 세밀한 제어)
import { cacheLife, cacheTag } from 'next/cache' // 🔄 v16: unstable_ 접두사 제거

async function ProductCard({ id }: { id: string }) {
  'use cache'
  cacheLife('minutes')           // 미리 정의된 프로파일 사용
  cacheTag(`product-${id}`)     // 태그 기반 무효화

  const product = await getProduct(id)
  return <Card product={product} />
}

// ✅ cacheLife 프로파일 종류
// 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
// 또는 커스텀: cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
```

### `fetch` 기본 캐시 정책 변경 (⚠️ Breaking Change)

```typescript
// ❌ v16에서 fetch는 기본적으로 캐시되지 않음
export default async function RootLayout() {
  const a = await fetch('https://api.example.com/data') // 캐시 없음
  const b = await fetch('https://api.example.com/data', {
    cache: 'force-cache', // ✅ 명시적으로 캐시 활성화
  })
}

// ✅ 페이지/레이아웃 전체에 캐시 기본값 적용
export const fetchCache = 'default-cache' // 이 파일 내 모든 fetch에 적용

export default async function RootLayout() {
  const a = await fetch('https://...') // fetchCache 설정으로 캐시됨
  const b = await fetch('https://...', { cache: 'no-store' }) // 개별 override
}
```

### `updateTag` — 즉시 캐시 무효화

```typescript
// 🔄 v16: updateTag로 Read-Your-Own-Writes 패턴 지원
// (revalidateTag는 다음 요청부터, updateTag는 현재 요청에 즉시 반영)
import { updateTag, revalidateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  'use server'

  const post = await db.post.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    },
  })

  // 생성 후 즉시 목록과 개별 캐시 무효화
  updateTag('posts')
  updateTag(`post-${post.id}`)

  redirect(`/posts/${post.id}`) // 리다이렉트 후 사용자가 바로 새 데이터 확인
}
```

---

## ✅ 권장 사항 (성능 최적화)

### Streaming과 Suspense 활용

```typescript
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      {/* 빠른 컨텐츠는 즉시 렌더링 */}
      <QuickStats />

      {/* 느린 데이터는 Suspense로 분리해 스트리밍 */}
      <Suspense fallback={<SkeletonChart />}>
        <SlowChart />
      </Suspense>

      <Suspense fallback={<SkeletonTable />}>
        <SlowDataTable />
      </Suspense>
    </div>
  )
}

async function SlowChart() {
  const data = await getComplexAnalytics() // 느린 쿼리
  return <Chart data={data} />
}
```

### `after()` API — 비블로킹 후처리

```typescript
import { after } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const result = await processUserData(body)

  // 응답 반환 후 비블로킹으로 후처리 실행
  after(async () => {
    await sendAnalytics(result)
    await updateSearchIndex(result.id)
    await sendNotification(result.userId)
  })

  return Response.json({ success: true, id: result.id })
}
```

### Turbopack 파일시스템 캐시 (v16 신규)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // 개발 서버 재시작 시 Turbopack 캐시 유지 (빌드 시간 단축)
    turbopackFileSystemCacheForDev: true,
    // 프로덕션 빌드 캐시 (실험적)
    turbopackFileSystemCacheForBuild: true,

    // 패키지 임포트 최적화
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
    ],
  },
}

export default nextConfig
```

---

## ⚠️ Breaking Changes 대응

### `unauthorized()` / `forbidden()` 이동 (⚠️ Breaking Change)

```typescript
// ❌ v15 방식: next/server에서 import
import { unauthorized, forbidden } from 'next/server'

// ✅ v16 방식: next/navigation으로 이동
import { unauthorized, forbidden } from 'next/navigation'

// Server Action에서 사용 예시
'use server'

import { verifySession } from '@/app/lib/dal'
import { unauthorized, forbidden } from 'next/navigation'

export async function updateProfile(data: FormData) {
  const session = await verifySession()

  if (!session) {
    unauthorized() // app/unauthorized.tsx 렌더링
  }

  if (session.role !== 'admin') {
    forbidden() // app/forbidden.tsx 렌더링
  }
}
```

### `cacheLife` / `cacheTag` stable 승격

```typescript
// ❌ v15 방식: unstable_ 접두사 사용
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from 'next/cache'

// ✅ v16 방식: 안정화된 API
import { cacheLife, cacheTag } from 'next/cache'
```

### `dynamic = "force-dynamic"` 불필요

```typescript
// ❌ v16에서 불필요: 이미 기본값이 dynamic
export const dynamic = 'force-dynamic'

// ✅ v16: 캐시가 필요한 곳에만 명시적으로 'use cache' 추가
export default async function Page() {
  // 기본적으로 동적 렌더링
  const data = await fetchData()
  return <Component data={data} />
}
```

### React 19 Server Actions + 폼 통합

```typescript
// ✅ useFormStatus로 제출 상태 처리
'use client'

import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? '저장 중...' : '저장'}
    </button>
  )
}

// ✅ useActionState (React 19)
'use client'

import { useActionState } from 'react'
import { updateProfile } from '@/lib/actions/profile'

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateProfile, null)

  return (
    <form action={formAction}>
      <input name="name" />
      <SubmitButton />
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
```

---

## 🔄 Route Groups 고급 패턴

```typescript
// ✅ Route Groups로 레이아웃 분리 (URL에 영향 없음)
app/
├── (marketing)/
│   ├── layout.tsx     // 마케팅 레이아웃
│   └── page.tsx       // /
├── (dashboard)/
│   ├── layout.tsx     // 대시보드 레이아웃
│   └── analytics/
│       └── page.tsx   // /analytics
└── (auth)/
    ├── login/
    │   └── page.tsx   // /login
    └── register/
        └── page.tsx   // /register
```

### Parallel Routes

```typescript
// ✅ 동시에 여러 슬롯을 렌더링
app/dashboard/
├── layout.tsx
├── page.tsx
├── @analytics/
│   └── page.tsx
└── @notifications/
    └── page.tsx

// dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  notifications,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div className="grid">
      <main>{children}</main>
      <Suspense fallback={<AnalyticsSkeleton />}>{analytics}</Suspense>
      <Suspense fallback={<NotificationsSkeleton />}>{notifications}</Suspense>
    </div>
  )
}
```

---

## ❌ 금지 사항

```typescript
// ❌ Pages Router 패턴 (완전 금지)
pages/
├── _app.tsx
└── api/users.ts

// ❌ getServerSideProps / getStaticProps 사용 금지
export async function getServerSideProps() { ... }

// ❌ 불필요한 'use client' 남발
'use client'
export default function SimpleText({ text }: { text: string }) {
  return <p>{text}</p> // 상태/이벤트 없으면 Server Component로
}

// ❌ v16에서 unstable_ 접두사 사용
import { unstable_cacheLife } from 'next/cache' // 제거됨

// ❌ fetch 캐시 동작을 v15와 동일하게 가정
const data = await fetch('/api/data') // v16에서는 캐시 안 됨 — 명시 필요
```

---

## 코드 품질 체크리스트

```bash
# 🚀 필수: 타입 검사
pnpm type-check

# 🚀 필수: 린트 검사
pnpm lint

# ✅ 권장: 포맷 검사
pnpm format:check

# 🚀 필수: 프로덕션 빌드 테스트
pnpm build
```

---

**참고 문서**

- [Next.js 16 공식 업그레이드 가이드](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Cache Components 마이그레이션 가이드](https://nextjs.org/docs/app/guides/migrating-to-cache-components)
- `/docs/guides/project-structure.md` — 프로젝트 디렉토리 구조
