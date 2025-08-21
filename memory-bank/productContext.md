# Product Context

## Why This Project Exists

Internal operators need a reliable tool to manage a three-level product category hierarchy and assign categories to products for downstream catalog, merchandising, and reporting workflows. Prior solutions had inconsistent state handling, unclear API contracts, and scattered UI logic which impacted speed, correctness, and maintenance.

## Problems It Solves

- Create and manage categories with strict parent/child constraints (3 levels).
- Assign/remove categories to/from products without duplication or invalid combinations.
- Visualize category hierarchy clearly with fast filtering and safe destructive actions.
- Export current product-category mappings to CSV for external systems.

## How It Should Work (High-Level)

- Backend exposes predictable endpoints for products, categories, and export with consistent response and error formats.
- Frontend loads initial datasets, maintains a single source of truth state, and updates UI via event-driven flows.
- Category creation and assignment enforce validation rules (unique within level/parent, valid parent level).
- Users can filter products, select categories via checkboxes/chips, and see immediate feedback.
- CSV export reflects current, persisted product-category mappings.

## User Experience Goals

- Fast and responsive interactions (minimal blocking, clear loading states).
- Clear, color-coded hierarchy visualization (L1 blue, L2 red, L3 green).
- Undo-safe destructive actions with confirmation modals.
- Consistent componentized UI with predictable behavior and minimal surprises.

## Primary Users

- Catalog managers/internal operators updating product taxonomies.
- Technical maintainers needing stable API contracts and modular code.

## Key Scenarios

1. Create a new Level 2 category under a Level 1 parent.
2. Assign multiple categories (across levels) to a selected product safely with validation.
3. Remove an incorrect category from a product with confirmation.
4. Export current product-category mappings to CSV for downstream import.

## Value Metrics

- Reduced time-to-complete for assignment workflows.
- Fewer category validation errors observed in logs.
- Lower code churn related to state/DOM bugs after refactor.
- Predictable CSV output quality and completeness.
