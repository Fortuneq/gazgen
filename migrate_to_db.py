"""
Migration script to transfer data from higgsfield_data_v3 folders to PostgreSQL database
Uses pgvector for vector embeddings and stores images as binary data
"""
import json
import os
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from sentence_transformers import SentenceTransformer
import mimetypes
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'gasgen'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', ''),
}

# Data source
DATA_DIR = Path("higgsfield_data_v3")
INDEX_FILE = DATA_DIR / "index.json"

# Model for embeddings
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


def get_image_info(image_path: Path) -> dict:
    """Extract image metadata"""
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            file_size = image_path.stat().st_size
            content_type = mimetypes.guess_type(str(image_path))[0] or 'image/jpeg'
            return {
                'width': width,
                'height': height,
                'file_size': file_size,
                'content_type': content_type
            }
    except Exception as e:
        print(f"  Warning: Could not read image info from {image_path}: {e}")
        return {
            'width': None,
            'height': None,
            'file_size': image_path.stat().st_size,
            'content_type': mimetypes.guess_type(str(image_path))[0] or 'image/jpeg'
        }


def migrate_data():
    """Main migration function"""
    print("=== GasGen Data Migration to PostgreSQL ===\n")

    # Initialize embedding model
    print("Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    print(f"✓ Loaded {EMBEDDING_MODEL_NAME}\n")

    # Load index
    if not INDEX_FILE.exists():
        print(f"Error: Index file not found at {INDEX_FILE}")
        return

    print(f"Loading index from {INDEX_FILE}...")
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        posts_data = json.load(f)
    print(f"✓ Loaded {len(posts_data)} posts\n")

    # Connect to database
    print("Connecting to PostgreSQL...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print(f"✓ Connected to {DB_CONFIG['database']} at {DB_CONFIG['host']}\n")
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print("\nMake sure PostgreSQL is running and database is created.")
        print(f"You can create it with: createdb {DB_CONFIG['database']}")
        return

    try:
        # Apply schema
        print("Applying database schema...")
        with open('db_schema.sql', 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        cursor.execute(schema_sql)
        conn.commit()
        print("✓ Schema applied\n")

        # Clear existing data
        print("Clearing existing data...")
        cursor.execute("TRUNCATE posts, images, categories CASCADE;")
        conn.commit()
        print("✓ Data cleared\n")

        # Migrate posts
        print("Migrating posts...")
        migrated_posts = 0
        migrated_images = 0
        skipped_posts = 0

        for idx, post_data in enumerate(posts_data):
            post_id = post_data.get('id')
            publication_id = post_data.get('publication_id')
            prompt = post_data.get('prompt', '')
            model_name = post_data.get('model_name')
            folder = Path(post_data.get('folder', ''))

            # Validate required fields
            if not publication_id or not prompt or len(prompt) < 10:
                skipped_posts += 1
                print(f"  ⚠ Skipping post {post_id}: missing required data")
                continue

            # Generate embedding
            try:
                embedding = model.encode([prompt], normalize_embeddings=True)[0]
                embedding_list = embedding.tolist()
            except Exception as e:
                print(f"  ⚠ Error generating embedding for post {post_id}: {e}")
                skipped_posts += 1
                continue

            # Insert post
            try:
                cursor.execute("""
                    INSERT INTO posts (publication_id, prompt, model_name, prompt_embedding, metadata)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    publication_id,
                    prompt,
                    model_name,
                    embedding_list,
                    json.dumps({
                        'original_id': post_id,
                        'main_image_url': post_data.get('main_image_url'),
                    })
                ))
                db_post_id = cursor.fetchone()[0]
                migrated_posts += 1

                # Process main result image
                main_image_filename = post_data.get('main_image_filename')
                if main_image_filename:
                    main_image_path = folder / main_image_filename
                    if main_image_path.exists():
                        try:
                            with open(main_image_path, 'rb') as img_file:
                                image_data = img_file.read()

                            img_info = get_image_info(main_image_path)

                            cursor.execute("""
                                INSERT INTO images (
                                    post_id, image_type, image_data, filename,
                                    content_type, file_size, width, height, original_url
                                )
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                db_post_id,
                                'result',
                                psycopg2.Binary(image_data),
                                main_image_filename,
                                img_info['content_type'],
                                img_info['file_size'],
                                img_info['width'],
                                img_info['height'],
                                post_data.get('main_image_url')
                            ))
                            migrated_images += 1
                        except Exception as e:
                            print(f"  ⚠ Error storing result image for post {post_id}: {e}")

                # Process reference images
                reference_images = post_data.get('reference_images', [])
                for ref_idx, ref_img in enumerate(reference_images):
                    ref_filename = ref_img.get('filename')
                    if not ref_filename:
                        continue

                    ref_path = folder / ref_filename
                    if not ref_path.exists():
                        print(f"  ⚠ Reference image not found: {ref_path}")
                        continue

                    try:
                        with open(ref_path, 'rb') as img_file:
                            image_data = img_file.read()

                        img_info = get_image_info(ref_path)

                        cursor.execute("""
                            INSERT INTO images (
                                post_id, image_type, image_data, filename,
                                content_type, file_size, width, height,
                                reference_order, original_url
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            db_post_id,
                            'reference',
                            psycopg2.Binary(image_data),
                            ref_filename,
                            img_info['content_type'],
                            img_info['file_size'],
                            img_info['width'],
                            img_info['height'],
                            ref_idx,
                            ref_img.get('url')
                        ))
                        migrated_images += 1
                    except Exception as e:
                        print(f"  ⚠ Error storing reference image {ref_filename}: {e}")

                # Progress indicator
                if (idx + 1) % 50 == 0:
                    conn.commit()
                    print(f"  Progress: {idx + 1}/{len(posts_data)} posts processed")

            except Exception as e:
                print(f"  ⚠ Error inserting post {post_id}: {e}")
                skipped_posts += 1
                continue

        # Final commit
        conn.commit()

        # Get statistics
        cursor.execute("SELECT COUNT(*) FROM posts")
        total_posts = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM images WHERE image_type = 'result'")
        total_results = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM images WHERE image_type = 'reference'")
        total_references = cursor.fetchone()[0]

        cursor.execute("SELECT name, post_count FROM categories ORDER BY post_count DESC")
        categories = cursor.fetchall()

        # Calculate database size
        cursor.execute("""
            SELECT pg_size_pretty(pg_database_size(current_database()))
        """)
        db_size = cursor.fetchone()[0]

        print("\n" + "=" * 60)
        print("✓ MIGRATION COMPLETED!")
        print("=" * 60)
        print(f"\nPosts migrated: {migrated_posts}")
        print(f"Posts skipped: {skipped_posts}")
        print(f"Total images: {migrated_images}")
        print(f"  - Result images: {total_results}")
        print(f"  - Reference images: {total_references}")
        print(f"\nDatabase size: {db_size}")
        print(f"\nCategories/Models ({len(categories)}):")
        for cat_name, count in categories[:10]:
            print(f"  {cat_name}: {count} posts")
        if len(categories) > 10:
            print(f"  ... and {len(categories) - 10} more")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
        print("\n✓ Database connection closed")


if __name__ == "__main__":
    migrate_data()
