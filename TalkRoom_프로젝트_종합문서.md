# TalkRoom 프로젝트 종합 문서

**실행 중심 북클럽 플랫폼 (Book Club Execution Platform)**

---

## 1. 프로젝트 개요

### 1.1 프로젝트 소개

TalkRoom은 단순한 독서 모임을 넘어 실행과 실천을 중심으로 한 북클럽 플랫폼입니다. 책이나 콘텐츠를 함께 학습하고, 7일간의 집중 훈련 계획을 통해 실제로 행동으로 옮기는 것을 목표로 합니다.

### 1.2 핵심 가치

- **실행 중심**: 학습보다 실천에 집중
- **7일 집중**: 짧고 집중적인 훈련 기간
- **커뮤니티 기반**: 함께 성장하는 경험
- **미니멀 디자인**: 불필요한 요소를 제거한 직관적 UI

---

## 2. 기술 스택

### 2.1 프론트엔드

- **React 18** (TypeScript)
- **Tailwind CSS** (미니멀 디자인)
- **Vite** (빌드 도구)

### 2.2 백엔드

- **Supabase** (PostgreSQL)
- **Supabase Auth** (사용자 인증)
- **Supabase Realtime** (실시간 기능)

### 2.3 개발 환경

- **개발 플랫폼**: Lovable.dev → Claude Code
- **버전 관리**: Git
- **배포**: Vercel (예정)

---

## 3. 시스템 아키텍처

### 3.1 폴더 구조

```
src/
  components/     # UI 컴포넌트
    ui/           # 재사용 가능한 UI
    pages/        # 페이지 컴포넌트
  contexts/       # Context API
  lib/            # 유틸리티 및 API
    api/          # API 함수들
  types/          # TypeScript 타입
```

### 3.2 주요 레이어

- **Presentation Layer**: React 컴포넌트
- **Business Logic Layer**: Context API, Custom Hooks
- **Data Access Layer**: Supabase API 래퍼
- **Database Layer**: Supabase PostgreSQL

---

## 4. 데이터베이스 설계

### 4.1 주요 테이블

#### users (사용자)
```sql
- id (uuid, primary key)
- email (text, unique)
- name (text)
- nickname (text)
- avatar_url (text)
- bio (text)
- execution_rate (numeric)
- completion_rate (numeric)
- streak_days (integer)
- level (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

#### talk_rooms (토크룸)
```sql
- id (uuid, primary key)
- title (text)
- description (text)
- author (text)
- host_id (uuid, foreign key → users)
- media_type (text)
- media_url (text)
- cover_image_url (text)
- capacity (integer)
- current_participants (integer)
- status (text) -- 'recruiting', 'active', 'completed'
- category (text)
- tags (text[])
- start_date (timestamp)
- end_date (timestamp)
- meeting_time (text)
- location (text)
- level (text)
- features (text[])
- allow_replay (boolean)
- is_public (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### room_participants (참여자)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- room_id (uuid, foreign key → talk_rooms)
- role (text) -- 'host', 'participant'
- status (text) -- 'active', 'completed', 'dropped'
- joined_at (timestamp)
```

#### reviews (리뷰)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- room_id (uuid, foreign key → talk_rooms)
- talkroom_id (uuid) -- 추가 참조
- title (text)
- content (text)
- is_public (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### training_courses (훈련 코스)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- room_id (uuid, foreign key → talk_rooms)
- title (text)
- description (text)
- duration (integer) -- 7일
- difficulty (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### daily_logs (일일 기록)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- course_id (uuid, foreign key → training_courses)
- type (text) -- 'pledge', 'review', 'reflection'
- content (text)
- mood (text)
- date (date)
- created_at (timestamp)
```

#### community_posts (커뮤니티 게시물)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- title (text)
- content (text)
- type (text) -- 'daily_mission', 'content_review', 'participation_review'
- is_public (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## 5. 핵심 4개 화면

### 5.1 홈 (HomePage.tsx)

사용자의 대시보드 역할을 하는 메인 화면입니다.

**주요 기능**
- 참여 중인 토크룸 목록 표시
- 각 토크룸별 오늘의 미션 표시
- 전체 진행률 및 Day 카운터
- 이번 주 성과 통계 (미션 성공률, 연속 수행일)
- 빠른 액션 버튼 (데일리 로그, 콘텐츠 리뷰)

**데이터 구조**
```typescript
interface TodayMission {
  total: number;
  completed: number;
  pending: number;
}

interface WeeklyStats {
  missionSuccess: number;
  totalMissions: number;
  streak: number;
  totalParticipants: number;
}

interface MyTalkRoom {
  id: string;
  title: string;
  host: string;
  category: string;
  progress: number;
  totalDays: number;
  currentDay: number;
  todayMission: string;
  missionStatus: 'pending' | 'completed' | 'missed';
}
```

**UI 특징**
- 미션 진행률 바
- 각 토크룸별 카드 형태
- 상태별 컬러 구분 (pending: 파랑, completed: 회색)

---

### 5.2 탐색 (ExplorePage.tsx)

새로운 토크룸을 발견하고 참여할 수 있는 화면입니다.

**주요 기능**
- 카테고리별 토크룸 필터링
- 검색 기능
- 정렬 옵션 (최신순, 인기순, 시간순)
- 토크룸 상세 정보 (설명, 태그, 참여자 수)
- 즉시 참여하기 버튼

**카테고리**
- 전체
- 비즈니스
- 커리어
- 투자
- 마케팅
- 자기계발
- 건강
- 취미

**UI 특징**
- 카테고리 탭 (가로 스크롤)
- 토크룸 카드 (호스트 정보, 참여자 수, 시작 시간)
- 태그 표시 (#네이버, #디지털마케팅 등)
- 진행중/모집중 상태 배지

---

### 5.3 커뮤니티 (CommunityPage.tsx)

사용자들의 활동을 공유하는 소셜 피드 화면입니다.

**주요 기능**
- 공개된 콘텐츠 타임라인
- 필터 (전체, 콘텐츠리뷰, 데일리미션, 참가리뷰)
- 좋아요 및 댓글 기능
- 글쓰기 플로팅 버튼

**콘텐츠 타입**
- **데일리미션**: 일일 실천 기록
- **콘텐츠리뷰**: 학습한 콘텐츠 후기
- **참가리뷰**: 토크룸 참여 후기

**UI 특징**
- 타임라인 형태의 피드
- 작성자 아바타 및 토크룸 정보
- 좋아요/댓글 카운터
- 타입별 배지 컬러 구분

---

### 5.4 마이페이지 (MyPage.tsx)

개인 활동 내역과 설정을 관리하는 화면입니다.

**주요 기능**
- 3개 탭: 내활동, 참여현황, 설정
- **내활동**: 작성한 글 관리, 공개/비공개 설정
- **참여현황**: 토크룸별 진행률 및 성공률
- **설정**: 프로필 편집, 알림 설정, 계정 관리

**통계 정보**
```typescript
interface OverallStats {
  totalTalkRooms: number;      // 참여 토크룸 수
  completedTalkRooms: number;  // 완료한 토크룸 수
  averageSuccessRate: number;  // 평균 미션 성공률
  totalPosts: number;          // 작성한 글 수
  totalLikes: number;          // 받은 좋아요 수
  currentStreak: number;       // 연속 수행일
}
```

**UI 특징**
- 프로필 헤더 (아바타, 레벨, 활동일수)
- 간단 통계 (3개 박스)
- 토글 스위치 (공개/비공개)
- 탭 네비게이션

---

## 6. 주요 컴포넌트 및 API

### 6.1 AuthContext

사용자 인증 및 세션 관리를 담당하는 Context입니다.

**제공하는 인터페이스**
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error?: any }>;
}
```

**주요 로직**
- 세션 초기화 및 유지
- 인증 상태 변경 리스너
- 사용자 프로필 자동 동기화
- users 테이블과 auth 연동

---

### 6.2 Supabase API

데이터베이스와의 통신을 담당하는 API 함수들입니다.

#### 토크룸 API (lib/api/talkrooms.ts)

```typescript
// 활성 토크룸 목록 조회
getTalkRooms(): Promise<{ data: TalkRoom[], error: any }>

// 내가 참여한 토크룸 조회
getMyTalkRooms(userId: string): Promise<{ data: TalkRoom[], error: any }>

// 토크룸 생성
createTalkRoom(roomData: CreateTalkRoomData): Promise<{ data: TalkRoom | null, error: any }>

// 토크룸 참여
joinTalkRoom(userId: string, roomId: string): Promise<{ data: any, error: any }>

// 토크룸 상세 정보
getTalkRoom(id: string): Promise<{ data: TalkRoom | null, error: any }>

// 참여자 목록
getRoomParticipants(roomId: string): Promise<{ data: RoomParticipant[], error: any }>
```

**주요 특징**
- 자동 JOIN으로 연관 데이터 로드
- 에러 핸들링 통일
- host 정보 자동 포함

---

### 6.3 Avatar 컴포넌트

재사용 가능한 아바타 UI 컴포넌트입니다.

```typescript
interface AvatarProps {
  size: 'sm' | 'md' | 'lg';
  gradient: string;  // Tailwind gradient class
  name: string;      // 첫 글자를 추출하여 표시
}
```

**사이즈 정의**
- sm: 8x8 (32px)
- md: 12x12 (48px)
- lg: 16x16 (64px)

**사용 예시**
```jsx
<Avatar
  size="sm"
  gradient="from-gray-300 to-gray-400"
  name="김사용자"
/>
```

---

## 7. 디자인 가이드라인

### 7.1 미니멀리즘 원칙

**컬러 팔레트**
- 배경: `#FFFFFF` (순백색)
- 텍스트: `#1a1a1a` (진한 회색)
- 포인트: `#3B82F6` (블루 500)
- 보조: `#6B7280` (그레이 500)

**그레이 스케일**
- 50: `#F9FAFB`
- 100: `#F3F4F6`
- 200: `#E5E7EB`
- 500: `#6B7280`
- 900: `#111827`

---

### 7.2 타이포그래피

```css
/* 기본 설정 */
font-family: system-ui, -apple-system, sans-serif;

/* 사이즈 */
text-xs: 12px    /* 작은 텍스트 */
text-sm: 14px    /* 기본 텍스트 */
text-base: 16px  /* 제목 */
text-lg: 18px    /* 큰 제목 */

/* 두께 */
font-medium: 500
font-semibold: 600
font-bold: 700
```

---

### 7.3 간격 시스템

```css
/* Spacing Scale (Tailwind) */
1: 4px
2: 8px
3: 12px
4: 16px
6: 24px
8: 32px

/* 컴포넌트 간격 */
section padding: py-4 (16px)
card spacing: space-y-4 (16px)
element spacing: space-y-2 or space-y-3
```

---

### 7.4 UI 요소

**버튼**
```jsx
// Primary
className="bg-blue-500 text-white px-4 py-2 rounded-lg"

// Secondary
className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg"

// Text only
className="text-blue-500 px-2 py-1"
```

**카드**
```jsx
className="bg-white rounded-xl p-4 shadow-sm"
```

**입력창**
```jsx
className="bg-gray-50 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
```

**배지**
```jsx
className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700"
```

---

## 8. MVP 개발 로드맵

### 8.1 완료된 기능 ✅

- 사용자 인증 시스템 (회원가입, 로그인)
- 4개 핵심 화면 UI (홈, 탐색, 커뮤니티, 마이)
- 토크룸 기본 API (생성, 조회, 참여)
- 데이터베이스 스키마 설계
- 미니멀 디자인 시스템
- Avatar 컴포넌트

---

### 8.2 개발 중인 기능 🔄

- 실제 데이터 연동
- 콘텐츠 작성 기능 (리뷰, 훈련 계획)
- 댓글 및 좋아요 시스템
- 검색 및 필터링 로직

---

### 8.3 다음 단계 📋

1. **토크룸 생성 폼 구현**
   - 제목, 설명, 카테고리 입력
   - 날짜 선택 (시작일, 종료일)
   - 정원 설정

2. **7일 훈련 계획 작성 UI**
   - 키워드 선택 시스템
   - 일별 계획 입력
   - 미리보기 기능

3. **일일 미션 수행 및 체크 시스템**
   - 미션 상세 페이지
   - 완료 체크 기능
   - 진행률 자동 계산

4. **공개/비공개 설정 기능**
   - 토글 스위치 구현
   - 실시간 반영

5. **알림 시스템 (기본)**
   - 미션 리마인더
   - 새 댓글/좋아요 알림

6. **검색 및 필터링 개선**
   - 실시간 검색
   - 다중 필터 적용

---

### 8.4 향후 계획 (v2) 🚀

- 음성 토크룸 기능
- 결제 시스템 (Stripe)
- 푸시 알림 (FCM)
- 고급 분석 및 통계
- 소셜 기능 강화 (팔로우, DM)
- 배지 및 레벨 시스템
- AI 기반 콘텐츠 추천

---

## 9. 개발 가이드

### 9.1 환경 설정

```bash
# .env 파일
VITE_SUPABASE_URL=https://ctvdsjzazqoodeqenwza.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### 9.2 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview
```

---

### 9.3 코딩 규칙

**TypeScript**
- strict mode 사용
- any 타입 최소화
- 명시적 타입 정의

**React**
- 함수형 컴포넌트 사용
- Hooks 활용 (useState, useEffect, useContext)
- Custom Hooks로 로직 분리

**Tailwind CSS**
- 유틸리티 클래스 우선
- @apply 최소화
- 반응형 디자인 (모바일 우선)

**네이밍**
- 컴포넌트: PascalCase (HomePage, TalkRoomCard)
- 함수/변수: camelCase (getTalkRooms, myTalkRooms)
- 파일명: 컴포넌트는 PascalCase, 유틸은 camelCase

---

### 9.4 Git 워크플로우

```bash
# 기능 브랜치 생성
git checkout -b feature/talk-room-creation

# 커밋 메시지
feat: 토크룸 생성 폼 구현
fix: 로그인 버그 수정
docs: README 업데이트
style: 코드 포맷팅
refactor: API 함수 리팩토링
```

---

## 10. 프로젝트 현황 요약

TalkRoom 프로젝트는 Lovable.dev에서 Claude Code로 이전되었으며, 핵심 UI와 기본 인프라가 구축된 상태입니다. 

### 현재 상태

**완성도: 40%**

- ✅ UI/UX 디자인: 80%
- ✅ 데이터베이스: 70%
- 🔄 백엔드 API: 50%
- 🔄 인증 시스템: 70%
- ⏳ 콘텐츠 작성: 20%
- ⏳ 소셜 기능: 30%

---

### 주요 특징

1. **실행 중심의 북클럽 플랫폼**
   - 학습보다 실천에 집중
   - 7일 집중 훈련 시스템

2. **극도로 단순한 미니멀 UI**
   - 노션보다 단순
   - 핵심 기능에만 집중

3. **커뮤니티 기반 학습**
   - 함께 성장하는 경험
   - 서로를 격려하는 문화

4. **모던 기술 스택**
   - React + TypeScript
   - Supabase (PostgreSQL)
   - Tailwind CSS

---

### 다음 마일스톤

**Phase 1: 코어 기능 완성** (4주)
- 토크룸 생성 및 관리
- 콘텐츠 작성 시스템
- 사용자 인터랙션

**Phase 2: 베타 테스트** (2주)
- 소규모 사용자 테스트
- 피드백 수집 및 개선

**Phase 3: 정식 출시** (2주)
- 버그 수정
- 성능 최적화
- 마케팅 준비

---

### 팀 구성 (예정)

- **개발**: 1명 (풀스택)
- **디자인**: 1명 (UI/UX)
- **기획**: 1명 (PM)

---

## 부록: 참고 자료

### API 엔드포인트 예시

```typescript
// Supabase Client 사용
import { supabase } from '@/lib/supabase';

// 토크룸 목록 조회
const { data, error } = await supabase
  .from('talk_rooms')
  .select(`
    *,
    host:users(id, name, avatar_url)
  `)
  .eq('status', 'recruiting')
  .order('created_at', { ascending: false });

// 토크룸 참여
const { data, error } = await supabase
  .from('room_participants')
  .insert({
    user_id: userId,
    room_id: roomId,
    role: 'participant',
    status: 'active'
  });
```

---

### 유용한 링크

- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React TypeScript**: https://react-typescript-cheatsheet.netlify.app/
- **Vite**: https://vitejs.dev/guide/

---

**문서 작성일**: 2025년 11월  
**최종 수정일**: 2025년 11월  
**버전**: 1.0
