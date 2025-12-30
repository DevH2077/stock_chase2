# 🔄 버전 자동 업데이트 규칙

## 📌 규칙

**`versionBadge`는 푸시할 때마다 푸시 당시의 한국 시간(KST)으로 자동 업데이트됩니다.**

## 📝 버전 형식

- 형식: `v` + 년(2자리) + 월(2자리) + 일(2자리) + 시(2자리) + 분(2자리)
- 예시: `v2512301641` = 2025년 12월 30일 16시 41분 (한국 시간)

## 🚀 사용 방법

### 자동 업데이트 (권장)

```bash
cd version_1
npm run push
```

이 명령어가 자동으로:
1. ✅ 현재 한국 시간으로 버전 생성
2. ✅ `index.html`의 `versionBadge` 업데이트
3. ✅ `app.js`의 `APP_VERSION` 상수 업데이트
4. ✅ Git에 커밋
5. ✅ GitHub에 푸시

### 수동 업데이트

```bash
cd version_1
node update-version.js
git add index.html app.js
git commit -m "Update version"
git push
```

## ✅ 작동 원리

1. **`update-version.js`** 스크립트가 실행되면:
   - 현재 한국 시간(Asia/Seoul)을 가져옴
   - `v2512301641` 형식으로 버전 생성
   - `index.html`의 `<span id="versionBadge">` 내용 업데이트
   - `app.js`의 `APP_VERSION` 상수 업데이트

2. **푸시 시점**에 버전이 고정됨:
   - 새로고침해도 버전이 변경되지 않음
   - 다음 푸시 시에만 업데이트됨

## 📍 현재 버전

현재 표시된 버전: **`v2512301641`**
- 이는 마지막 푸시 시점(2025년 12월 30일 16시 41분, 한국 시간)을 나타냅니다.

## 🔧 확인 방법

1. **로컬 파일 확인**: `version_1/index.html` 파일 열기
2. **GitHub Pages 확인**: https://devh2077.github.io/stock_chase2/
3. **브라우저 개발자 도구**: F12 > Elements > `versionBadge` 검색

## ⚠️ 중요 사항

- 버전은 **푸시 시점**에만 업데이트됨
- 실시간으로 갱신되지 않음
- 한국 시간(KST, UTC+9) 기준
- `npm run push` 사용 시 자동으로 업데이트됨

