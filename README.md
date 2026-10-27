# 숙제 도우미 (Vercel + Firebase + Gemini)

## 1. Firebase 설정
1. https://console.firebase.google.com 에서 프로젝트를 만들어요.
2. **Authentication > 로그인 방법**에서 `이메일/비밀번호`와 `Google`을 켜요. (아이디 가입도 내부적으로 `이메일/비밀번호` 방식을 써요.)
3. **Firestore Database**를 만들고, **규칙** 탭에 `firestore.rules` 내용을 붙여 넣어 게시해요.
4. **프로젝트 설정 > 내 앱 > 웹 앱**의 설정값을 `index.html`의 `CFG`에 넣어요. (이미 넣어져 있어요.)

## 2. Gemini API 키 만들기 (무료)
1. https://aistudio.google.com 에 구글 계정으로 로그인해요.
2. **Get API key → Create API key**로 키를 만들고 복사해요. (`AIza...`로 시작해요. Firebase의 apiKey와는 다른 키예요.)

## 3. Vercel 배포
1. 이 폴더의 내용을 GitHub 저장소에 올리고 https://vercel.com 에서 Import 해요. Framework Preset은 `Other`예요.
2. **Environment Variables**에 아래 두 개를 추가하고 배포(Redeploy)해요.
   - `GEMINI_API_KEY` : 2번에서 만든 Gemini 키
   - `FIREBASE_API_KEY` : Firebase 설정값의 apiKey
3. 배포된 주소(예: `xxx.vercel.app`)를 Firebase **Authentication > 설정 > 승인된 도메인**에 추가해요. (Google 로그인에 필요)

## 참고
- 모델은 기본 `gemini-3.5-flash`예요. (`gemini-2.5-flash`는 2026-10-16에 종료돼서 404가 나요.) 바꾸려면 환경변수 `GEMINI_MODEL`(풀이), `GEMINI_MODEL_COMPLEX`(검산)을 설정하세요. 설정한 모델이 종료됐으면 자동으로 `gemini-3.5-flash` → `gemini-3-flash-preview` 순서로 넘어가요. 예전에 `GEMINI_MODEL`을 `gemini-2.5-flash`로 넣어 뒀다면 지우거나 바꿔 주세요.
- 생각 정도는 `GEMINI_THINKING`(풀이, 기본 LOW), `GEMINI_THINKING_COMPLEX`(검산, 기본 MEDIUM)로 바꿀 수 있어요. (MINIMAL / LOW / MEDIUM / HIGH)
- 문제 1개당 AI 호출이 4번(풀이 3 + 검산 1) 들어가서 무료 사용량이 빨리 줄어요. 한도를 넘으면 "잠깐 쉬었다가 다시 해 주세요"가 떠요.
- 무료 구간에서는 보낸 내용이 Google 서비스 개선에 쓰일 수 있어요.
- 로그인한 사용자만 `/api/solve`를 쓸 수 있어요.
- 아이디 계정은 비밀번호 찾기(메일 발송)가 없어요. 이메일 계정은 로그인 화면에서 재설정 메일을 받을 수 있어요.

## 💡 모르는 문제 탭 (사진 → 풀이·설명)
- 모르는 문제를 사진으로 올리면 `문제 해석 → 필요한 개념 → 풀이 과정 → 정답 → 팁` 순서로 알려줘요.
- **자동** 모드는 크롬 내장 AI(Gemini Nano, Prompt API)를 먼저 시도하고, 안 되면 서버 Gemini(`/api/solve`)로 넘어가요. `내장 AI` / `서버 Gemini`로 고정할 수도 있어요.
- 내장 AI는 데스크톱 Chrome에서만 쓸 수 있어요. 모바일 Chrome·iOS는 아직 지원되지 않아서 서버 Gemini로 풀어요.
- 이미지 입력은 Chrome 설정이 필요할 수 있어요: `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` 을 Enabled로 바꾸고 재시작.
- 한국어는 Prompt API 공식 지원 언어(en·ja·es·de·fr)에 아직 없어서 내장 AI 설명이 어색할 수 있어요.
