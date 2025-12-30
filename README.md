# 주식 시세 PWA

주식 현재 시세를 실시간으로 확인할 수 있는 Progressive Web App입니다.

## 기능

- 📈 실시간 주식 시세 조회
- 💾 로컬 스토리지에 주식 목록 저장
- 🔄 자동 새로고침 (5분마다)
- 📱 모바일 반응형 디자인
- 🔌 오프라인 지원 (Service Worker)
- ➕ 여러 주식 동시 추적

## 사용 방법

1. `index.html` 파일을 웹 브라우저에서 열기
2. 주식 심볼 입력 (예: AAPL, TSLA, MSFT)
3. 검색 버튼 클릭 또는 Enter 키 입력
4. 주식 카드에서 현재 시세 확인

## API 설정

현재 데모 API 키를 사용하고 있습니다. 실제 사용을 위해서는:

1. [Alpha Vantage](https://www.alphavantage.co/support/#api-key)에서 무료 API 키 발급
2. `app.js` 파일의 `API_KEY` 변수에 발급받은 키 입력

```javascript
const API_KEY = '여기에_발급받은_API_키_입력';
```

## 아이콘 생성

PWA 아이콘을 생성하려면:

1. 192x192 픽셀 아이콘을 `icon-192.png`로 저장
2. 512x512 픽셀 아이콘을 `icon-512.png`로 저장

온라인 도구 사용:
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## 설치 방법

### 데스크톱 (Chrome/Edge)
1. 주소창의 설치 아이콘 클릭
2. "앱 설치" 클릭

### 모바일 (Android)
1. Chrome 브라우저에서 사이트 열기
2. 메뉴 > "홈 화면에 추가" 선택

### iOS (Safari)
1. Safari에서 사이트 열기
2. 공유 버튼 > "홈 화면에 추가" 선택

## 파일 구조

```
version_1/
├── index.html          # 메인 HTML 파일
├── styles.css          # 스타일시트
├── app.js              # JavaScript 로직
├── manifest.json       # PWA 매니페스트
├── service-worker.js   # 서비스 워커
├── icon-192.png        # 192x192 아이콘
├── icon-512.png        # 512x512 아이콘
└── README.md           # 이 파일
```

## 브라우저 지원

- Chrome/Edge (권장)
- Firefox
- Safari (iOS 11.3+)
- Samsung Internet

## 참고사항

- Alpha Vantage 무료 API는 분당 5회, 일일 500회 호출 제한이 있습니다
- API 제한에 도달하면 예제 데이터가 표시됩니다
- HTTPS 환경에서만 Service Worker가 작동합니다 (localhost는 예외)

