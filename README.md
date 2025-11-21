# 급똥 위험관리 시뮬레이션 게임 🚽

급똥 상황에서 위험관리 시뮬레이션을 체험할 수 있는 게임입니다.

## 기술 스택

- **React** + **Vite** - 프론트엔드 프레임워크
- **Firebase** - 인증 및 Firestore 데이터베이스
- **Tailwind CSS** - 스타일링
- **Gemini AI** - 멘탈 케어 기능

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## Firebase 호스팅 배포

### 1. Firebase CLI 설치 (이미 설치되어 있음)
```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인
터미널에서 다음 명령어를 실행하세요:
```bash
firebase login
```
브라우저가 열리면 Google 계정으로 로그인하세요.

### 3. Firebase 프로젝트 초기화
```bash
firebase init hosting
```
- 기존 Firebase 프로젝트를 선택하거나 새로 생성
- Public directory: `dist` 입력
- Single-page app: `Yes`
- Overwrite index.html: `No`

### 4. 빌드 및 배포
```bash
# 프로덕션 빌드
npm run build

# Firebase 호스팅에 배포
firebase deploy --only hosting
```

배포가 완료되면 `https://YOUR-PROJECT-ID.web.app` 또는 `https://YOUR-PROJECT-ID.firebaseapp.com`에서 확인할 수 있습니다.

## 환경 변수 설정

### Firebase 설정
`App.jsx` 파일의 17-46번째 줄에 Firebase 설정을 추가하세요:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Gemini API 키 (선택사항)
`App.jsx` 파일의 60번째 줄에 Gemini API 키를 추가하세요:
```javascript
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
```

## 게임 플레이

- **WASD** 또는 **방향키**: 이동
- **K**: 달리기 (위급도 증가)
- **J**: 참기 (위급도 감소, 시야 확대)
- **L**: 지도 보기 (화장실 위치 표시)
- **H**: 멘탈 케어 (AI 격려)

## 개발

프로젝트는 Vite를 사용하여 개발 서버를 실행합니다.
브라우저에서 `http://localhost:5173`으로 접속하세요.

## 라이선스

MIT

