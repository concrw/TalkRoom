# 🚀 Vercel 배포 가이드

## ⚠️ 중요: 올바른 계정 사용

**반드시 다음 계정으로만 배포하세요:**
- **이메일**: `readybookclub@gmail.com`
- **Scope**: `readybookclub`

`.vercelrc` 파일에 계정이 지정되어 있어 자동으로 올바른 계정에 연결됩니다.

---

## 📋 배포 단계

### 1. Vercel CLI 로그인

브라우저에서 다음 URL로 접속하여 인증하세요:

```bash
npx vercel login
```

**중요**: 로그인 시 반드시 `readybookclub@gmail.com` 계정을 선택하세요!

---

### 2. 프로젝트 초기 설정

```bash
npx vercel
```

질문에 다음과 같이 답변:
- **Set up and deploy?** → Yes
- **Which scope?** → `readybookclub` (자동 선택됨)
- **Link to existing project?** → No (처음) / Yes (재배포)
- **Project name?** → `talkroom` 또는 원하는 이름
- **Directory?** → `.` (현재 디렉토리)
- **Override settings?** → No

---

### 3. 환경 변수 설정

Vercel Dashboard에서 환경 변수를 설정해야 합니다:

https://vercel.com/readybookclub/talkroom/settings/environment-variables

**필수 환경 변수:**

```bash
# Supabase
VITE_SUPABASE_PROJECT_ID=ctvdsjzazqoodeqenwza
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://ctvdsjzazqoodeqenwza.supabase.co

# TossPayments (프로덕션 키로 교체 필요!)
VITE_TOSS_CLIENT_KEY=test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq

# Stripe (프로덕션 키로 교체 필요!)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY

# Firebase
VITE_FIREBASE_API_KEY=AIzaSyDyrOTiZAWgRzoMlQGXKD9HVTOJrGo0Km0
VITE_FIREBASE_PROJECT_ID=talkroom-prod
VITE_FIREBASE_MESSAGING_SENDER_ID=570644518966
VITE_FIREBASE_APP_ID=1:570644518966:web:f82e15f4ee9b2bfe4fe097
VITE_FIREBASE_VAPID_KEY=BJ0OZBBLj7P2HMSYdpENmv_chZfZux11ZwngY1a5SRTLiBtbVx-J-4Bw-K5z7Ts0TjPKZBlNo3OFlvo3QCfF6r8
```

모든 환경 변수는 **Production**, **Preview**, **Development** 모두에 체크하세요.

---

### 4. 프로덕션 배포

```bash
npx vercel --prod
```

배포 완료 후 제공되는 URL로 접속 가능합니다.

---

## 🔍 배포 확인

### 배포 상태 확인
```bash
npx vercel ls
```

### 로그 확인
```bash
npx vercel logs
```

### 도메인 설정
Vercel Dashboard에서 커스텀 도메인을 설정할 수 있습니다:
https://vercel.com/readybookclub/talkroom/settings/domains

---

## ⚙️ 프로젝트 설정 파일

### `.vercelrc`
```json
{
  "scope": "readybookclub"
}
```
이 파일은 프로젝트가 **항상 `readybookclub` 계정**에만 배포되도록 보장합니다.

### `vercel.json`
Vite 프레임워크 설정 및 SPA 라우팅, 보안 헤더가 구성되어 있습니다.

---

## 🔐 보안 체크리스트

배포 전 반드시 확인:

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Vercel Dashboard에서 환경 변수 설정 완료
- [ ] TossPayments 실제 키로 교체 (테스트 키는 프로덕션 사용 불가)
- [ ] Stripe 키 확인 (글로벌 결제 사용 시)
- [ ] Supabase RLS 정책 활성화 확인
- [ ] Firebase 프로젝트 설정 확인

---

## 🚨 문제 해결

### 문제: 다른 계정으로 배포됨
**해결**: `.vercelrc` 파일 확인 및 `npx vercel logout` 후 재로그인

### 문제: 환경 변수가 적용되지 않음
**해결**: Vercel Dashboard에서 환경 변수 설정 후 재배포

### 문제: 빌드 실패
**해결**: 로컬에서 `npm run build` 테스트 후 오류 수정

### 문제: 404 에러
**해결**: `vercel.json`의 rewrites 설정 확인

---

## 📞 지원

- Vercel 공식 문서: https://vercel.com/docs
- Vercel Dashboard: https://vercel.com/readybookclub
- 프로젝트 계정: readybookclub@gmail.com

---

## ✅ 배포 완료 후

배포가 완료되면:
1. 제공된 URL에서 사이트 정상 동작 확인
2. 결제 기능 테스트 (테스트 모드)
3. 음성 채팅 기능 테스트
4. 파일 업로드 기능 테스트
5. 푸시 알림 권한 요청 확인

모든 기능이 정상 작동하면 **프로덕션 준비 완료**입니다! 🎉
