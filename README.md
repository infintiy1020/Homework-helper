# 숙제 도우미 (Vercel + Firebase)

## 1. Firebase 설정
1. https://console.firebase.google.com 에서 프로젝트를 만들어요.
2. **Authentication > 로그인 방법**에서 `이메일/비밀번호`와 `Google`을 켜요. (아이디 가입도 내부적으로 `이메일/비밀번호` 방식을 써요.)
3. **Firestore Database**를 만들고, **규칙** 탭에 `firestore.rules` 내용을 붙여 넣어 게시해요.
4. **프로젝트 설정 > 내 앱 > 웹 앱 추가**로 받은 설정값(apiKey, authDomain, projectId, appId)을 `index.html`의 `CFG`에 붙여 넣어요.

## 2. Vercel 배포
1. 이 폴더를 GitHub에 올리고 https://vercel.com 에서 Import 하거나, 터미널에서 `npx vercel` 을 실행해요.
2. Vercel **Settings > Environment Variables**에 아래 두 개를 추가하고 다시 배포(Redeploy)해요.
   - `ANTHROPIC_API_KEY` : https://console.anthropic.com 에서 발급한 API 키
   - `FIREBASE_API_KEY` : 위 `CFG`의 apiKey와 같은 값

## 참고
- AI 호출 비용은 Anthropic API 사용량으로 청구돼요. 문제 1개당 호출이 4번(풀이 3 + 검산 1) 들어가요.
- 로그인한 사용자만 `/api/solve`를 쓸 수 있어요. 남용이 걱정되면 사용자별 하루 횟수 제한을 추가하세요.
- 모델은 환경변수 `MODEL_DEFAULT`, `MODEL_COMPLEX`로 바꿀 수 있어요.
- 아이디 계정은 이메일이 없어서 비밀번호 찾기(메일 발송)가 없어요. 이메일 계정은 로그인 화면의 "비밀번호를 잊었어요"로 재설정 메일을 받을 수 있어요.
- Google 로그인을 쓰려면 배포된 주소(예: xxx.vercel.app)를 Firebase Authentication > 설정 > 승인된 도메인에 추가해야 해요.
- 아이디는 영어 소문자·숫자·_ 4~16자이고, 대소문자는 구분하지 않아요. 같은 아이디로는 가입할 수 없어요.
