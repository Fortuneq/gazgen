# GasGen Docker Deployment Guide

Руководство по развертыванию GasGen бота с использованием Docker и Docker Compose.

## Преимущества Docker развертывания

- 🚀 Быстрое развертывание одной командой
- 🔒 Изолированное окружение для каждого сервиса
- 📊 Встроенная поддержка мониторинга (Prometheus + Grafana)
- 🔄 Автоматический перезапуск при сбоях
- 📈 Легкое масштабирование
- 🛠️ Упрощенное управление зависимостями

## Архитектура

```
gasgen_network (bridge)
├── postgres (PostgreSQL 16 + pgvector)
│   ├── Port: 5432
│   └── Volume: postgres_data
├── bot (Python 3.11 + Telegram Bot)
│   └── Volume: bot_data
├── pgadmin (опционально)
│   └── Port: 5050
├── prometheus (опционально)
│   └── Port: 9090
└── grafana (опционально)
    └── Port: 3000
```

## Предварительные требования

### На сервере

1. Docker 20.10+ и Docker Compose 2.0+:

```bash
# Установка Docker
curl -fsSL https://get.docker.com | sh

# Установка Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Проверка
docker --version
docker compose version
```

2. Минимум 4GB RAM и 15GB свободного места

## Быстрый старт

### 1. Подготовка .env файла

```bash
cp .env.example .env
nano .env
```

Обязательные переменные:

```env
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token

# Database
DB_NAME=gasgen
DB_USER=gasgen_user
DB_PASSWORD=your_secure_password_here

# Optional APIs
OPENAI_API_KEY=your_openai_api_key
KIE_API_KEY=your_kie_api_key
```

### 2. Запуск базовой конфигурации

```bash
# Запуск PostgreSQL и бота
docker compose up -d
```

### 3. Проверка статуса

```bash
# Проверка запущенных контейнеров
docker compose ps

# Просмотр логов бота
docker compose logs -f bot

# Просмотр логов базы данных
docker compose logs -f postgres
```

### 4. Миграция данных в БД

После запуска контейнеров нужно мигрировать данные:

```bash
# На локальной машине: перенос файлов на сервер
scp -r higgsfield_data_v3 gas:/tmp/
scp migrate_to_db.py gas:/tmp/

# На сервере: запуск миграции внутри контейнера
ssh gas
cd ~/gasgen

# Копирование данных в volume контейнера
docker cp /tmp/higgsfield_data_v3 gasgen_bot:/app/data/

# Запуск миграции
docker exec -it gasgen_bot python /tmp/migrate_to_db.py
```

## Расширенная конфигурация

### Запуск с pgAdmin (веб-интерфейс для БД)

```bash
docker compose --profile admin up -d
```

Доступ: http://your-server:5050
- Email: admin@gasgen.local (из .env)
- Password: admin (из .env)

### Запуск с мониторингом (Prometheus + Grafana)

```bash
docker compose --profile monitoring up -d
```

Доступ:
- Prometheus: http://your-server:9090
- Grafana: http://your-server:3000
  - Username: admin (из .env)
  - Password: admin (из .env)

## Управление

### Основные команды

```bash
# Запуск
docker compose up -d

# Остановка
docker compose down

# Перезапуск
docker compose restart

# Просмотр логов
docker compose logs -f

# Обновление образов
docker compose pull
docker compose up -d

# Очистка (ВНИМАНИЕ: удалит все данные!)
docker compose down -v
```

### Управление отдельными сервисами

```bash
# Перезапуск только бота
docker compose restart bot

# Просмотр логов только бота
docker compose logs -f bot

# Остановка только бота
docker compose stop bot
```

### Обновление кода бота

```bash
# Пересборка образа после изменений
docker compose build bot

# Применение изменений
docker compose up -d bot
```

## Мониторинг и аналитика

### Проверка здоровья контейнеров

```bash
docker compose ps
```

### Метрики использования ресурсов

```bash
docker stats gasgen_bot gasgen_postgres
```

### Подключение к базе данных

```bash
# Через psql
docker exec -it gasgen_postgres psql -U gasgen_user -d gasgen

# SQL запросы для аналитики
SELECT * FROM user_activity_summary LIMIT 10;
SELECT * FROM popular_models;
SELECT * FROM button_stats;
```

### Экспорт данных аналитики

```bash
# CSV экспорт статистики пользователей
docker exec gasgen_postgres psql -U gasgen_user -d gasgen -c "\
COPY (SELECT * FROM user_activity_summary) TO STDOUT WITH CSV HEADER" \
> user_stats.csv

# Экспорт популярных моделей
docker exec gasgen_postgres psql -U gasgen_user -d gasgen -c "\
COPY (SELECT * FROM popular_models) TO STDOUT WITH CSV HEADER" \
> popular_models.csv
```

## Бэкап и восстановление

### Создание бэкапа

```bash
# Бэкап базы данных
docker exec gasgen_postgres pg_dump -U gasgen_user gasgen > gasgen_backup_$(date +%Y%m%d).sql

# Бэкап volumes
docker run --rm \
  -v gasgen_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz -C /data .
```

### Восстановление из бэкапа

```bash
# Остановка бота
docker compose stop bot

# Восстановление БД
cat gasgen_backup_20260223.sql | docker exec -i gasgen_postgres psql -U gasgen_user -d gasgen

# Перезапуск
docker compose start bot
```

## Решение проблем

### Бот не запускается

```bash
# Проверка логов
docker compose logs bot

# Проверка переменных окружения
docker exec gasgen_bot env | grep BOT_TOKEN

# Перезапуск с пересборкой
docker compose down
docker compose build --no-cache bot
docker compose up -d
```

### База данных не отвечает

```bash
# Проверка состояния
docker compose ps postgres

# Проверка логов
docker compose logs postgres

# Перезапуск PostgreSQL
docker compose restart postgres

# Проверка подключения
docker exec gasgen_postgres pg_isready -U gasgen_user
```

### Недостаточно памяти

```bash
# Проверка использования
docker stats

# Увеличение лимитов в docker-compose.yml:
services:
  bot:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### Очистка места на диске

```bash
# Удаление неиспользуемых образов
docker system prune -a

# Очистка логов
docker compose logs --no-log-prefix > /dev/null

# Проверка размера volumes
docker system df -v
```

## Безопасность

### Важные рекомендации

1. **Смените пароли по умолчанию** в .env
2. **Используйте firewall** для ограничения доступа к портам
3. **Регулярно обновляйте** образы Docker
4. **Настройте SSL/TLS** для веб-интерфейсов (pgAdmin, Grafana)
5. **Ограничьте права** доступа к .env файлу

```bash
chmod 600 .env
```

### Настройка firewall (UFW)

```bash
# Разрешить только SSH и закрыть остальные порты
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable

# Опционально: открыть порты для веб-интерфейсов
# sudo ufw allow 5050/tcp  # pgAdmin
# sudo ufw allow 3000/tcp  # Grafana
```

## Производительность

### Оптимизация PostgreSQL

Добавьте в docker-compose.yml:

```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c maintenance_work_mem=128MB
    -c work_mem=16MB
    -c max_connections=50
```

### Оптимизация логов

```yaml
bot:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## Масштабирование

### Горизонтальное масштабирование бота

```yaml
bot:
  deploy:
    replicas: 3
    restart_policy:
      condition: on-failure
```

### Использование внешней БД

Если база данных размещена отдельно:

```yaml
# Удалите секцию postgres из docker-compose.yml
# Обновите DB_HOST в .env
DB_HOST=your-external-db-host.com
```

## Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

## Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose logs`
2. Проверьте статус: `docker compose ps`
3. Откройте issue на GitHub
