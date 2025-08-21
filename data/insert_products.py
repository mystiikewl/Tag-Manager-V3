import sqlite3
import csv
import pandas as pd
from typing import List, Tuple

def insert_products():
    """Insert products into the database from the CSV file."""
    conn = sqlite3.connect('data/products.db')
    cursor = conn.cursor()

    try:
        # Start transaction
        cursor.execute('BEGIN TRANSACTION')

        # Read CSV file using pandas for better performance
        print("Reading CSV file...")
        df = pd.read_csv('data/input_file.csv')

        # Filter out rows with missing Handle or Title
        df_clean = df.dropna(subset=['Handle', 'Title'])

        # Remove duplicates based on Handle (product_id)
        df_clean = df_clean.drop_duplicates(subset=['Handle'])

        print(f"Processing {len(df_clean)} unique products...")

        # Prepare data for bulk insert
        product_data = []
        category_data = []

        for _, row in df_clean.iterrows():
            handle = str(row['Handle']).strip()
            title = str(row['Title']).strip()

            if handle and title:  # Only add if both values exist
                product_data.append((handle, title))

                # Add category mapping if Product Category exists
                product_category = row.get('Product Category')
                if pd.notna(product_category) and str(product_category).strip():
                    category_data.append((handle, str(product_category).strip()))

        print(f"Inserting {len(product_data)} products and {len(category_data)} category mappings...")

        # Bulk insert products using INSERT OR REPLACE to handle duplicates
        cursor.executemany('''
            INSERT OR REPLACE INTO product_categories (product_id, product_name, last_modified)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', product_data)

        # Bulk insert category mappings
        if category_data:
            cursor.executemany('''
                INSERT OR IGNORE INTO product_category_mapping (product_id, category_id)
                VALUES (?, ?)
            ''', category_data)

        # Commit transaction
        conn.commit()
        print(f"Successfully inserted {len(product_data)} products and {len(category_data)} category mappings!")

        # Verify the counts
        cursor.execute("SELECT COUNT(*) FROM product_categories")
        product_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM product_category_mapping")
        mapping_count = cursor.fetchone()[0]

        print(f"Database now contains {product_count} products and {mapping_count} category mappings.")

    except Exception as e:
        # Rollback on error
        conn.rollback()
        print(f"Error during product insertion: {str(e)}")
        raise

    finally:
        conn.close()

if __name__ == '__main__':
    insert_products()