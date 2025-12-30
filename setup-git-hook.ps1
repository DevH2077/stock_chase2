# Git Hook 설정 스크립트 (Windows PowerShell)
# 이 스크립트를 실행하면 푸시할 때마다 자동으로 버전이 업데이트됩니다.

$hookPath = ".git\hooks\pre-push"
$hookContent = @"
#!/bin/sh
# Git pre-push hook: 푸시 전에 버전 자동 업데이트 (한국 시간)

# 현재 디렉토리가 version_1인지 확인
if [ -f "update-version.js" ]; then
    node update-version.js
    git add index.html app.js
    git commit -m "Auto update version to latest push time (KST)" || true
fi
"@

# hooks 디렉토리 생성
if (-not (Test-Path ".git\hooks")) {
    New-Item -ItemType Directory -Path ".git\hooks" -Force | Out-Null
}

# hook 파일 생성
Set-Content -Path $hookPath -Value $hookContent -Encoding UTF8

Write-Host "✅ Git pre-push hook이 설정되었습니다!" -ForegroundColor Green
Write-Host "이제 git push를 실행하면 자동으로 버전이 업데이트됩니다." -ForegroundColor Cyan

