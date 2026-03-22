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
pkill -f "crm/server/index" 2>/dev/null || true
pkill -f "crm/client/server" 2>/dev/null || true
pkill -f "anthropia/server.js" 2>/dev/null || true
# Освободить порты (lsof для macOS, fuser для Linux)
for PORT in 5001 3000 9000; do
  if command -v lsof &> /dev/null; then
    lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true
  elif command -v fuser &> /dev/null; then
    fuser -k ${PORT}/tcp 2>/dev/null || true
  fi
done
sleep 2

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js не установлен! Скачай с https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v)${NC}"

# Установка зависимостей Backend (всегда проверяем)
echo -e "${BLUE}Проверяю зависимости Backend...${NC}"
cd "$PROJECT_DIR/crm/server"
npm install 2>&1 | tail -1
cd "$PROJECT_DIR"

# Создать папку для логов
mkdir -p "$PROJECT_DIR/logs"

# Запуск Backend (порт 5000)
echo -e "${BLUE}Запуск Backend (порт 5000)...${NC}"
cd "$PROJECT_DIR/crm/server"
node index.js > "$PROJECT_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$PROJECT_DIR"

# Ждём пока бэкенд поднимется (до 10 секунд)
echo -n "Жду Backend"
for i in {1..10}; do
  sleep 1
  echo -n "."
  if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}Backend запущен!${NC}"
    break
  fi
  if [ $i -eq 10 ]; then
    echo ""
    echo -e "${RED}Backend не запустился! Последние строки лога:${NC}"
    tail -20 "$PROJECT_DIR/logs/backend.log"
    echo ""
    echo -e "${RED}Запусти вручную для диагностики: cd ~/anthropia/crm/server && node index.js${NC}"
    exit 1
  fi
done

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

# Итоговая проверка
echo ""
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}Backend    (5001) — OK${NC}"
else
    echo -e "${RED}Backend    (5001) — не отвечает${NC}"
    echo "--- backend.log ---"
    tail -10 "$PROJECT_DIR/logs/backend.log"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}CRM Panel  (3000) — OK${NC}"
else
    echo -e "${RED}CRM Panel  (3000) — не отвечает${NC}"
fi

if curl -s http://localhost:9000 > /dev/null 2>&1; then
    echo -e "${GREEN}Main Site  (9000) — OK${NC}"
else
    echo -e "${RED}Main Site  (9000) — не отвечает${NC}"
fi

echo ""
echo -e "  Основной сайт:   ${GREEN}http://localhost:9000${NC}"
echo -e "  Панель CRM:      ${GREEN}http://localhost:3000${NC}"
echo -e "  API Backend:     ${GREEN}http://localhost:5001/api${NC}"
echo ""
echo -e "${YELLOW}Для остановки:${NC} ./stop.sh"
echo -e "${YELLOW}Логи:${NC} logs/backend.log | logs/crm.log | logs/site.log"
echo ""

# Сохранить PID для остановки
echo "$BACKEND_PID $CRM_PID $SITE_PID" > "$PROJECT_DIR/.pids"

# Открыть браузер
open "http://localhost:9000"
