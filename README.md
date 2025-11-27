# TALKROOM - 실행 중심 북클럽 플랫폼

**Book Club Execution Platform**

> 단순한 독서 모임을 넘어 실행과 실천을 중심으로 한 북클럽 플랫폼입니다.

---

## 🎯 프로젝트 개요

TALKROOM은 책이나 콘텐츠를 함께 학습하고, 체계적인 훈련 계획을 통해 실제로 행동으로 옮기는 것을 목표로 하는 플랫폼입니다.

### 핵심 가치
- **실행 중심**: 학습보다 실천에 집중
- **체계적 훈련**: 템플릿 기반 코스 설계
- **실시간 소통**: 음성 토크룸 + 실시간 채팅
- **커뮤니티 기반**: 함께 성장하는 경험
- **미니멀 디자인**: 불필요한 요소를 제거한 직관적 UI

---

## ✨ 주요 기능

### 🎤 실시간 음성 토크룸
- 라이브 세션 관리
- 실시간 채팅 (속도 제한, 무한 스크롤)
- 호스트/참여자 역할 관리

### 📚 체계적인 훈련 시스템
- **5가지 템플릿**
  - 습관형성
  - 아침루틴
  - 자기계발
  - 건강관리
  - 마음챙김
- **일일 기록**
  - 아침 다짐 (morning_promise)
  - 저녁 리뷰 (evening_review)
- 진행률 자동 계산

### 📅 일정 관리
- 오늘의 긴급 작업
- 예정된 토크룸
- 훈련 진행률 시각화
- LIVE 토크룸 알림

### 🎯 리뷰 게이팅 시스템
- 리뷰 완료 후에만 토크룸 입장 가능
- 참여 품질 관리

### 💳 결제 시스템
- 유료 토크룸 지원
- 결제 내역 추적

### 📱 커뮤니티 피드
- 타입별 포스트 (일일 다짐, 리뷰, 훈련 완료)
- 좋아요 시스템
- 공개/비공개 설정

### 🔔 알림 시스템
- 훈련 알림
- 채팅 알림
- 시스템 알림

---

## 🛠️ 기술 스택

### Frontend
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui (49개 컴포넌트)
- **React Router v6** (19개 라우트)
- **@tanstack/react-query** (서버 상태 관리)
- **Vite** (빌드 도구)

### Backend
- **Supabase** PostgreSQL
- **Supabase Auth** (인증)
- **Supabase Realtime** (실시간 채팅)
- **Supabase Storage** (파일 업로드)

### UI 라이브러리
- **Radix UI** (접근성)
- **Lucide React** (아이콘)
- **Sonner** (토스트 알림)

---

## 🚀 시작하기

### 1. 저장소 클론
```sh
git clone <YOUR_GIT_URL>
cd TalkRoom
```

### 2. 의존성 설치
```sh
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 개발 서버 실행
```sh
npm run dev
```

브라우저에서 http://localhost:5173 을 열어주세요.

---

## 📦 빌드 및 배포

### 프로덕션 빌드
```sh
npm run build
```

### 빌드 미리보기
```sh
npm run preview
```

### Vercel 배포 (권장)
1. Vercel 계정 생성
2. Git 저장소 연결
3. 환경 변수 설정
4. 배포 버튼 클릭

---

## 📁 프로젝트 구조

```
TalkRoom/
├── public/              # 정적 파일
│   ├── images/          # 이미지 자산
│   └── lovable-uploads/ # 로고 등
├── src/
│   ├── components/      # React 컴포넌트
│   │   └── ui/          # shadcn/ui (49개)
│   ├── pages/           # 페이지 컴포넌트 (19개)
│   ├── hooks/           # Custom Hooks
│   ├── integrations/    # Supabase 통합
│   ├── lib/             # 유틸리티
│   └── types/           # TypeScript 타입
├── supabase/
│   ├── config.toml
│   └── migrations/      # DB 마이그레이션 (27개)
└── package.json
```

---

## 🗺️ 주요 라우트

| 경로 | 페이지 | 보호 | 설명 |
|------|--------|------|------|
| `/` | Index | ❌ | 홈 (디스커버리) |
| `/auth` | Auth | ❌ | 로그인/회원가입 |
| `/explore` | Explore | ❌ | 탐색 |
| `/schedule` | Schedule | ✅ | 일정 관리 |
| `/community` | Community | ✅ | 커뮤니티 피드 |
| `/profile` | Profile | ✅ | 프로필 |
| `/rooms/:id` | RoomDetail | ❌ | 토크룸 상세 |
| `/rooms/:id/join` | JoinRoom | ✅ | 라이브 토크룸 |
| `/training-course/:roomId` | TrainingCourse | ✅ | 훈련 코스 설계 |
| `/daily/:roomId` | Daily | ✅ | 일일 기록 |

---

## 🎨 디자인 시스템

### 컬러 팔레트 (미니멀)
```css
--background: #FFFFFF        (Pure White)
--foreground: #1a1a1a        (Dark Gray)
--primary: #3B82F6           (Blue 500)
--secondary: #6B7280         (Gray 500)
--border: #E5E7EB            (Gray 200)
--star: #FBBF24              (Yellow 400)
```

### 타이포그래피
```css
font-family: system-ui, -apple-system, sans-serif
text-xs: 12px
text-sm: 14px
text-base: 16px
```

### 간격 시스템
```css
1: 4px
2: 8px
3: 12px
4: 16px
6: 24px
8: 32px
```

---

## 📊 데이터베이스

### 주요 테이블
- `users` - 사용자 정보
- `talk_rooms` - 토크룸
- `voice_sessions` - 음성 세션
- `chat_messages` - 실시간 채팅
- `room_participants` - 참여자
- `training_courses` - 훈련 코스
- `daily_logs` - 일일 기록
- `feed_posts` - 피드 포스트
- `post_likes` - 좋아요
- `reviews` - 리뷰
- `notifications` - 알림
- `payments` - 결제

자세한 스키마는 [프로젝트_종합문서.md](TalkRoom_프로젝트_종합문서.md) 참조

---

## 📚 문서

- [프로젝트 종합 문서](TalkRoom_프로젝트_종합문서.md) - 전체 프로젝트 기획 및 아키텍처
- [비교 분석 및 통합 기획](프로젝트_비교분석_및_통합기획.md) - BMIC와 TALKROOM 통합 전략
- [통합 작업 완료 보고서](통합작업_완료보고서.md) - 통합 작업 상세 내역

---

## 🧪 개발 가이드

### 코딩 규칙
- **TypeScript**: strict mode, any 타입 최소화
- **React**: 함수형 컴포넌트, Hooks 활용
- **Tailwind CSS**: 유틸리티 클래스 우선
- **네이밍**: PascalCase (컴포넌트), camelCase (함수/변수)

### Git 워크플로우
```sh
# 기능 브랜치 생성
git checkout -b feature/new-feature

# 커밋 메시지
git commit -m "feat: 새 기능 추가"
git commit -m "fix: 버그 수정"
git commit -m "docs: 문서 업데이트"
```

---

## 🔧 트러블슈팅

### 빌드 오류
```sh
# 캐시 정리
rm -rf node_modules package-lock.json
npm install
```

### Supabase 연결 오류
- `.env` 파일의 URL과 KEY 확인
- Supabase 대시보드에서 프로젝트 상태 확인

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

---

## 👥 기여

기여는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ by TALKROOM Team**
