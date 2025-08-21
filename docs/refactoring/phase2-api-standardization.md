# Phase 2: API Standardization

## Goal

Implement consistent API patterns, error formats, and response schemas across all endpoints to align with project standards.

## Current Issues

- Inconsistent error response formats
- Missing API documentation
- No request validation
- Inconsistent HTTP status code usage
- No clear API contracts

## Implementation Steps

### 2.1 API Pattern Alignment

**Enforce patterns from .cursor/rules/api-patterns.mdc:**

```python
# Standard response patterns
@app.get("/api/products", response_model=List[ProductSummary])
def get_products(hide_allocated: bool = False, db=Depends(get_db_connection)):
    """List all products with optional hide_allocated filter."""
    # Implementation
    pass

@app.post("/api/products/{product_id}/categories",
          response_model=AssignCategoriesResponse,
          status_code=201)
def assign_categories(product_id: str, request: AssignCategoriesRequest, db=Depends(get_db_connection)):
    """Assign multiple categories to a product."""
    # Implementation
    pass

@app.delete("/api/products/{product_id}/category/{category_id}",
            status_code=204)
def remove_category(product_id: str, category_id: str, db=Depends(get_db_connection)):
    """Remove a category from a product."""
    # Implementation
    pass
```

### 2.2 Error Response Standardization

**Implement consistent error format:**

```python
# Error response models
class ErrorResponse(BaseModel):
    error: str
    details: Dict[str, Any] = {}

class ValidationErrorResponse(BaseModel):
    error: str
    details: Dict[str, List[str]] = {}

# Custom exception handlers
@app.exception_handler(BusinessLogicError)
async def business_logic_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(sqlite3.IntegrityError)
async def integrity_error_handler(request, exc):
    return JSONResponse(
        status_code=409,
        content={
            "error": "Data integrity violation",
            "details": {"reason": str(exc)}
        }
    )
```

### 2.3 Request Validation Enhancement

**Add comprehensive validation:**

```python
class AssignCategoriesRequest(BaseModel):
    category_ids: List[str] = Field(..., min_items=1, max_items=10)

    @validator('category_ids')
    def validate_category_ids(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate category IDs not allowed')
        return v

class CreateCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    level: int = Field(..., ge=1, le=3)
    parent_id: Optional[str] = None

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Category name cannot be empty')
        return v.strip()

    @validator('parent_id')
    def validate_parent_id(cls, v, values):
        if values.get('level') and values['level'] > 1 and not v:
            raise ValueError('Parent ID required for levels 2 and 3')
        return v
```

### 2.4 API Documentation Enhancement

**Add OpenAPI documentation:**

```python
app = FastAPI(
    title="Tag Manager V2 API",
    description="API for managing product category hierarchies",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add endpoint documentation
@app.get("/api/products")
def get_products(
    hide_allocated: bool = Query(False, description="Hide products with category assignments")
):
    """
    Retrieve all products.

    - **hide_allocated**: If true, only return products without category assignments
    - Returns product summary information including allocation status
    """
    pass
```

### 2.5 Response Schema Consistency

**Standardize all response formats:**

```python
# Success response models
class AssignCategoriesResponse(BaseModel):
    message: str = "Categories assigned successfully"
    added_categories: List[str]
    parent_categories_added: int
    total_categories: int

class CreateCategoryResponse(CategoryBase):
    created_at: datetime
    updated_at: datetime

# Ensure all endpoints return consistent formats
@app.post("/api/categories/create", response_model=CreateCategoryResponse)
def create_category(request: CreateCategoryRequest):
    # Implementation returns properly structured response
    pass
```

## Testing Strategy

### Contract Tests

- Validate all endpoints return documented response schemas
- Test error conditions return proper error format
- Verify HTTP status codes match specifications

### Integration Tests

- Test full API workflows
- Validate error handling scenarios
- Test input validation edge cases

## Success Criteria

- [ ] All endpoints have proper request/response models
- [ ] Consistent error format across all endpoints
- [ ] Complete OpenAPI documentation
- [ ] Input validation for all endpoints
- [ ] Proper HTTP status code usage
- [ ] API contract documentation updated

## Files to Create/Modify

- Update `models.py` with response models
- Create `schemas.py` for API schemas
- Update all endpoint functions in `app.py`
- Create API contract documentation
- Update `apiContracts.md` in memory-bank

## Risk Mitigation

1. **API Compatibility**: Maintain existing endpoint paths and basic functionality
2. **Gradual Rollout**: Update endpoints in batches
3. **Documentation First**: Document new contracts before implementation
4. **Versioning**: Consider API versioning for breaking changes

## Timeline

- Week 1: Response models and error handling
- Week 2: Request validation and OpenAPI docs
- Week 3: Schema consistency and documentation
- Week 4: Testing and contract finalization
