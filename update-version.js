// 버전 업데이트 스크립트
// 푸시 전에 실행하여 버전을 현재 시간으로 업데이트

const fs = require('fs');
const path = require('path');

// 한국 시간(KST, UTC+9)으로 버전 생성
const now = new Date();
// 한국 시간으로 변환 (UTC+9)
const koreaTimeStr = now.toLocaleString('en-US', { 
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
});
// "12/30/2024, 16:11" 형식을 파싱
const [datePart, timePart] = koreaTimeStr.split(', ');
const [month, day, year] = datePart.split('/');
const [hour, minute] = timePart.split(':');
const version = `v${year.slice(-2)}${month.padStart(2, '0')}${day.padStart(2, '0')}${hour.padStart(2, '0')}${minute.padStart(2, '0')}`;

// index.html 읽기
const indexPath = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// 버전 업데이트
htmlContent = htmlContent.replace(
    /<span class="version-badge" id="versionBadge">.*?<\/span>/,
    `<span class="version-badge" id="versionBadge">${version}</span>`
);

// app.js에 버전 상수 추가/업데이트
const appJsPath = path.join(__dirname, 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// 버전 상수 찾기 및 업데이트
const versionConstRegex = /const\s+APP_VERSION\s*=\s*['"](.*?)['"]/;
if (versionConstRegex.test(appJsContent)) {
    appJsContent = appJsContent.replace(versionConstRegex, `const APP_VERSION = '${version}'`);
} else {
    // 버전 상수가 없으면 추가 (주식 데이터 배열 다음에)
    appJsContent = appJsContent.replace(
        /\/\/ 알림 목록\s+let alerts = \[\];/,
        `// 알림 목록\nlet alerts = [];\n\n// 앱 버전 (빌드 시점에 설정)\nconst APP_VERSION = '${version}';`
    );
}

// 파일 저장
fs.writeFileSync(indexPath, htmlContent, 'utf8');
fs.writeFileSync(appJsPath, appJsContent, 'utf8');

console.log(`✅ 버전이 ${version}으로 업데이트되었습니다.`);

