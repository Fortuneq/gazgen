# Higgsfield Community Parser

Парсер для извлечения данных с сайта https://higgsfield.ai/community/

## Что извлекается

Для каждого поста на странице:
- Основное изображение (job media)
- Промпт (JSON с подробным описанием)
- Референсное изображение (attribute-image)

## Установка

```bash
# Активировать виртуальное окружение
source .venv/bin/activate

# Установить зависимости (уже установлено)
pip install -r requirements.txt

# Установить браузеры Playwright (уже установлено)
playwright install chromium
```

## Использование

### Тестовый запуск (2 элемента)

```bash
python test_parser.py
```

### Полный парсинг всех элементов

```bash
python higgsfield_parser.py
```

### Параметры в скрипте

В файле `higgsfield_parser.py` (строки 129-130) можно настроить:

- `HEADLESS = False` - браузер будет видимым (рекомендуется, так как вы авторизованы)
- `MAX_ITEMS = None` - парсить все элементы (или укажите число, например `10` для теста)

**Важно:** Парсер работает с вашего аккаунта, поэтому браузер должен быть в видимом режиме (HEADLESS=False)

## Результаты

После запуска создастся папка `higgsfield_data/` со структурой:

```
higgsfield_data/
├── results.json          # JSON со всеми данными
├── images/              # Основные изображения
│   ├── image_0000.webp
│   ├── image_0001.webp
│   └── ...
└── references/          # Референсные изображения
    ├── reference_0000.webp
    ├── reference_0001.webp
    └── ...
```

### Формат results.json

```json
[
  {
    "id": 0,
    "main_image_url": "https://...",
    "main_image_path": "higgsfield_data/images/image_0000.webp",
    "prompt": "{...}",
    "reference_image_url": "https://...",
    "reference_image_path": "higgsfield_data/references/reference_0000.webp"
  }
]
```

## Примечания

- Парсер работает с вашим аккаунтом (браузер в видимом режиме)
- Автоматически закрывает cookie consent dialog
- Скроллит страницу для загрузки всех элементов
- Автоматически скачивает изображения в высоком качестве
- Обрабатывает ошибки и продолжает работу
- Промпты извлекаются в формате JSON из alt-атрибутов или figcaption элементов
- Референсные изображения извлекаются из модальных окон

## Файлы проекта

- `higgsfield_parser.py` - основной парсер
- `test_parser.py` - тестовый скрипт (2 элемента)
- `save_page_html.py` - вспомогательный скрипт для отладки
- `requirements.txt` - зависимости проекта
# gazgen
