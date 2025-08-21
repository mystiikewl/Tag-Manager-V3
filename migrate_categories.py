"""
Migration script to move categories from JSON file to database
"""

import json
import sqlite3
from contextlib import contextmanager

DATABASE = 'data/products.db'

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

def ensure_categories_table():
    """Ensure categories table exists"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check if categories table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
        if cursor.fetchone() is None:
            cursor.execute('''
                CREATE TABLE categories (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    level INTEGER NOT NULL,
                    parent_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES categories(id)
                )
            ''')
            conn.commit()
            print("✓ Categories table created")
        else:
            print("✓ Categories table already exists")

def load_categories_from_json():
    """Load categories from JSON file"""
    try:
        with open('data/category.json', 'r') as f:
            categories = json.load(f)
        print(f"✓ Loaded {len(categories)} categories from JSON file")
        return categories
    except FileNotFoundError:
        print("✗ Category JSON file not found")
        return []
    except json.JSONDecodeError:
        print("✗ Error parsing category JSON file")
        return []

def map_category_level(level_str):
    """Map category level string to integer"""
    level_mapping = {
        'Level 1 Category': 1,
        'Level 2 Category': 2,
        'Level 3 Category': 3
    }
    return level_mapping.get(level_str, 1)

def migrate_categories():
    """Migrate categories from JSON to database"""
    ensure_categories_table()
    categories = load_categories_from_json()

    if not categories:
        return

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # First pass: insert all categories without parent relationships
        for cat in categories:
            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO categories (id, name, level, parent_id)
                    VALUES (?, ?, ?, ?)
                ''', (
                    cat['category_name'],
                    cat['category_name'],
                    map_category_level(cat['category_level']),
                    cat.get('connected_to')
                ))
            except Exception as e:
                print(f"✗ Error inserting category {cat['category_name']}: {e}")

        conn.commit()
        print(f"✓ Migrated {len(categories)} categories to database")

def verify_migration():
    """Verify the migration was successful"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Count categories in database
        cursor.execute("SELECT COUNT(*) as count FROM categories")
        db_count = cursor.fetchone()['count']

        # Count categories in JSON
        json_categories = load_categories_from_json()
        json_count = len(json_categories)

        print(f"Database categories: {db_count}")
        print(f"JSON categories: {json_count}")

        if db_count == json_count:
            print("✓ Migration successful - counts match")
        else:
            print("✗ Migration issue - counts don't match")

        # Show sample categories
        cursor.execute("SELECT * FROM categories LIMIT 5")
        sample = cursor.fetchall()
        print("Sample migrated categories:")
        for cat in sample:
            print(f"  - {cat['name']} (Level {cat['level']})")

def main():
    """Main migration function"""
    print("Starting category migration...")
    print("=" * 50)

    try:
        migrate_categories()
        print()
        verify_migration()
        print()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())