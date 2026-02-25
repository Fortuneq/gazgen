"""
Тестовый запуск парсера с ограничением на 2 элемента
"""
from higgsfield_parser import parse_higgsfield_community

if __name__ == "__main__":
    print("Запуск тестового парсинга (2 элемента)...")
    results = parse_higgsfield_community(headless=False, max_items=2)
    print(f"\nУспешно обработано: {len(results)} элементов")
