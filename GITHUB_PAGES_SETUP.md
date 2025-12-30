# 🚀 GitHub Pages 무료 호스팅 설정 가이드

GitHub Pages를 사용하여 무료로 웹사이트를 호스팅하는 방법입니다.

## 📋 설정 단계

### 1단계: GitHub 저장소에서 Pages 설정

1. **GitHub 저장소로 이동**
   - https://github.com/DevH2077/stock_chase2 로 이동

2. **Settings 메뉴 클릭**
   - 저장소 상단의 "Settings" 탭 클릭

3. **Pages 설정**
   - 왼쪽 사이드바에서 "Pages" 클릭
   - "Source" 섹션에서:
     - Branch: `main` 선택
     - Folder: `/ (root)` 선택
   - "Save" 버튼 클릭

4. **도메인 확인**
   - 몇 분 후 다음 주소로 접속 가능:
     ```
     https://devh2077.github.io/stock_chase2/
     ```

### 2단계: 커스텀 도메인 설정 (선택사항)

더 나은 도메인을 원하시면:

1. **무료 도메인 서비스**
   - [Freenom](https://www.freenom.com/) - 무료 .tk, .ml, .ga 도메인
   - [No-IP](https://www.noip.com/) - 무료 동적 DNS

2. **GitHub Pages에 커스텀 도메인 연결**
   - Settings > Pages > Custom domain
   - 도메인 입력 (예: stock-chase.tk)
   - DNS 설정:
     - A 레코드: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     - 또는 CNAME: `devh2077.github.io`

## 🌐 접속 주소

설정 완료 후 다음 주소로 접속:

```
https://devh2077.github.io/stock_chase2/
```

## ⚙️ 자동 배포

코드를 업데이트하면:

```bash
cd version_1
git add .
git commit -m "업데이트 내용"
git push
```

GitHub Pages가 자동으로 업데이트됩니다 (몇 분 소요).

## 📱 PWA 설치

1. 위 주소로 모바일 브라우저에서 접속
2. 홈 화면에 추가
3. 독립 앱처럼 사용 가능

## ✅ 확인 사항

- ✅ HTTPS 자동 적용 (무료)
- ✅ 전 세계 CDN 제공
- ✅ 무료 호스팅
- ✅ 자동 배포
- ✅ 커스텀 도메인 지원

## 🔧 문제 해결

### Pages가 활성화되지 않아요
- 저장소가 Public인지 확인
- Settings > Pages에서 올바른 브랜치 선택 확인

### 사이트가 보이지 않아요
- 몇 분 기다려보세요 (최대 10분)
- 브라우저 캐시 삭제 후 다시 시도
- `index.html` 파일이 루트에 있는지 확인

### HTTPS 오류가 발생해요
- GitHub Pages는 자동으로 HTTPS를 제공합니다
- 혼합 콘텐츠 오류가 있다면 모든 리소스를 HTTPS로 로드하도록 확인

## 📝 참고

- GitHub Pages는 정적 사이트만 호스팅 가능
- 서버 사이드 코드는 작동하지 않음
- API 호출은 클라이언트 사이드에서만 가능

