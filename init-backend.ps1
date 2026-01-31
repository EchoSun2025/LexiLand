# 后端项目初始化脚本

Write-Host "正在初始化后端项目..." -ForegroundColor Cyan

cd D:\00working\20260110_CODE_Lexiland_read

# 创建后端目录
if (-not (Test-Path "backend")) {
    New-Item -ItemType Directory -Path "backend"
}

cd backend

# 初始化 package.json
if (-not (Test-Path "package.json")) {
    npm init -y
}

# 安装核心依赖
Write-Host "`n安装核心依赖..." -ForegroundColor Cyan
npm install fastify @fastify/cors @fastify/rate-limit
npm install openai
npm install better-sqlite3
npm install dotenv

# 安装开发依赖
npm install -D typescript @types/node @types/better-sqlite3
npm install -D tsx nodemon

Write-Host "`n配置 TypeScript..." -ForegroundColor Cyan

# 创建 tsconfig.json
@"
{
  \"compilerOptions\": {
    \"target\": \"ES2020\",
    \"module\": \"ESNext\",
    \"lib\": [\"ES2020\"],
    \"moduleResolution\": \"node\",
    \"esModuleInterop\": true,
    \"strict\": true,
    \"skipLibCheck\": true,
    \"forceConsistentCasingInFileNames\": true,
    \"resolveJsonModule\": true,
    \"outDir\": \"./dist\",
    \"rootDir\": \"./src\"
  },
  \"include\": [\"src/**/*\"],
  \"exclude\": [\"node_modules\", \"dist\"]
}
"@ | Out-File -FilePath "tsconfig.json" -Encoding UTF8

# 更新 package.json scripts
Write-Host "`n更新 package.json scripts..." -ForegroundColor Cyan

$packageJson = Get-Content "package.json" | ConvertFrom-Json
$packageJson.scripts = @{
    "dev" = "tsx watch src/index.ts"
    "build" = "tsc"
    "start" = "node dist/index.js"
}
$packageJson | ConvertTo-Json -Depth 10 | Out-File "package.json" -Encoding UTF8

Write-Host "`n后端项目初始化完成！" -ForegroundColor Green
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 创建 .env 文件并填入 OPENAI_API_KEY" -ForegroundColor White
Write-Host "2. cd backend" -ForegroundColor White
Write-Host "3. npm run dev" -ForegroundColor White
