"""
FastAPI application for Tag Manager V2 - Phase 1 Refactoring
"""

from fastapi import FastAPI, HTTPException, Depends, Request, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError
import sqlite3
import json
import os
import pandas as pd
from datetime import datetime
from typing import List, Optional
from contextlib import contextmanager

from models import (
    ProductSummary, CategoryBase, CategoryCreateRequest, CategoryUpdateRequest,
    AssignCategoriesRequest, BulkAssignCategoriesRequest, BulkRemoveCategoriesRequest,
    ErrorResponse, SuccessResponse, ProductStatistics, ProductCategorizationStatus,
    APIResponse, PaginationInfo
)
from database import get_db_connection, init_products

# Initialize FastAPI app
app = FastAPI(
    title="Tag Manager V2",
    version="2.0.0",
    description="Modernized product category management system with FastAPI",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Custom exception classes
class BusinessLogicError(Exception):
    """Custom exception for business logic errors"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="Validation Error",
            details={"validation_errors": exc.errors()}
        ).dict()
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            details={}
        ).dict()
    )

@app.exception_handler(BusinessLogicError)
async def business_logic_exception_handler(request: Request, exc: BusinessLogicError):
    """Handle business logic errors"""
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            error=exc.message,
            details=exc.details
        ).dict()
    )

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup"""
    init_products()

# Helper functions
def load_categories_from_json() -> List[dict]:
    """Load categories from JSON file for backward compatibility"""
    try:
        with open('data/category.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def format_category_from_json(cat: dict) -> CategoryBase:
    """Format category from JSON format to CategoryBase model"""
    return CategoryBase(
        id=cat['category_name'],
        name=cat['category_name'],
        level=1 if cat['category_level'] == 'Level 1 Category' else (
            2 if cat['category_level'] == 'Level 2 Category' else 3
        ),
        parent_id=cat.get('connected_to'),
        hasChildren=any(
            subcat['category_level'] in ['Level 2 Category', 'Level 3 Category'] and
            subcat['connected_to'] == cat['category_name']
            for subcat in load_categories_from_json()
        )
    )

# API Endpoints
@app.get("/api/products", response_model=APIResponse)
def get_products(
    hide_allocated: bool = Query(False, description="Hide products with category assignments"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of products to return"),
    offset: int = Query(0, ge=0, description="Number of products to skip"),
    db: sqlite3.Connection = Depends(get_db_connection)
):
    """
    Get all products with optional filtering and pagination
    """
    try:
        cursor = db.cursor()

        # Base query with category count
        base_query = '''
            SELECT pc.*,
                   (SELECT COUNT(*)
                    FROM product_category_mapping pcm
                    WHERE pcm.product_id = pc.product_id) AS category_count
            FROM product_categories pc
        '''

        # Add WHERE clause if hiding allocated products
        if hide_allocated:
            base_query += ' WHERE category_count = 0'

        # Get total count for pagination
        count_query = f"SELECT COUNT(*) as total FROM ({base_query})"
        cursor.execute(count_query)
        total_count = cursor.fetchone()['total']

        # Add pagination and ordering
        base_query += ' ORDER BY LOWER(pc.product_name) ASC LIMIT ? OFFSET ?'

        cursor.execute(base_query, (limit, offset))
        products = cursor.fetchall()

        # Convert to response model
        product_list = []
        for product in products:
            product_list.append(ProductSummary(
                product_id=product['product_id'],
                product_name=product['product_name'],
                has_allocations=product['category_count'] > 0,
                category_count=product['category_count'],
                last_modified=product['last_modified'] if product['last_modified'] else None
            ))

        # Create pagination info
        pagination = PaginationInfo(
            page=(offset // limit) + 1,
            page_size=limit,
            total_items=total_count,
            total_pages=(total_count + limit - 1) // limit,
            has_next=offset + limit < total_count,
            has_previous=offset > 0
        )

        return APIResponse(
            data=product_list,
            metadata={
                "total_products": total_count,
                "filtered_products": len(product_list),
                "hide_allocated": hide_allocated
            },
            pagination=pagination
        )

    except Exception as e:
        raise BusinessLogicError(f"Error retrieving products: {str(e)}")

@app.get("/api/products/{product_id}/categories", response_model=APIResponse)
def get_product_categories(product_id: str, db: sqlite3.Connection = Depends(get_db_connection)):
    """
    Get all categories for a specific product
    """
    try:
        cursor = db.cursor()

        # Verify product exists
        cursor.execute('SELECT product_name FROM product_categories WHERE product_id = ?', (product_id,))
        product = cursor.fetchone()
        if not product:
            raise BusinessLogicError(f"Product not found: {product_id}", {"product_id": product_id})

        # Get all categories for the product
        cursor.execute('''
            SELECT category_id
            FROM product_category_mapping
            WHERE product_id = ?
        ''', (product_id,))

        category_ids = [row[0] for row in cursor.fetchall()]

        # Get category details from JSON file
        all_categories = load_categories_from_json()

        # Format categories with their full details
        categories = []
        for category_id in category_ids:
            category = next((cat for cat in all_categories if cat['category_name'] == category_id), None)
            if category:
                categories.append(format_category_from_json(category))

        return APIResponse(
            data=categories,
            metadata={
                "product_id": product_id,
                "product_name": product['product_name'],
                "total_categories": len(categories),
                "category_ids": category_ids
            }
        )

    except Exception as e:
        raise BusinessLogicError(f"Error retrieving product categories: {str(e)}")

@app.post("/api/products/{product_id}/categories", response_model=SuccessResponse)
def assign_categories(
    product_id: str,
    request: AssignCategoriesRequest,
    db: sqlite3.Connection = Depends(get_db_connection)
):
    """
    Assign categories to a product
    """
    try:
        cursor = db.cursor()

        # Get current categories
        cursor.execute('''
            SELECT category_id
            FROM product_category_mapping
            WHERE product_id = ?
        ''', (product_id,))
        current_categories = {row[0] for row in cursor.fetchall()}

        # Get parent categories for all selected categories
        all_categories = load_categories_from_json()
        parent_categories = set()
        for category_id in request.category_ids:
            # Find the category and its parents
            current_category = next((cat for cat in all_categories if cat['category_name'] == category_id), None)
            while current_category and current_category.get('connected_to'):
                parent_name = current_category['connected_to']
                parent_categories.add(parent_name)
                current_category = next((cat for cat in all_categories if cat['category_name'] == parent_name), None)

        # Combine all categories to add (including parents)
        categories_to_add = set(request.category_ids) | parent_categories

        # Update last_modified timestamp
        cursor.execute('''
            UPDATE product_categories
            SET last_modified = CURRENT_TIMESTAMP
            WHERE product_id = ?
        ''', (product_id,))

        # Add all missing categories
        added_categories = []
        for category_id in categories_to_add:
            if category_id not in current_categories:
                try:
                    cursor.execute(
                        'INSERT INTO product_category_mapping (product_id, category_id) VALUES (?, ?)',
                        (product_id, category_id)
                    )
                    added_categories.append(category_id)
                except sqlite3.IntegrityError:
                    continue

        db.commit()

        return SuccessResponse(
            message='Categories assigned successfully',
            details={
                'added_categories': added_categories,
                'parent_categories_added': len(parent_categories - set(request.category_ids)),
                'total_categories': len(categories_to_add)
            }
        )

    except Exception as e:
        db.rollback()
        raise BusinessLogicError(f"Error assigning categories: {str(e)}")

@app.delete("/api/products/{product_id}/category/{category_id}", response_model=SuccessResponse)
def remove_category(
    product_id: str,
    category_id: str,
    db: sqlite3.Connection = Depends(get_db_connection)
):
    """
    Remove a category from a product
    """
    try:
        cursor = db.cursor()

        # Update last_modified timestamp
        cursor.execute('''
            UPDATE product_categories
            SET last_modified = CURRENT_TIMESTAMP
            WHERE product_id = ?
        ''', (product_id,))

        # Remove category mapping
        cursor.execute('''
            DELETE FROM product_category_mapping
            WHERE product_id = ? AND category_id = ?
        ''', (product_id, category_id))

        db.commit()
        return SuccessResponse(message='Category removed successfully')

    except Exception as e:
        db.rollback()
        raise BusinessLogicError(f"Error removing category: {str(e)}")

@app.get("/api/categories/level1", response_model=APIResponse)
def get_level1_categories():
    """
    Get all level 1 categories
    """
    try:
        all_categories = load_categories_from_json()

        # Get all level 1 categories
        level1_categories = [
            format_category_from_json(cat)
            for cat in all_categories
            if cat['category_level'] == 'Level 1 Category'
        ]

        return APIResponse(
            data=level1_categories,
            metadata={
                "total_categories": len(level1_categories),
                "level": 1,
                "type": "top_level_categories"
            }
        )

    except Exception as e:
        raise BusinessLogicError(f"Error retrieving level 1 categories: {str(e)}")

@app.get("/api/categories/level{level}/{parent}", response_model=APIResponse)
def get_child_categories(level: int, parent: str):
    """
    Get child categories for a specific level and parent
    """
    try:
        if level not in [2, 3]:
            raise BusinessLogicError("Level must be 2 or 3", {"requested_level": level})

        all_categories = load_categories_from_json()

        level_name = f"Level {level} Category"
        child_categories = [
            format_category_from_json(cat)
            for cat in all_categories
            if cat['category_level'] == level_name and cat['connected_to'] == parent
        ]

        return APIResponse(
            data=child_categories,
            metadata={
                "total_categories": len(child_categories),
                "level": level,
                "parent_category": parent,
                "type": "child_categories"
            }
        )

    except Exception as e:
        raise BusinessLogicError(f"Error retrieving child categories: {str(e)}")

@app.get("/api/categories", response_model=APIResponse)
def get_all_categories():
    """
    Get all categories with hierarchy display
    """
    try:
        all_categories = load_categories_from_json()

        # Format categories for dropdown - show hierarchy
        formatted_categories = []
        level1_count = 0
        level2_count = 0
        level3_count = 0

        for cat in all_categories:
            if cat['category_level'] == 'Level 1 Category':
                level1_count += 1
                formatted_categories.append(CategoryBase(
                    id=cat['category_name'],
                    name=cat['category_name'],
                    level=1,
                    hasChildren=any(
                        subcat['category_level'] == 'Level 2 Category' and
                        subcat['connected_to'] == cat['category_name']
                        for subcat in all_categories
                    )
                ))
            elif cat['connected_to']:
                if cat['category_level'] == 'Level 2 Category':
                    level2_count += 1
                else:
                    level3_count += 1
                formatted_categories.append(CategoryBase(
                    id=cat['category_name'],
                    name=f"{cat['connected_to']} > {cat['category_name']}",
                    level=2 if cat['category_level'] == 'Level 2 Category' else 3,
                    parent_id=cat['connected_to']
                ))

        return APIResponse(
            data=formatted_categories,
            metadata={
                "total_categories": len(formatted_categories),
                "level1_count": level1_count,
                "level2_count": level2_count,
                "level3_count": level3_count,
                "type": "all_categories_hierarchical"
            }
        )

    except Exception as e:
        raise BusinessLogicError(f"Error retrieving categories: {str(e)}")

# Root endpoint for testing
@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Tag Manager V2 API", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)