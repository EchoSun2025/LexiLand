# 前端项目初始化脚本

Write-Host "正在初始化前端项目..." -ForegroundColor Cyan

# 创建 Vite + React + TypeScript 项目
cd D:\00working\20260110_CODE_Lexiland_read

if (Test-Path "frontend") {
    Write-Host "frontend 目录已存在，跳过 Vite 初始化" -ForegroundColor Yellow
} else {
    npm create vite@latest frontend -- --template react-ts
}

cd frontend

# 安装核心依赖
Write-Host "`n安装核心依赖..." -ForegroundColor Cyan
npm install

# 安装状态管理
npm install zustand immer

# 安装数据存储
npm install dexie dexie-react-hooks

# 安装样式
npm install tailwindcss postcss autoprefixer
npm install clsx tailwind-merge

# 安装文档解析
npm install epubjs mammoth

# 安装 UI 组件
npm install @headlessui/react @heroicons/react

# 安装工具库
npm install nanoid date-fns

# 安装开发依赖
npm install -D @types/node

# 初始化 Tailwind CSS
npx tailwindcss init -p

Write-Host "`n前端项目初始化完成！" -ForegroundColor Green
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. cd frontend" -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
