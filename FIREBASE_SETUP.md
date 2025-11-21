# Firebase 설정 가이드

## 필수 설정 단계

### 1. Firebase Console에서 Authentication 활성화

1. [Firebase Console](https://console.firebase.google.com/project/geupddong-fc00c/authentication) 접속
2. 좌측 메뉴에서 **Authentication** 클릭
3. **시작하기** 버튼 클릭
4. **Sign-in method** 탭 클릭
5. **익명** 인증 방법 활성화:
   - **익명** 클릭
   - **사용 설정** 토글 ON
   - **저장** 클릭

### 2. Firestore Database 활성화

1. [Firestore Database](https://console.firebase.google.com/project/geupddong-fc00c/firestore) 접속
2. **데이터베이스 만들기** 클릭 (이미 생성되어 있으면 스킵)
3. **테스트 모드로 시작** 또는 **프로덕션 모드로 시작** 선택
4. 지역 선택 (asia-northeast3 권장)
5. **활성화** 클릭

### 3. Firestore 보안 규칙 배포

터미널에서 다음 명령어 실행:
```bash
firebase deploy --only firestore:rules --project geupddong-fc00c
```

### 4. Firestore 인덱스 배포

터미널에서 다음 명령어 실행:
```bash
firebase deploy --only firestore:indexes --project geupddong-fc00c
```

## 확인 사항

- ✅ Authentication > Sign-in method에서 **익명** 인증이 활성화되어 있는지
- ✅ Firestore Database가 생성되어 있는지
- ✅ Firestore > 규칙에서 보안 규칙이 배포되어 있는지
- ✅ Firestore > 인덱스에서 복합 인덱스가 생성되어 있는지

## 문제 해결

### 오류: `auth/configuration-not-found`
- Firebase Console에서 Authentication이 활성화되어 있는지 확인
- 익명 인증이 활성화되어 있는지 확인

### 오류: `Missing or insufficient permissions`
- Firestore 보안 규칙이 배포되어 있는지 확인
- `firebase deploy --only firestore:rules` 명령어 실행

