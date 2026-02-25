# GasGen Deployment Guide

Руководство по развертыванию GasGen бота на удаленном сервере с PostgreSQL базой данных.

## Архитектура

- **База данных**: PostgreSQL с расширением pgvector для векторного поиска
- **Хранение изображений**: В базе данных как BYTEA (binary data)
- **Векторный поиск**: Embeddings промптов через sentence-transformers (all-MiniLM-L6-v2)
- **Telegram бот**: python-telegram-bot

## Предварительные требования

### На вашем компьютере
- Python 3.10+
- SSH доступ к серверу
- Данные в папке `higgsfield_data_v3/`

### На сервере
- Ubuntu/Debian Linux (рекомендуется Ubuntu 22.04+)
- SSH доступ с sudo правами
- Минимум 2GB RAM (рекомендуется 4GB+)
- Минимум 10GB свободного места (зависит от объема данных)

## Быстрый деплой

### 1. Подготовка SSH подключения

Убедитесь, что вы можете подключиться к серверу:

```bash
ssh gas
```

Если подключение не настроено, добавьте в `~/.ssh/config`:

```
Host gas
    HostName your-server-ip-or-domain
    User your-username
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

### 2. Запуск автоматического деплоя

```bash
./deploy.sh
```

Скрипт выполнит:
1. ✓ Проверку SSH соединения
2. ✓ Создание директории на сервере
3. ✓ Синхронизацию файлов проекта
4. ✓ Опционально: перенос данных higgsfield_data_v3
5. ✓ Установку зависимостей в virtualenv
6. ✓ Настройку PostgreSQL и pgvector
7. ✓ Миграцию данных в базу
8. ✓ Создание systemd сервиса

### 3. Настройка переменных окружения

На сервере отредактируйте файл `.env`:

```bash
ssh gas
cd ~/gasgen
nano .env
```

Обязательные переменные:

```env
BOT_TOKEN=your_actual_telegram_bot_token
DB_PASSWORD=your_secure_database_password
```

Опциональные:

```env
OPENAI_API_KEY=your_openai_api_key
KIE_API_KEY=your_kie_api_key
```

### 4. Запуск бота

```bash
# Запуск
sudo systemctl start gasgen-bot

# Проверка статуса
sudo systemctl status gasgen-bot

# Просмотр логов
sudo journalctl -u gasgen-bot -f
```

## Ручная установка

Если автоматический деплой не подходит, следуйте этим шагам.

### 1. Установка PostgreSQL

```bash
ssh gas

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib postgresql-server-dev-all

# Проверка
sudo systemctl status postgresql
```

### 2. Установка pgvector

```bash
# Установка зависимостей
sudo apt install -y build-essential git

# Клонирование и установка pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### 3. Создание базы данных

```bash
# Подключение к PostgreSQL
sudo -u postgres psql

# В psql выполните:
CREATE DATABASE gasgen;
CREATE USER gasgen_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE gasgen TO gasgen_user;

# Подключение к базе
\c gasgen

# Включение pgvector
CREATE EXTENSION vector;

# Выход
\q
```

### 4. Перенос проекта на сервер

```bash
# С вашего компьютера
rsync -avz --progress \
    --exclude '.git' \
    --exclude '__pycache__' \
    --exclude '.env' \
    --exclude 'venv' \
    ./ gas:~/gasgen/

# Перенос данных (опционально, может занять время)
rsync -avz --progress higgsfield_data_v3/ gas:~/gasgen/higgsfield_data_v3/
```

### 5. Установка зависимостей

```bash
ssh gas
cd ~/gasgen

# Создание виртуального окружения
python3 -m venv .venv
source .venv/bin/activate

# Установка зависимостей
pip install --upgrade pip
pip install -r requirements.txt
```

### 6. Настройка .env

```bash
cp .env.example .env
nano .env
```

Обновите переменные:

```env
BOT_TOKEN=your_telegram_bot_token
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gasgen
DB_USER=gasgen_user
DB_PASSWORD=your_secure_password
```

### 7. Миграция данных

```bash
source .venv/bin/activate
python migrate_to_db.py
```

Это перенесет все данные из `higgsfield_data_v3/` в PostgreSQL. Процесс может занять 10-30 минут в зависимости от объема данных.

### 8. Создание systemd сервиса

```bash
sudo nano /etc/systemd/system/gasgen-bot.service
```

Содержимое:

```ini
[Unit]
Description=GasGen Telegram Bot
After=network.target postgresql.service

[Service]
Type=simple
User=your_username
WorkingDirectory=/home/your_username/gasgen
Environment="PATH=/home/your_username/gasgen/.venv/bin"
ExecStart=/home/your_username/gasgen/.venv/bin/python /home/your_username/gasgen/bot/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Активация сервиса:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gasgen-bot
sudo systemctl start gasgen-bot
sudo systemctl status gasgen-bot
```

## Проверка работы

### Просмотр логов

```bash
# В реальном времени
sudo journalctl -u gasgen-bot -f

# Последние 100 строк
sudo journalctl -u gasgen-bot -n 100
```

### Проверка базы данных

```bash
sudo -u postgres psql gasgen

# SQL запросы для проверки
SELECT COUNT(*) FROM posts;
SELECT COUNT(*) FROM images WHERE image_type = 'result';
SELECT COUNT(*) FROM images WHERE image_type = 'reference';
SELECT name, post_count FROM categories ORDER BY post_count DESC LIMIT 10;
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Тестирование бота

1. Откройте Telegram
2. Найдите вашего бота
3. Отправьте `/start`
4. Проверьте поиск по категориям

## Обслуживание

### Обновление кода

```bash
# С вашего компьютера
rsync -avz --progress \
    --exclude '.git' \
    --exclude '__pycache__' \
    --exclude 'higgsfield_data_v3' \
    ./ gas:~/gasgen/

# На сервере
ssh gas
cd ~/gasgen
sudo systemctl restart gasgen-bot
```

### Бэкап базы данных

```bash
# Создание бэкапа
sudo -u postgres pg_dump gasgen > gasgen_backup_$(date +%Y%m%d).sql

# Восстановление из бэкапа
sudo -u postgres psql gasgen < gasgen_backup_20260223.sql
```

### Мониторинг ресурсов

```bash
# Использование памяти
free -h

# Использование диска
df -h

# Размер базы данных
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('gasgen'));"

# Процессы Python
ps aux | grep python
```

## Решение проблем

### Бот не запускается

```bash
# Проверка логов
sudo journalctl -u gasgen-bot -n 50

# Проверка конфигурации
cd ~/gasgen
source .venv/bin/activate
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print('BOT_TOKEN:', bool(os.getenv('BOT_TOKEN')))"
```

### Ошибки подключения к БД

```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Проверка подключения
psql -h localhost -U gasgen_user -d gasgen

# Проверка логов PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Нехватка памяти

```bash
# Добавление swap (если нет)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Безопасность

### Firewall

```bash
# Установка ufw
sudo apt install ufw

# Разрешить SSH
sudo ufw allow ssh

# Включить firewall
sudo ufw enable
```

### SSL/TLS для PostgreSQL

Для production рекомендуется настроить SSL для PostgreSQL. См. [официальную документацию](https://www.postgresql.org/docs/current/ssl-tcp.html).

### Регулярные обновления

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление Python зависимостей
cd ~/gasgen
source .venv/bin/activate
pip list --outdated
pip install --upgrade package_name
```

## Производительность

### Оптимизация PostgreSQL

Отредактируйте `/etc/postgresql/*/main/postgresql.conf`:

```ini
# Для сервера с 4GB RAM
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
work_mem = 16MB
```

После изменений:

```bash
sudo systemctl restart postgresql
```

### Индексы

Индексы уже созданы в `db_schema.sql`. Для проверки их использования:

```sql
EXPLAIN ANALYZE SELECT * FROM posts WHERE model_name = 'nano_banana_2' LIMIT 10;
```

## Масштабирование

### Если база данных растет

1. **Партиционирование таблиц** - разделение по датам или категориям
2. **Отдельный сервер для БД** - вынос PostgreSQL на отдельную машину
3. **Read replicas** - создание реплик для чтения
4. **Хранение изображений в S3** - вместо БД использовать S3/MinIO

### Если много пользователей

1. **Несколько инстансов бота** - балансировка через Telegram webhook
2. **Redis кэш** - кэширование частых запросов
3. **CDN для изображений** - если переключитесь на S3

## Дополнительная информация

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [python-telegram-bot Documentation](https://docs.python-telegram-bot.org/)
- [sentence-transformers](https://www.sbert.net/)
