#!/bin/bash

# ============================================================
# 🚀 ANTHROPIA CRM - Startup Script для macOS
# Запускает все сервисы одной командой
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# 🔍 Проверка зависимостей
# ============================================================

echo -e "${BLUE}🔍 Проверка зависимостей...${NC}"

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен!${NC}"
    echo "Установи Node.js с https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не установлен!${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

# ============================================================
# 📦 Установка зависимостей Backend
# ============================================================

echo -e "\n${BLUE}📦 Установка зависимостей Backend...${NC}"
if [ ! -d "crm/server/node_modules" ]; then
    cd "$PROJECT_DIR/crm/server"
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✓ Backend зависимости установлены${NC}"
else
    echo -e "${GREEN}✓ Backend зависимости уже установлены${NC}"
fi

cd "$PROJECT_DIR"

# ============================================================
# 🚀 Запуск сервисов в новых терминальных окнах
# ============================================================

echo -e "\n${YELLOW}🚀 Запуск сервисов...${NC}"

# Функция для запуска команды в новом терминальном окне на Mac
open_terminal_window() {
    local title=$1
    local command=$2

    osascript <<EOF
tell application "Terminal"
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "$command" in front window
    set custom title of front window to "$title"
end tell
EOF
}

# Запуск Backend (порт 5000)
echo -e "${BLUE}→ Запуск Backend (порт 5000)...${NC}"
open_terminal_window "CRM Backend" "cd '$PROJECT_DIR/crm/server' && npm start"
sleep 3

# Запуск Frontend (порт 3000)
echo -e "${BLUE}→ Запуск Frontend (порт 3000)...${NC}"
open_terminal_window "CRM Panel" "cd '$PROJECT_DIR/crm/client' && node server.js"
sleep 2

# Запуск Основного сайта (порт 8000)
echo -e "${BLUE}→ Запуск Основного сайта (порт 8000)...${NC}"
open_terminal_window "Main Site" "cd '$PROJECT_DIR' && node server.js"
sleep 2

# ============================================================
# 🌐 Открытие браузера
# ============================================================

echo -e "\n${GREEN}✅ Все сервисы запущены!${NC}"
echo -e "\n${YELLOW}🌐 Открываю браузер...${NC}"

sleep 2
open "http://localhost:8000"

# ============================================================
# 📊 Информация о сервисах
# ============================================================

echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}   🚀 ANTHROPIA CRM - Запущено!${NC}      ${BLUE}║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  🌐 Основной сайт:${NC}"
echo -e "${BLUE}║${NC}     http://localhost:8000"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  👤 Панель модератора:${NC}"
echo -e "${BLUE}║${NC}     http://localhost:3000"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  ⚙️  API Backend:${NC}"
echo -e "${BLUE}║${NC}     http://localhost:5000/api"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  Каждый сервис запущен в отдельном${NC}"
echo -e "${BLUE}║${NC}  терминальном окне. Закрой любое${NC}"
echo -e "${BLUE}║${NC}  окно чтобы остановить сервис.${NC}"
echo -e "${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "${YELLOW}💡 Советы:${NC}"
echo -e "   • Заполни форму на сайте → данные попадут в CRM"
echo -e "   • Зарегистрируйся на http://localhost:3000"
echo -e "   • Просмотри заявки и обработай их"
echo -e "   • Проверь логи в каждом терминальном окне"
echo -e ""
