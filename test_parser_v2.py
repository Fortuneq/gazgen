"""
Тестовый запуск улучшенного парсера (3 элемента)
"""
from higgsfield_parser_v2 import parse_higgsfield_community

if __name__ == "__main__":
    print("Запуск тестового парсинга v2 (3 элемента)...")
    results = parse_higgsfield_community(headless=False, max_items=3)
    print(f"\nУспешно обработано: {len(results)} элементов")
