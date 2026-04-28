# 이벤트 관리 웹앱 개발 로드맵

소규모 정기 그룹 모임의 공지·참여자·카풀·정산을 한 곳에서 관리하는 주최자 중심 협업 도구입니다.

## 개요

본 프로젝트는 동호회·스터디·동문회 등 **소규모 정기 그룹**의 주최자를 대상으로 다음 핵심 기능을 제공합니다:

- **그룹 관리**: 8자리 초대 코드 기반의 그룹 생성·합류·멤버 관리 (F001 ~ F003, F013)
- **이벤트 운영**: 일시·장소·정원 기반 이벤트 개설과 RSVP, 수정/취소 (F004, F005, F014)
- **공지 시스템**: 그룹/이벤트 단위 공지 게시 및 핀 고정 (F006)
- **카풀 조율**: 운전자 좌석 등록과 동승 희망 매칭 (F007)
- **비용 정산**: 균등 분할 산출과 개별 납부 추적 (F008, F009)

### 기술 스택

- **프레임워크**: Next.js 16 (App Router), React 19, TypeScript
- **스타일링**: TailwindCSS v4, shadcn/ui (new-york)
- **백엔드**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Vercel (Fluid Compute)
- **상태/폼**: React 19 `useActionState` + Server Actions, FormData 네이티브 패턴
- **캐싱**: `'use cache'` 디렉티브 기반 Cache Components 모델 (Next.js 16 기본: dynamic)

## 개발 철학: UI-First 접근법

본 프로젝트는 **UI를 먼저 mock 데이터로 빠르게 구현하여 사용자 경험을 검증한 뒤, 데이터 모델을 확정하고 백엔드를 구축**하는 UI-first 방식을 채택합니다.

### 단계별 패턴

각 도메인 Phase는 다음 3단계로 순차 진행합니다:

1. **단계 1 — UI 마크업 (Mock 데이터)**
   - `lib/mock/[domain].ts`에 하드코딩 mock 데이터 작성
   - `types/database.ts`에 인터페이스 타입 선언만 (DB 미생성 상태)
   - 페이지 레이아웃·컴포넌트·폼 UI 완성
   - 폼 제출 핸들러는 `console.log` 수준의 stub으로 처리
   - 빠른 시각적 피드백으로 UX·정보 구조 검증

2. **단계 2 — DB 스키마 & Supabase 설정**
   - 단계 1에서 확정된 데이터 모델로 Supabase 마이그레이션 작성
   - RLS 정책 적용 + 트리거·함수 정의
   - `types/database.ts` 타입을 실제 컬럼과 일치시켜 완성
   - mcp__supabase 도구로 마이그레이션 검증

3. **단계 3 — 서버 액션 & 실제 데이터 통합**
   - `lib/actions/[domain].ts` 서버 액션 구현
   - Mock import를 제거하고 실제 Supabase 쿼리로 교체
   - `useActionState` 폼 핸들러 연결
   - **Playwright MCP로 E2E 테스트 수행**

### 장점

- **빠른 피드백**: 백엔드 구현 전에 UX 검증 가능
- **데이터 모델 정합성**: 실제 화면이 요구하는 필드를 기반으로 DB 설계
- **병렬 작업**: 디자인 검토와 백엔드 설계가 동시에 진행 가능
- **수정 비용 최소화**: 마이그레이션 적용 전에 데이터 모델 변경

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - `/tasks` 디렉토리에 새 작업 파일 생성
   - 명명 형식: `XXX-description.md` (예: `001-groups-ui-mock.md`)
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - **단계 표기**: 작업 제목에 `[UI Mock]`, `[DB Schema]`, `[Server Action]` 라벨 명시
   - **API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)**
   - 마지막 완료 작업을 예시로 참조 (초기 상태는 `000-sample.md` 참고)

3. **작업 구현**
   - 작업 파일의 명세서를 따름
   - **UI 단계**: mock 데이터로 시각적 완성도 확보 후 사용자 검토 요청
   - **DB 단계**: 마이그레이션 적용 전에 스키마 리뷰 (필드 누락·타입 불일치 점검)
   - **서버 액션 단계**: Playwright MCP로 E2E 테스트 수행 필수
   - 각 단계 완료 후 작업 파일 내 진행 상황 업데이트
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 ✅로 표시
   - `/docs:update-roadmap` 스킬을 활용하여 진행 상황 자동 동기화

## 현재 진행 상황

### 완료된 기능 ✅

- ✅ **F010 — 기본 인증** (이메일/비밀번호 + Google OAuth)
  - `app/auth/login`, `app/auth/sign-up`, `app/auth/forgot-password`
  - `lib/supabase/{client,server,proxy}.ts` 인증 인프라 완비
  - `proxy.ts` 미들웨어로 `/protected/*` 라우트 보호
- ✅ **F011 — 프로필 관리** (`display_name`, `bio`, `avatar_url`, `phone`, `role`, `is_public`)
  - `profiles` 테이블 + RLS + `handle_new_user()` 트리거
  - `lib/actions/profile.ts` 서버 액션 (`getMyProfile`, `updateProfile`)
  - `app/protected/profile/page.tsx`
- ✅ **F012 일부 — 대시보드 골격** (`app/protected/page.tsx`, 보호된 레이아웃)

### 다음 우선순위

- **Phase 1-A 단계 1**: 그룹 도메인 UI 마크업 (Mock 데이터) — **우선순위**

## 개발 단계

### Phase 1-A: 그룹 도메인 (F001, F002, F003, F012, F013)

> 그룹의 생성·참여·관리를 위한 도메인을 UI-first 방식으로 구축합니다.

#### 단계 1 — UI 마크업 (Mock 데이터)

- [ ] **Task 001: 그룹 도메인 타입 선언 및 Mock 데이터 구축** — 우선순위
  - `types/database.ts`에 `Group`, `GroupMember`, `GroupRole` 인터페이스 선언 (DB 미생성 상태)
  - `lib/mock/groups.ts` 생성 — 샘플 그룹 3~5개, 멤버 10~15명 시드 데이터
  - `lib/mock/index.ts` 내보내기 정리
  - mock 데이터에 다양한 케이스 포함: owner/admin/member 권한, 다양한 max_members, 빈 그룹 등
  - 추후 서버 액션 시그니처와 일치하도록 mock helper 함수 작성 (`getMockMyGroups`, `getMockGroupById` 등)

- [ ] **Task 002: 그룹 생성·참여 UI 페이지 (Mock)**
  - `app/protected/groups/new/page.tsx` — 그룹 생성 폼 (이름·설명·max_members)
  - `app/protected/groups/join/page.tsx` — 8자리 코드 입력 폼
  - `components/groups/create-group-form.tsx` — 제출 시 `console.log(formData)` stub
  - `components/groups/join-group-form.tsx` — 제출 시 mock 코드 매칭 시뮬레이션
  - 코드 복사 버튼·토스트 피드백 (sonner) UI 완성
  - 반응형 디자인 검증 (모바일 우선)

- [ ] **Task 003: 그룹 상세 및 멤버 목록 UI (Mock)**
  - `app/protected/groups/[groupId]/layout.tsx` — 그룹 컨텍스트 레이아웃 (탭 네비게이션)
  - `app/protected/groups/[groupId]/page.tsx` — 그룹 홈 (개요·다가오는 이벤트 placeholder)
  - `app/protected/groups/[groupId]/members/page.tsx` — 멤버 목록 (display_name, role 뱃지)
  - `components/groups/member-list.tsx`, `group-header.tsx`, `role-badge.tsx`
  - mock 데이터로 멤버/비멤버 분기 미리보기 (URL 파라미터 기반 토글)

- [ ] **Task 004: 대시보드 그룹 목록 UI (Mock, F012 완성)**
  - `app/protected/page.tsx` 업데이트 — `getMockMyGroups()` 호출
  - 빈 상태 UI: "그룹을 만들거나 초대 코드로 참여하세요" CTA
  - `components/dashboard/group-card.tsx` — 그룹 카드 (멤버 수·다가오는 이벤트 수·역할 뱃지)
  - 다가오는 이벤트 섹션은 placeholder로 두고 Phase 1-B에서 채움

- [ ] **Task 005: 그룹 설정 UI (Mock, F013)**
  - `app/protected/groups/[groupId]/settings/page.tsx`
  - 그룹 정보 수정 폼·초대 코드 재발급 버튼·멤버 관리 테이블·소유권 이전 다이얼로그 UI 완성
  - 권한별 버튼 노출 시뮬레이션 (mock 사용자 역할 토글)
  - 모든 mutation 핸들러는 `console.log` stub
  - 초대 코드 재발급 시 확인 다이얼로그 (shadcn `AlertDialog`)

#### 단계 2 — DB 스키마 & Supabase 설정

- [ ] **Task 006: 그룹 도메인 DB 스키마 및 RLS 마이그레이션**
  - `groups` 테이블 (id, name, description, max_members, invite_code, owner_id, created_at, updated_at)
  - `group_members` 테이블 (group_id, user_id, role: owner/admin/member, joined_at)
  - 8자리 영숫자 `invite_code` 자동 생성 함수 (`generate_invite_code()`)
  - RLS 정책: 멤버만 그룹 조회, owner/admin만 수정, owner만 삭제·코드 재발급
  - 그룹 생성 시 owner를 자동으로 `group_members`에 INSERT 트리거
  - 단계 1에서 사용한 mock 필드와 100% 일치하는지 확인 (필요 시 mock 또는 스키마 보정)
  - `types/database.ts`의 인터페이스를 실제 컬럼과 동기화

#### 단계 3 — 서버 액션 & 실제 데이터 통합

- [ ] **Task 007: 그룹 생성·참여·조회 서버 액션 (F001, F002)**
  - `lib/actions/groups.ts` 생성
  - `createGroup(formData)`: 이름·설명·최대 인원 검증 후 그룹 생성 + 초대 코드 반환
  - `joinGroupByCode(formData)`: 8자리 코드 검증 → max_members 초과 체크 → 멤버 추가
  - `getMyGroups()`, `getGroupById(id)`, `getGroupMembers(id)`
  - `ActionResult<Group>` 타입으로 통일된 응답 처리
  - Task 002~004의 mock import를 실제 서버 액션 호출로 교체
  - **테스트 체크리스트 필수**: Playwright MCP로 그룹 생성→코드 복사→다른 계정으로 참여 시나리오 검증

- [ ] **Task 008: 그룹 설정 서버 액션 및 통합 (F013)**
  - `updateGroup`, `regenerateInviteCode`, `removeMember`, `transferOwnership` 서버 액션
  - 권한 분기: owner는 모든 작업 가능, admin은 멤버 관리만
  - Task 005 UI의 stub을 서버 액션과 연결
  - **테스트 체크리스트 필수**: 권한별 버튼 노출 및 액션 차단 검증

### Phase 1-B: 이벤트 도메인 (F004, F005, F014)

> 그룹 내 이벤트 개설·RSVP·수정/취소 흐름을 UI-first로 구현합니다.

#### 단계 1 — UI 마크업 (Mock 데이터)

- [ ] **Task 009: 이벤트 도메인 타입 선언 및 Mock 데이터**
  - `types/database.ts`에 `Event`, `EventAttendee`, `RsvpStatus`, `EventStatus` 인터페이스 선언
  - `lib/mock/events.ts` — 다양한 상태(예정/취소)·정원·RSVP 분포의 이벤트 시드
  - mock helper: `getMockGroupEvents`, `getMockEventById`, `getMockEventAttendees`

- [ ] **Task 010: 이벤트 생성·수정·상세 UI 페이지 (Mock)**
  - `app/protected/groups/[groupId]/events/new/page.tsx` — 생성 폼 (제목·설명·장소·일시·정원)
  - `app/protected/groups/[groupId]/events/[eventId]/page.tsx` — 상세 + RSVP 폼 + 응답자 목록
  - `app/protected/groups/[groupId]/events/[eventId]/edit/page.tsx` — 수정 폼
  - `components/events/event-card.tsx`, `rsvp-form.tsx`, `attendee-list.tsx`
  - 일시 선택 컴포넌트 (shadcn `Calendar` + `Popover`)
  - 정원 초과·취소 상태 등 엣지 케이스 UI 미리보기

- [ ] **Task 011: 대시보드 다가오는 이벤트 UI 통합 (Mock)**
  - 대시보드의 다가오는 이벤트 섹션을 `getMockUpcomingEvents()`로 채움
  - 이벤트 카드에 RSVP 상태 뱃지 표시
  - 이벤트 카드 클릭 시 상세 페이지로 이동

#### 단계 2 — DB 스키마 & Supabase 설정

- [ ] **Task 012: 이벤트 DB 스키마 및 RLS 마이그레이션**
  - `events` 테이블 (id, group_id, title, description, location, starts_at, ends_at, max_attendees, status: scheduled/cancelled, created_by, created_at, updated_at)
  - `event_attendees` 테이블 (event_id, user_id, rsvp_status: yes/no/maybe, note, responded_at)
  - RLS: 그룹 멤버만 이벤트 조회/RSVP, 생성자·owner·admin만 수정/취소
  - 인덱스: `(group_id, starts_at)`, `(event_id, rsvp_status)`
  - `types/database.ts` 타입을 실제 컬럼과 동기화

#### 단계 3 — 서버 액션 & 실제 데이터 통합

- [ ] **Task 013: 이벤트 생성·수정·취소 서버 액션 (F004, F014)**
  - `lib/actions/events.ts`
  - `createEvent`, `updateEvent`, `cancelEvent`, `getEvent`, `getGroupEvents`, `getUpcomingEvents`
  - 일시 검증 (과거 일시 차단), max_attendees ≥ 1 검증
  - 취소 시 status='cancelled'로 soft-delete 처리
  - Task 010~011의 mock import를 실제 서버 액션으로 교체
  - **테스트 체크리스트 필수**: 비권한자의 수정 차단 + 과거 일시 차단 E2E

- [ ] **Task 014: RSVP 서버 액션 (F005)**
  - `submitRsvp(eventId, status, note)`: upsert 패턴
  - max_attendees 초과 시 'yes' 응답 차단 (현재 yes 카운트 < max_attendees)
  - `getEventAttendees(eventId)`: 응답자 목록 + 통계 (yes/no/maybe 카운트)
  - **테스트 체크리스트 필수**: 정원 초과 RSVP 차단 + RSVP 변경 시나리오

### Phase 2-A: 공지 시스템 (F006)

> 그룹·이벤트 단위 공지 작성·핀 고정·조회를 UI-first로 구현합니다.

#### 단계 1 — UI 마크업 (Mock 데이터)

- [ ] **Task 015: 공지 도메인 타입 및 Mock 데이터**
  - `types/database.ts`에 `Announcement` 인터페이스 선언 (group_id, event_id NULLABLE 포함)
  - `lib/mock/announcements.ts` — 핀 고정·일반 공지·이벤트 공지 시드
  - mock helper: `getMockGroupAnnouncements`, `getMockEventAnnouncements`

- [ ] **Task 016: 공지 UI 컴포넌트 및 페이지 (Mock)**
  - `app/protected/groups/[groupId]/announcements/page.tsx` — 그룹 공지 목록
  - 이벤트 상세 페이지에 공지 섹션 임베드
  - `components/announcements/announcement-list.tsx`, `announcement-form.tsx`, `announcement-card.tsx`
  - 핀 고정 정렬 시각화 (상단 강조)
  - 권한별 수정/삭제 메뉴 노출 시뮬레이션
  - 줄바꿈만 지원하는 텍스트 렌더링 (마크다운 미지원)

#### 단계 2 — DB 스키마 & Supabase 설정

- [ ] **Task 017: 공지 DB 스키마 및 RLS 마이그레이션**
  - `announcements` 테이블 (id, group_id, event_id NULLABLE, author_id, title, content, is_pinned, created_at, updated_at)
  - 그룹 공지: `event_id IS NULL`, 이벤트 공지: `event_id IS NOT NULL`
  - RLS: 그룹 멤버만 조회, 작성자·owner·admin만 수정/삭제, owner/admin만 핀 고정
  - 인덱스: `(group_id, is_pinned, created_at DESC)`, `(event_id, created_at DESC)`

#### 단계 3 — 서버 액션 & 실제 데이터 통합

- [ ] **Task 018: 공지 서버 액션 및 통합**
  - `lib/actions/announcements.ts`
  - `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`, `togglePin`
  - `getGroupAnnouncements(groupId)`, `getEventAnnouncements(eventId)`
  - 핀 고정 정렬 (is_pinned DESC, created_at DESC)
  - Task 016의 mock을 실제 서버 액션으로 교체
  - **테스트 체크리스트 필수**: 핀 고정 정렬 및 권한별 수정/삭제 노출 검증

### Phase 2-B: 카풀 시스템 (F007)

> 운전자 좌석 등록과 동승 희망을 UI-first로 매칭 지원합니다.

#### 단계 1 — UI 마크업 (Mock 데이터)

- [ ] **Task 019: 카풀 도메인 타입 및 Mock 데이터**
  - `types/database.ts`에 `CarpoolRequest`, `CarpoolType` 인터페이스 선언
  - `lib/mock/carpool.ts` — 운전자/동승자 다양한 분포 시드
  - mock helper: `getMockEventCarpoolList`

- [ ] **Task 020: 카풀 UI 페이지 (Mock)**
  - `app/protected/groups/[groupId]/events/[eventId]/carpool/page.tsx`
  - 운전자 섹션 (좌석·출발지·메모) + 동승 희망 섹션 분리 표시
  - `components/carpool/driver-form.tsx`, `passenger-form.tsx`, `carpool-list.tsx`
  - 이벤트 상세 페이지에서 카풀 페이지로 진입하는 CTA
  - 운전자/동승자 등록 폼 stub (제출 시 console.log)

#### 단계 2 — DB 스키마 & Supabase 설정

- [ ] **Task 021: 카풀 DB 스키마 및 RLS 마이그레이션**
  - `carpool_requests` 테이블 (id, event_id, user_id, request_type: driver/passenger, available_seats NULLABLE, departure_location NULLABLE, note, created_at)
  - 운전자: `request_type='driver'` + `available_seats > 0` + `departure_location` 필수 (CHECK)
  - 동승자: `request_type='passenger'`, 좌석/출발지 NULL 허용
  - RLS: 그룹 멤버만 조회, 본인 등록만 수정/삭제
  - UNIQUE constraint: (event_id, user_id) — 동일 이벤트 중복 등록 차단

#### 단계 3 — 서버 액션 & 실제 데이터 통합

- [ ] **Task 022: 카풀 서버 액션 및 통합**
  - `lib/actions/carpool.ts`
  - `registerDriver`, `registerPassenger`, `cancelCarpoolRequest`, `getEventCarpoolList`
  - 동일 사용자가 같은 이벤트에 driver/passenger 동시 등록 차단
  - Task 020의 mock을 실제 서버 액션으로 교체
  - **테스트 체크리스트 필수**: 중복 등록 방지 + 취소 후 재등록 시나리오

### Phase 3: 정산 시스템 (F008, F009)

> 이벤트 비용 균등 분할과 개별 납부 추적을 UI-first로 구현합니다.

#### 단계 1 — UI 마크업 (Mock 데이터)

- [ ] **Task 023: 정산 도메인 타입 및 Mock 데이터**
  - `types/database.ts`에 `Settlement`, `SettlementParticipant` 인터페이스 선언
  - `lib/mock/settlements.ts` — 다양한 납부 진행률(0%, 50%, 100%) 시드
  - mock helper: `getMockEventSettlement`

- [ ] **Task 024: 정산 UI 페이지 (Mock)**
  - `app/protected/groups/[groupId]/events/[eventId]/settlement/page.tsx`
  - 총액 입력 폼 + 참여자 목록 테이블 (이름·금액·납부 체크박스)
  - 납부 진행률 시각화 (전체 X명 중 Y명 납부 완료, Progress bar)
  - `components/settlements/settlement-form.tsx`, `participant-row.tsx`
  - 권한별 UI 분기 시뮬레이션 (생성자만 총액 수정, 본인만 납부 토글)
  - 잔돈 처리 미리보기 (예: 30,000원 ÷ 7명 = 4,285원 + 잔돈 5원)

#### 단계 2 — DB 스키마 & Supabase 설정

- [ ] **Task 025: 정산 DB 스키마 및 RLS 마이그레이션**
  - `settlements` 테이블 (id, event_id, total_amount, description, created_by, created_at)
  - `settlement_participants` 테이블 (settlement_id, user_id, share_amount, is_paid, paid_at NULLABLE)
  - RLS: 그룹 멤버만 조회, 생성자·owner·admin만 정산 생성/수정, 본인 납부 토글만 가능
  - 한 이벤트당 정산은 1건으로 제한 (UNIQUE constraint on event_id)

#### 단계 3 — 서버 액션 & 실제 데이터 통합

- [ ] **Task 026: 정산 서버 액션 및 통합**
  - `lib/actions/settlements.ts`
  - `createSettlement(eventId, totalAmount, description)`: 참석자(`rsvp_status='yes'`) 기준 균등 분할
  - `togglePayment(settlementId, userId)`: is_paid 토글, paid_at 갱신
  - `getEventSettlement(eventId)`: 정산 정보 + 참여자별 납부 상태
  - 분할 시 원 단위로 반올림하고 잔돈은 생성자에게 귀속
  - Task 024의 mock을 실제 서버 액션으로 교체
  - **테스트 체크리스트 필수**: 균등 분할 정확도 + 잔돈 처리 + 납부 토글 권한 검증

- [ ] **Task 027: Phase 3 통합 E2E 테스트**
  - Playwright MCP를 사용한 전체 사용자 플로우 테스트
  - 그룹 생성 → 이벤트 개설 → RSVP → 정산 생성 → 납부 처리 시나리오
  - 에러 핸들링 및 엣지 케이스 (정원 초과, 권한 부재, 동시 수정) 검증
  - 모바일 뷰포트 반응형 검증
  - mock-only 잔여 코드 일소 확인

## MVP 이후 로드맵

> MVP 완료 후 사용자 피드백을 반영하여 다음 항목을 단계적으로 도입합니다. 이 단계들도 동일한 UI-first 패턴(단계 1 → 2 → 3)을 따릅니다.

### Phase 4: 알림 및 커뮤니케이션

- 이벤트 D-1 자동 알림 (이메일 / 푸시)
- 공지 작성 시 그룹 멤버에게 이메일 발송
- 정산 미납자 리마인더
- Supabase Edge Functions + Resend 연동 검토

### Phase 5: 결제 및 정산 자동화

- 토스페이먼츠/카카오페이 연동 (계좌 이체 링크)
- 균등 분할 외 사용자 정의 분할 (참여자별 가중치)
- 정산 영수증 PDF 다운로드

### Phase 6: 고급 그룹 기능

- 반복 이벤트 (매주/매월 자동 생성)
- 그룹 캘린더 통합 (Google Calendar / Apple Calendar `.ics` 내보내기)
- 그룹 통계 대시보드 (참석률, 정산 완료율)
- 멤버 출결 이력 트래킹

### Phase 7: 운영 및 품질

- 성능 최적화: React Server Components 캐싱 전략, Supabase 인덱스 튜닝
- 모니터링: Sentry 에러 트래킹 + Vercel Analytics
- 다국어 지원 (i18n: 한국어/영어)
- 접근성 감사 (WCAG 2.1 AA 준수)
- E2E 테스트 자동화 (Playwright + GitHub Actions CI)

---

**참고 문서**

- `/docs/PRD.md` — 제품 요구사항 명세서
- `/CLAUDE.md` — 프로젝트 컨벤션 및 아키텍처 가이드
- `/docs/guides/` — 추가 개발 가이드
