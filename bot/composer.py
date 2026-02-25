"""
Compositor: склеивает main image + reference thumbnails в одно фото
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import io


def compose_post_image(
    post_folder: str,
    main_filename: str = "result.webp",
    max_refs: int = 5,
    main_width: int = 900,
    ref_height: int = 160,
    padding: int = 8,
    bg_color: tuple = (15, 15, 15),
) -> bytes | None:
    """
    Создаёт составное изображение:
    - Основное фото сверху
    - Полоска референсов снизу (если есть)

    Возвращает bytes PNG или None при ошибке.
    """
    folder = Path(post_folder)
    main_path = folder / main_filename

    if not main_path.exists():
        return None

    try:
        main_img = Image.open(main_path).convert("RGB")
    except Exception:
        return None

    # Масштабируем главное фото
    orig_w, orig_h = main_img.size
    scale = main_width / orig_w
    main_img = main_img.resize(
        (main_width, int(orig_h * scale)), Image.LANCZOS
    )
    main_w, main_h = main_img.size

    # Находим референсы
    ref_files = sorted(folder.glob("reference_*.webp"))[:max_refs]

    if not ref_files:
        # Нет референсов — просто возвращаем главное фото
        buf = io.BytesIO()
        main_img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

    # Загружаем и ресайзим референсы
    ref_images = []
    for rf in ref_files:
        try:
            ref_img = Image.open(rf).convert("RGB")
            rw, rh = ref_img.size
            scale_r = ref_height / rh
            ref_img = ref_img.resize((int(rw * scale_r), ref_height), Image.LANCZOS)
            ref_images.append(ref_img)
        except Exception:
            continue

    if not ref_images:
        buf = io.BytesIO()
        main_img.save(buf, format="JPEG", quality=90)
        return buf.getvalue()

    # Считаем общую ширину полоски референсов
    total_refs_w = sum(r.width for r in ref_images) + padding * (len(ref_images) - 1)

    # Итоговый холст
    canvas_w = max(main_w, total_refs_w) + padding * 2
    canvas_h = main_h + ref_height + padding * 3

    canvas = Image.new("RGB", (canvas_w, canvas_h), bg_color)

    # Вставляем главное фото (по центру)
    main_x = (canvas_w - main_w) // 2
    canvas.paste(main_img, (main_x, padding))

    # Вставляем референсы
    refs_start_x = (canvas_w - total_refs_w) // 2
    ref_y = main_h + padding * 2
    x = refs_start_x
    for ref_img in ref_images:
        canvas.paste(ref_img, (x, ref_y))
        x += ref_img.width + padding

    # Добавляем тонкую разделительную линию
    draw = ImageDraw.Draw(canvas)
    line_y = main_h + padding + padding // 2
    draw.line(
        [(padding * 2, line_y), (canvas_w - padding * 2, line_y)],
        fill=(50, 50, 50),
        width=1,
    )

    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def compose_from_post_data(post: dict) -> bytes | None:
    """
    Удобная обёртка: принимает dict из data.json
    """
    folder = post.get("local_folder") or post.get("folder")
    if not folder:
        return None
    return compose_post_image(
        post_folder=folder,
        main_filename=post.get("main_image_filename") or "result.webp",
    )
