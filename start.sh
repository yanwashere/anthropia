#!/bin/bash

# ============================================================
# ANTHROPIA CRM - Startup Script для macOS
# Запускает все сервисы одной командой (фоновые процессы)
# ============================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Остановить старые процессы если есть
echo -e "${YELLOW}Останавливаю старые процессы...${NC}"
pkill -f "crm/server" 2>/dev/null || true
pkill -f "crm/client" 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 9000/tcp 2>/dev/null || true
sleep 1

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js не установлен! Скачай с https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v)${NC}"

# Установка зависимостей Backend
if [ ! -d "$PROJECT_DIR/crm/server/node_modules" ]; then
    echo -e "${BLUE}Устанавливаю зависимости Backend...${NC}"
    cd "$PROJECT_DIR/crm/server" && npm install > /dev/null 2>&1
    echo -e "${GREEN}Готово${NC}"
fi

cd "$PROJECT_DIR"

# Создать папку для логов
mkdir -p "$PROJECT_DIR/logs"

# Запуск Backend (порт 5000)
echo -e "${BLUE}Запуск Backend (порт 5000)...${NC}"
cd "$PROJECT_DIR/crm/server"
npm start > "$PROJECT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!

cd "$PROJECT_DIR"
sleep 2

# Запуск Frontend CRM (порт 3000)
echo -e "${BLUE}Запуск CRM Panel (порт 3000)...${NC}"
node "$PROJECT_DIR/crm/client/server.js" > "$PROJECT_DIR/logs/crm.log" 2>&1 &
CRM_PID=$!

sleep 1

# Запуск основного сайта (порт 9000)
echo -e "${BLUE}Запуск основного сайта (порт 9000)...${NC}"
node "$PROJECT_DIR/server.js" > "$PROJECT_DIR/logs/site.log" 2>&1 &
SITE_PID=$!

sleep 2

# Проверка что всё запустилось
echo ""
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}Backend (5000) — OK${NC}"
else
    echo -e "${RED}Backend (5000) — не отвечает (проверь logs/backend.log)${NC}"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}CRM Panel (3000) — OK${NC}"
else
    echo -e "${RED}CRM Panel (3000) — не отвечает (проверь logs/crm.log)${NC}"
fi

if curl -s http://localhost:9000 > /dev/null 2>&1; then
    echo -e "${GREEN}Main Site (9000) — OK${NC}"
else
    echo -e "${RED}Main Site (9000) — не отвечает (проверь logs/site.log)${NC}"
fi

echo ""
echo -e "${GREEN}Все сервисы запущены в фоне!${NC}"
echo ""
echo -e "  Основной сайт:   http://localhost:9000"
echo -e "  Панель CRM:      http://localhost:3000"
echo -e "  API Backend:     http://localhost:5000/api"
echo ""
echo -e "${YELLOW}Для остановки всех серверов:${NC} ./stop.sh"
echo -e "${YELLOW}Логи:${NC} logs/backend.log | logs/crm.log | logs/site.log"
echo ""

# Сохранить PID для остановки
echo "$BACKEND_PID $CRM_PID $SITE_PID" > "$PROJECT_DIR/.pids"

# Открыть браузер
open "http://localhost:9000"
