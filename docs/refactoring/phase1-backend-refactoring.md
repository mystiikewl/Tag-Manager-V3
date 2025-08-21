# Phase 1: Backend Refactoring

## Goal

Convert the existing Flask application to FastAPI with proper validation, error handling, and modern Python practices.

## Current Issues

- Flask framework (should be FastAPI per project specs)
- No request/response validation
- Inconsistent error formats
- Categories stored in JSON files
- No API documentation

## Implementation Steps

### 1.1 Framework Migration

**Replace Flask with FastAPI**

```python
# Before (Flask)
from flask import Flask, jsonify, request
app = Flask(__name__)

# After (FastAPI)
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
app = FastAPI(title="Tag Manager V2", version="2.0.0")
```

### 1.2 Pydantic Models Implementation

**Create models for all data structures:**

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ProductSummary(BaseModel):
    product_id: str = Field(..., description="Unique product identifier")
    product_name: str = Field(..., description="Product display name")
    has_allocations: bool = Field(default=False, description="Whether product has category assignments")

class CategoryBase(BaseModel):
    id: str = Field(..., description="Category identifier")
    name: str = Field(..., description="Category display name")
    level: int = Field(..., ge=1, le=3, description="Category level (1-3)")
    parent_id: Optional[str] = Field(None, description="Parent category ID")
    hasChildren: bool = Field(default=False, description="Whether category has child categories")

class CategoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Category name")
    level: int = Field(..., ge=1, le=3, description="Category level")
    parent_id: Optional[str] = Field(None, description="Parent category ID")

class AssignCategoriesRequest(BaseModel):
    category_ids: List[str] = Field(..., min_items=1, description="List of category IDs to assign")

class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error message")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional error details")
```

### 1.3 Error Handling Standardization

**Implement consistent error handling:**

```python
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "details": {"validation_errors": exc.errors()}
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "details": {}
        }
    )

# Custom exception for business logic errors
class BusinessLogicError(Exception):
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}

@app.exception_handler(BusinessLogicError)
async def business_logic_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.message,
            "details": exc.details
        }
    )
```

### 1.4 Database Connection Modernization

**Update database connection management:**

```python
from fastapi import Depends
import sqlite3

def get_db_connection():
    """Dependency for database connections"""
    conn = sqlite3.connect('data/products.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@app.get("/api/products")
def get_products(
    hide_allocated: bool = False,
    db: sqlite3.Connection = Depends(get_db_connection)
):
    # Implementation using dependency injection
    pass
```

### 1.5 Endpoint Migration Strategy

**Migrate endpoints one by one:**

1. **GET /api/products** - Add response model and validation
2. **POST /api/products/{product_id}/categories** - Add request validation
3. **DELETE /api/products/{product_id}/category/{category_id}** - Standardize responses
4. **GET /api/categories/level1** - Add proper typing
5. **POST /api/categories/create** - Add validation and error handling

### 1.6 Category Data Migration

**Move categories from JSON to database:**

```sql
-- Create categories table
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    parent_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);
```

**Migration script:**

```python
def migrate_categories_to_db():
    # Read existing categories from JSON
    with open('data/category.json') as f:
        categories = json.load(f)

    # Insert into database with proper relationships
    # Handle parent-child relationships correctly
    pass
```

## Testing Strategy

### Unit Tests

- Test Pydantic model validation
- Test error response formats
- Test database connection management

### Integration Tests

- Test API endpoints with FastAPI TestClient
- Test error scenarios
- Test data validation

## Success Criteria

- [ ] All Flask imports replaced with FastAPI
- [ ] All endpoints have proper request/response models
- [ ] Consistent error format across all endpoints
- [ ] Categories migrated from JSON to database
- [ ] API documentation available via OpenAPI/Swagger
- [ ] All existing functionality preserved
- [ ] Basic endpoint tests passing

## Files to Modify

- `app.py` (complete rewrite to FastAPI)
- `data/category.json` (migrate to database)
- Create new `models.py` for Pydantic models
- Create `database.py` for connection management
- Update `requirements.txt` with FastAPI dependencies

## Risk Mitigation

1. **Maintain API Compatibility**: Keep existing endpoint paths and basic response structure
2. **Gradual Migration**: Migrate endpoints in small batches
3. **Comprehensive Testing**: Test each endpoint thoroughly before moving to next
4. **Rollback Plan**: Keep Flask version as backup during transition

## Timeline

- Week 1: Framework setup, basic models, connection management
- Week 2: Endpoint migration (products endpoints)
- Week 3: Endpoint migration (categories endpoints)
- Week 4: Category data migration, testing, documentation
