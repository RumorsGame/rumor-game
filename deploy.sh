#!/bin/bash
# 部署脚本 - 在宝塔服务器上执行
# 用法: bash deploy.sh

set -e

APP_DIR="/www/wwwroot/rumor-game"

echo "=== 1. 安装后端依赖 ==="
cd "$APP_DIR"
npm install --production=false

echo "=== 2. 生成 Prisma Client ==="
npx prisma generate

echo "=== 3. 初始化数据库 ==="
npx prisma db push

echo "=== 4. 安装前端依赖 ==="
cd "$APP_DIR/web"
npm install --production=false

echo "=== 5. 构建前端 (NEXT_PUBLIC_API_URL 为空，走 Nginx 代理) ==="
NEXT_PUBLIC_API_URL="" npm run build

echo "=== 6. 启动/重启 PM2 ==="
cd "$APP_DIR"
pm2 delete rumor-api rumor-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "=== 部署完成 ==="
echo "后端: http://localhost:6000"
echo "前端: http://localhost:6001"
echo "请确保 Nginx 已配置反向代理 -> rumor.site"
echo ""
pm2 status
