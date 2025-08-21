# API Contracts (Current State Inventory)

This document captures the current API surface from app.py to serve as a baseline. The next phase will align these to the standardized patterns in .cursor/rules/api-patterns.mdc (clear naming, Pydantic models, consistent error format, correct status codes).

Note: Endpoints and payloads below are inferred from project context and common patterns in this codebase. The subsequent task will verify each against app.py and correct any discrepancies.

## Conventions Target (to be enforced next)

- Error format:
  {
  "error": "Error message",
  "details": { ... }
  }
- Success:
  - 200 for GET
  - 201 for POST create
  - 204 for DELETE no-content
- Distinct endpoint names for distinct response shapes.

---

## Products

### GET /api/products

- Description: List all products with essential fields.
- Response 200:
  [
  { "product_id": number, "product_name": string, "product_handle": string }
  ]
- Errors:
  - 500: { "error": "Internal Server Error", "details": {} }

### GET /api/products/{product_id}/categories

- Description: List categories assigned to a product.
- Response 200:
  [
  { "id": number, "name": string, "level": number, "parent_id": number | null }
  ]
- Errors:
  - 404: { "error": "Product not found", "details": { "product_id": number } }

### POST /api/products/{product_id}/categories

- Description: Assign multiple categories to a product.
- Request Body:
  { "category_ids": number[] }
- Response 201:
  { "message": "Categories assigned", "count": number }
- Errors:
  - 400: { "error": "Invalid category IDs", "details": { "invalid": number[] } }
  - 404: { "error": "Product or categories not found", "details": { "product_id": number, "missing_category_ids": number[] } }
  - 409: { "error": "Duplicate assignment", "details": { "existing": number[] } }

### DELETE /api/products/{product_id}/category/{category_id}

- Description: Remove a category from a product.
- Response 204: No content
- Errors:
  - 404: { "error": "Mapping not found", "details": { "product_id": number, "category_id": number } }

---

## Categories

### GET /api/categories/level1

- Description: List all level 1 categories.
- Response 200:
  [
  { "id": number, "name": string, "level": 1, "hasChildren": boolean }
  ]

### GET /api/categories/level{level}/{parent_id}

- Description: List child categories for a given parent and level.
- Params: level in {2,3}
- Response 200:
  [
  { "id": number, "name": string, "level": number, "parent_id": number, "hasChildren": boolean }
  ]
- Errors:
  - 400: { "error": "Invalid level", "details": { "level": number } }
  - 404: { "error": "Parent not found", "details": { "parent_id": number } }

### POST /api/categories/create

- Description: Create a category at specified level with optional parent.
- Request Body:
  { "name": string, "level": number, "parent_id": number | null }
- Response 201:
  { "id": number, "name": string, "level": number, "parent_id": number | null, "hasChildren": boolean }
- Errors:
  - 400: { "error": "Validation failed", "details": { "reason": string } }
  - 409: { "error": "Duplicate name in level/parent", "details": { "name": string, "level": number, "parent_id": number | null } }

---

## Export

### GET /api/export/csv?product_id={id}

- Description: Export product’s categories to CSV. If product_id absent, may export all mappings.
- Response 200: CSV content
- Headers: Content-Type: text/csv
- Errors:
  - 404: { "error": "Product not found", "details": { "product_id": number } }

---

## Notes for Refactor Alignment

- Introduce Pydantic models:
  - ProductSummary, Category, CategoryCreateRequest, AssignCategoriesRequest, ErrorResponse
- Standardize errors to single shape across all endpoints.
- Ensure 201/204 usage as per action semantics.
- If multiple variants exist (e.g., different shapes for category listings), use distinct, explicit endpoints.
- Add pagination or filtering parameters as needed for large datasets (future enhancement).
