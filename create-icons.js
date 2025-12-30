// Node.js를 사용하여 아이콘을 생성하는 스크립트
// 사용법: node create-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // 주식 차트 아이콘 그리기
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📈', size / 2, size / 2);
    
    // PNG로 저장
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icon-${size}.png`, buffer);
    console.log(`icon-${size}.png 생성 완료`);
}

// canvas 패키지가 설치되어 있는지 확인
try {
    createIcon(192);
    createIcon(512);
    console.log('모든 아이콘 생성 완료!');
} catch (error) {
    console.log('canvas 패키지가 필요합니다. 다음 명령어로 설치하세요:');
    console.log('npm install canvas');
    console.log('\n또는 generate-icons.html을 브라우저에서 열어 아이콘을 생성하세요.');
}

