"""
Database management module for Tag Manager V2
"""

import sqlite3
from contextlib import contextmanager
from typing import Generator, Optional
import os
from fastapi import Depends


DATABASE = 'data/products.db'


def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Dependency for database connections with proper cleanup"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key constraints
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def get_db_connection_context():
    """Context manager for database connections"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def ensure_table_schema():
    """Ensure the product_categories and product_category_mapping tables have the correct schema."""
    with get_db_connection_context() as conn:
        cursor = conn.cursor()

        # Check if product_categories table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='product_categories'")
        if cursor.fetchone() is None:
            cursor.execute('''
                CREATE TABLE product_categories (
                    product_id TEXT PRIMARY KEY,
                    product_name TEXT NOT NULL,
                    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
        else:
            # Add last_modified column if it doesn't exist
            cursor.execute("PRAGMA table_info(product_categories)")
            columns = [column[1] for column in cursor.fetchall()]
            if 'last_modified' not in columns:
                # Create a new table with the desired schema
                cursor.execute('''
                    CREATE TABLE product_categories_new (
                        product_id TEXT PRIMARY KEY,
                        product_name TEXT NOT NULL,
                        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')

                # Copy data from old table to new table
                cursor.execute('''
                    INSERT INTO product_categories_new (product_id, product_name, last_modified)
                    SELECT product_id, product_name, CURRENT_TIMESTAMP
                    FROM product_categories
                ''')

                # Drop old table and rename new table
                cursor.execute('DROP TABLE product_categories')
                cursor.execute('ALTER TABLE product_categories_new RENAME TO product_categories')

        # Check if product_category_mapping table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='product_category_mapping'")
        if cursor.fetchone() is None:
            cursor.execute('''
                CREATE TABLE product_category_mapping (
                    product_id TEXT,
                    category_id TEXT,
                    PRIMARY KEY (product_id, category_id),
                    FOREIGN KEY (product_id) REFERENCES product_categories(product_id)
                )
            ''')

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


def init_products():
    """Initialize the database with products from CSV file"""
    if not os.path.exists('data/input_file.csv'):
        return

    ensure_table_schema()  # Ensure schema is correct

    import pandas as pd

    df = pd.read_csv('data/input_file.csv')
    products = df[['Handle', 'Title']].values.tolist()

    with get_db_connection_context() as conn:
        cursor = conn.cursor()

        # Insert products if they don't exist
        for handle, title in products:
            cursor.execute(
                "INSERT OR IGNORE INTO product_categories (product_id, product_name) VALUES (?, ?)",
                (handle, title)
            )

        conn.commit()


# Initialize database on module import
ensure_table_schema()