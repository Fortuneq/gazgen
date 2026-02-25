"""
Database-compatible image composer - works with BYTEA image data from PostgreSQL
"""
import io
from PIL import Image, ImageDraw
from typing import Optional, List

def compose_from_db_post(post: dict) -> Optional[bytes]:
    """
    Создаёт составное изображение из данных поста в БД
    Референсы накладываются поверх основного изображения в нижнем левом углу

    Args:
        post: dict с ключами 'result_image' (bytes) и 'reference_images' (list[bytes] или None)

    Returns:
        bytes: JPEG изображение или None если нет основного изображения
    """
    # Получаем основное изображение
    result_image_data = post.get('result_image')
    if not result_image_data:
        return None

    # Загружаем основное изображение из bytes
    try:
        main_img = Image.open(io.BytesIO(result_image_data)).convert('RGB')
    except Exception as e:
        print(f"Error loading main image: {e}")
        return None

    # Проверяем наличие референсов
    reference_images_data = post.get('reference_images') or []

    # Если нет референсов, возвращаем только основное изображение
    if not reference_images_data:
        output = io.BytesIO()
        main_img.save(output, format='JPEG', quality=95)
        return output.getvalue()

    # Загружаем референсы из bytes
    ref_images = []
    for ref_data in reference_images_data:
        if ref_data:
            try:
                ref_img = Image.open(io.BytesIO(ref_data)).convert('RGBA')
                ref_images.append(ref_img)
            except Exception as e:
                print(f"Error loading reference image: {e}")
                continue

    # Если нет валидных референсов, возвращаем только основное изображение
    if not ref_images:
        output = io.BytesIO()
        main_img.save(output, format='JPEG', quality=95)
        return output.getvalue()

    # Создаем копию основного изображения для работы
    result = main_img.copy()
    main_w, main_h = result.size

    # Рассчитываем размер для референсов (30% больше базового размера)
    base_ref_size = int(min(main_w, main_h) * 0.20)  # 20% от меньшей стороны основного изображения
    ref_size = int(base_ref_size * 1.3)  # +30% как просили

    # Параметры размещения
    spacing = 15  # Отступ между референсами
    margin = 20   # Отступ от края изображения

    # Создаем миниатюры референсов
    thumbs = []
    for ref_img in ref_images:
        # Создаем квадратную миниатюру
        thumb = ref_img.copy()
        thumb.thumbnail((ref_size, ref_size), Image.Resampling.LANCZOS)

        # Создаем белый фон для референса с небольшой рамкой
        bg_size = ref_size + 10
        bg = Image.new('RGBA', (bg_size, bg_size), (255, 255, 255, 230))

        # Центрируем референс на белом фоне
        thumb_x = (bg_size - thumb.width) // 2
        thumb_y = (bg_size - thumb.height) // 2
        bg.paste(thumb, (thumb_x, thumb_y), thumb if thumb.mode == 'RGBA' else None)

        # Добавляем тонкую рамку
        draw = ImageDraw.Draw(bg)
        draw.rectangle([0, 0, bg_size-1, bg_size-1], outline=(200, 200, 200, 230), width=2)

        thumbs.append(bg)

    # Конвертируем result в RGBA для наложения референсов
    result = result.convert('RGBA')

    # Размещаем референсы в нижнем левом углу
    x_pos = margin
    y_pos = main_h - (ref_size + 10) - margin

    for i, thumb in enumerate(thumbs):
        # Если референсы не помещаются в один ряд, создаем новый ряд выше
        if x_pos + thumb.width > main_w - margin:
            x_pos = margin
            y_pos -= (ref_size + 10) + spacing

        # Накладываем референс поверх основного изображения
        result.paste(thumb, (x_pos, y_pos), thumb)

        # Смещаем позицию для следующего референса
        x_pos += thumb.width + spacing

    # Конвертируем обратно в RGB и сохраняем
    result = result.convert('RGB')
    output = io.BytesIO()
    result.save(output, format='JPEG', quality=95)
    return output.getvalue()
