# MVP Specification — Category Assignment Dashboard (Option C)

Decision Defaults

- Bulk semantics: Allow partial success with per-item results (report succeeded, skipped, failed with reasons).
- Category delete policy: Only delete if unused (no children, no product mappings).

1. Goals and Scope

- Provide a lightweight dashboard to manage a 3-level category hierarchy and assign categories to products at scale.
- Support both single-product and multi-product assignment flows.
- Enable operators to create categories (L1/L2/L3), assign/remove categories, and export data.
- Ensure data persistence using SQLite; backend via FastAPI; frontend via vanilla JS modules with Tailwind and Vite.

Non-Goals

- No pricing, inventory, or customer-facing catalog.
- No external auth/OAuth.
- No advanced analytics beyond CSV export in MVP.

2. Users and Primary Scenarios
   Users

- Catalog operators who maintain product taxonomies at scale.

Core Scenarios

1. Single Product, Multi-Category Assign
   - Select a product, select multiple categories (L1/L2/L3), assign in one action.
2. Bulk Multi-Product Assign/Remove
   - Select multiple products, assign one or multiple categories to all selected products in a single bulk action.
   - Show per-item results (success/skip/failure with reason).
3. Category CRUD
   - Create L1/L2/L3 categories with validation.
   - Delete a category only if unused (no children and no product mappings).
   - Update category name.
4. Export
   - Export current product-category mappings to CSV (all or filtered by product).
5. Data Persistence
   - Store products, categories, and product-category mappings in SQLite.

3) Data Model
   Entities

- Product: { id: int, name: string, handle?: string }
- Category: { id: int, name: string, level: 1|2|3, parent_id?: int, hasChildren: boolean }
- ProductCategory: { product_id: int, category_id: int }

Constraints

- Category name unique within the same (level, parent_id).
- Level 2 must have a Level 1 parent; Level 3 must have Level 2 parent.
- ProductCategory mapping unique per (product_id, category_id).
- Deleting a category requires: no children and no ProductCategory rows referencing it.

4. API (FastAPI) — Endpoints
   Conventions

- 200 for GET; 201 for create; 204 for delete without body.
- Error JSON: { "error": string, "details": object }
- Pydantic models for requests/responses.

Products

- GET /api/products
  - 200: [{ product_id, product_name, product_handle }]
- GET /api/products/{product_id}/categories
  - 200: [{ id, name, level, parent_id }]
- POST /api/products/{product_id}/categories
  - Body: { category_ids: number[] }
  - 201: { message: "Categories assigned", count: number, assigned: number[] , skipped: number[] }
- DELETE /api/products/{product_id}/category/{category_id}
  - 204

Categories

- GET /api/categories/level1
  - 200: [{ id, name, level: 1, hasChildren }]
- GET /api/categories/level{level}/{parent_id}
  - 200: [{ id, name, level, parent_id, hasChildren }]
- POST /api/categories/create
  - Body: { name: string, level: 1|2|3, parent_id?: number }
  - 201: { id, name, level, parent_id, hasChildren }
- PATCH /api/categories/{id}
  - Body: { name: string }
  - 200: { id, name, level, parent_id, hasChildren }
- DELETE /api/categories/{id}
  - Only if unused; else 409
  - 204

Bulk Operations

- POST /api/bulk/products/categories/assign
  - Body: { product_ids: number[], category_ids: number[] }
  - 200:
    {
    "results": [
    { "product_id": number, "assigned": number[], "skipped": number[], "errors": [{category_id, reason}] }
    ],
    "summary": { "products_processed": number, "total_assigned": number, "total_skipped": number, "total_errors": number }
    }
- POST /api/bulk/products/categories/remove
  - Body: { product_ids: number[], category_ids: number[] }
  - 200: same shape as assign

Export

- GET /api/export/csv?product_id={id}
  - 200: text/csv

5. Frontend — Flows and UI
   Architecture

- Vanilla JS modules with a single stateManager (SSOT).
- ApiService (HTTP) + CategoryService (domain behaviors).
- EventManager for pub/sub between modules.
- Tailwind for UI, Vite for dev/build.

Key Screens/Components

- Product List Panel:
  - Search/filter; multi-select for bulk operations.
- Category Tree Panel:
  - Three-level display with color-coding (L1 blue, L2 red, L3 green); checkboxes for selection.
- Assignment Actions:
  - For single product: “Assign Selected Categories”, “Remove Selected Categories”
  - For bulk: “Bulk Assign to Selected Products”, “Bulk Remove from Selected Products”
  - Confirmation modal for bulk destructive actions (remove).
- Category Management:
  - “Create Category” modal:
    - Fields: name, level (1/2/3), parent (depending on level)
    - Validation feedback inline
  - Category rename option (inline or modal)
  - Delete category button (disabled if used or has children)
- Export:
  - Export button (all or filtered by product).

State Shape (illustrative)

- {
  products: Product[],
  categories: {
  level1: Category[],
  byParent: Map<parentId, Category[]>
  },
  selectedProductIds: Set<number>,
  selectedCategories: Set<number>,
  loading: { products: boolean, categories: boolean, assign: boolean, bulkAssign: boolean, export: boolean },
  notifications: [],
  ui: { activeModal: string | null }
  }

Events (examples)

- productsLoaded, categoriesLoaded
- productSelected, productSelectionChanged (multi-select)
- categorySelectionChanged
- assignCompleted, removeCompleted, bulkAssignCompleted, bulkRemoveCompleted
- categoryCreated, categoryUpdated, categoryDeleted
- errorOccurred

6. Validation Rules
   Frontend (fast feedback)

- Ensure category level/parent constraints before submitting.
- Prevent duplicate assignments in the UI state.

Backend (authoritative)

- Enforce unique (name, level, parent_id).
- Enforce parent level relationship.
- Enforce no children/no references on delete.
- Handle duplicates and missing refs in bulk with per-item results.

7. Non-Functional Requirements

- Performance: UI interactions <= 200ms typical; bulk ops may be longer but must stream progress or show clear loading.
- Reliability: No data loss; partial success reports for all bulk endpoints.
- Usability: Clear hierarchy visualization; safe destructive actions with confirmation.
- Security: Input validation and sanitization; avoid XSS/SQL injection.
- Maintainability: Clear service boundaries; no direct fetch outside ApiService; state-driven rendering.

8. Success Criteria

- Operators can:
  - Assign multiple categories to one product in a single action.
  - Assign/remove categories to/from multiple selected products with a single bulk action and see per-item results.
  - Create categories across all three levels with correct validation.
  - Delete categories only when unused.
  - Export CSV of current mappings.
- Backend responses adhere to standardized error format and status codes.
- Frontend uses SSOT state and event-driven updates with consistent modules.

9. Out-of-Scope (MVP)

- Authentication, authorization.
- Bulk import of categories/products via UI (limited to seed scripts).
- Versioning/audit logs.
- Soft-delete behavior for categories.
- Undo/rollback for bulk ops (beyond partial result reporting).

10. Implementation Notes

- Start with API contract hardening and implement bulk endpoints.
- Ensure CategoryService encapsulates both single and bulk flows.
- Update stateManager and modules for multi-select and bulk actions.
- Add minimal automated tests for:
  - Category creation validation
  - Single assign/remove
  - Bulk assign/remove with partial results
  - Export CSV shape
