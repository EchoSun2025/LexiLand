# 完整项目初始化脚本

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  LexiLand Read 项目初始化" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$projectRoot = "D:\00working\20260110_CODE_Lexiland_read"

# 1. 安装根目录依赖
Write-Host "`n[1/4] 安装根目录依赖..." -ForegroundColor Yellow
cd $projectRoot
npm install

# 2. 初始化 shared
Write-Host "`n[2/4] 初始化 shared 模块..." -ForegroundColor Yellow
cd shared
npm install

# 3. 初始化前端
Write-Host "`n[3/4] 初始化前端..." -ForegroundColor Yellow
& "$projectRoot\init-frontend.ps1"

# 4. 初始化后端
Write-Host "`n[4/4] 初始化后端..." -ForegroundColor Yellow
& "$projectRoot\init-backend.ps1"

# 5. 创建 .env 文件
Write-Host "`n创建环境变量文件..." -ForegroundColor Yellow
cd $projectRoot
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "已创建 .env 文件，请编辑并填入 OPENAI_API_KEY" -ForegroundColor Cyan
}

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "  初始化完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

Write-Host "`n下一步：" -ForegroundColor Yellow
Write-Host "1. 编辑 .env 文件，填入 OPENAI_API_KEY" -ForegroundColor White
Write-Host "2. 运行: npm run dev" -ForegroundColor White
Write-Host "3. 访问: http://localhost:5173" -ForegroundColor White
