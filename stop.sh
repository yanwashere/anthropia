#!/bin/bash

echo "Останавливаю все серверы..."

if [ -f ".pids" ]; then
    kill $(cat .pids) 2>/dev/null || true
    rm .pids
fi

pkill -f "crm/server" 2>/dev/null || true
pkill -f "crm/client/server.js" 2>/dev/null || true

# Освободить порты
for port in 5000 3000 9000; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

echo "Готово. Все серверы остановлены."
