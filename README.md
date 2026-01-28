# Smart PDF Export - Obsidian 플러그인

Callout 블록이 페이지에서 잘리지 않도록 CSS를 자동 주입하고, **모바일(Android/iOS)에서도 원터치 PDF 내보내기**를 지원하는 Obsidian 플러그인입니다.

## 주요 기능

1. **Smart Break CSS 자동 주입**: PDF 내보내기 시 Callout 블록이 페이지 경계에서 분리되지 않습니다.
2. **원터치 PDF 내보내기**: 리본 아이콘 클릭 또는 명령어 팔레트(`Ctrl/Cmd + P`)에서 실행
3. **모바일 지원**: Android와 iOS에서 `html2pdf.js` 라이브러리를 사용하여 PDF 생성

---

## 📱 Obsidian에 설치하기

### 필요한 파일

빌드 후 다음 **3개 파일**이 필요합니다:
- `main.js` (빌드로 생성됨)
- `manifest.json` (이미 있음)
- `styles.css` (이미 있음)

### 설치 방법

#### 방법 A: 컴퓨터에서 설치 후 동기화

1. 컴퓨터에서 Obsidian Vault 폴더를 엽니다.
2. `.obsidian/plugins/` 폴더로 이동합니다. (숨김 폴더이므로 표시 설정 필요)
3. `smart-pdf-export` 폴더를 새로 만듭니다.
4. 위 3개 파일을 복사합니다.
5. iCloud, Google Drive, Dropbox 등으로 동기화하면 모바일에서도 사용 가능합니다.

#### 방법 B: 모바일에서 직접 설치 (Android)

1. 파일 관리자 앱에서 Obsidian Vault 폴더를 찾습니다.
2. `.obsidian/plugins/smart-pdf-export/` 폴더를 생성합니다.
3. 3개 파일을 복사합니다.

#### 방법 C: 모바일에서 직접 설치 (iOS)

1. Files 앱에서 Obsidian Vault 위치를 엽니다.
2. `.obsidian/plugins/smart-pdf-export/` 폴더를 생성합니다.
3. 3개 파일을 복사합니다.

### 플러그인 활성화

1. Obsidian을 재시작합니다.
2. `설정` → `커뮤니티 플러그인` → `설치된 플러그인`으로 이동
3. "Smart PDF Export"를 찾아 토글을 켭니다.

---

## 🎯 사용 방법

### 방법 1: 리본 아이콘 클릭
왼쪽 사이드바에 추가된 📥 (다운로드) 아이콘을 클릭합니다.

### 방법 2: 명령어 팔레트
1. `Ctrl + P` (Mac: `Cmd + P`)를 눌러 명령어 팔레트를 엽니다.
2. "PDF로 내보내기"를 검색합니다.
3. "PDF로 내보내기 (Smart Layout)"을 선택합니다.

---

## ⚙️ 작동 원리

### 데스크톱
- Obsidian의 기본 `app:export-pdf` 명령어를 호출합니다.
- 주입된 CSS가 인쇄 미리보기에 적용되어 Callout이 잘리지 않습니다.

### 모바일
- Obsidian Mobile에서는 기본 PDF 내보내기가 불가능하므로, `html2pdf.js` 라이브러리를 사용합니다.
- CDN에서 라이브러리를 동적으로 로드합니다 (네트워크 필요).
- 현재 열린 문서의 렌더링된 HTML을 PDF로 변환합니다.

---

## 🔧 문제 해결

### "PDF 생성에 실패했습니다" 오류
- 인터넷 연결을 확인하세요. html2pdf.js 라이브러리를 CDN에서 로드합니다.
- Reading View(읽기 모드)로 전환한 후 다시 시도하세요.

### Callout이 여전히 잘리는 경우
- Callout이 한 페이지보다 길면 불가피하게 분리됩니다.
- 아주 긴 Callout은 여러 개의 작은 Callout으로 나누는 것을 권장합니다.

### 이미지가 PDF에 안 보이는 경우
- 외부 URL 이미지는 CORS 정책으로 인해 로드되지 않을 수 있습니다.
- Vault 내부에 저장된 이미지 사용을 권장합니다.

---

## 📁 프로젝트 구조

```
smart-pdf-export/
├── src/
│   └── main.ts          # 메인 플러그인 코드 (TypeScript)
├── main.js              # 빌드된 플러그인 (JavaScript) - 빌드 후 생성
├── manifest.json        # 플러그인 메타데이터
├── styles.css           # 추가 스타일시트
├── package.json         # npm 설정
├── tsconfig.json        # TypeScript 설정
├── esbuild.config.mjs   # 빌드 도구 설정
└── README.md            # 이 문서
```

---

## 📄 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 모두 환영합니다!
