# 🔄 버전 업데이트 가이드

버전은 업데이트(푸시) 시점의 시간으로 고정됩니다.

## 📝 버전 형식

- 형식: `v` + 년(2자리) + 월(2자리) + 일(2자리) + 시(2자리) + 분(2자리)
- 예시: `v2512301611` (2025년 12월 30일 16시 11분)

## 🚀 사용 방법

### 방법 1: 수동 업데이트 (권장)

푸시하기 전에 버전 업데이트 스크립트 실행:

```bash
cd version_1
node update-version.js
git add index.html app.js
git commit -m "Update version"
git push
```

### 방법 2: 자동 업데이트 (Git Hook)

`.git/hooks/pre-push` 파일 생성:

```bash
#!/bin/sh
cd version_1
node update-version.js
git add index.html app.js
git commit -m "Auto update version" || true
```

## ✅ 확인 사항

- 버전은 푸시 시점의 시간으로 고정됨
- 새로고침해도 버전이 변경되지 않음
- 다음 푸시 시에만 버전이 업데이트됨

## 📌 중요

- 버전은 **빌드/배포 시점**에 설정됨
- 실시간으로 갱신되지 않음
- 사용자가 새로고침해도 동일한 버전 유지

