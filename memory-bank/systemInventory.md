# System Inventory

This inventory catalogs key modules, their responsibilities, and primary dependencies to support refactoring boundaries and detect coupling.

## Backend

### app.py

- Role: FastAPI application entrypoint and route definitions for products, categories, export.
- Dependencies: FastAPI, SQLite DB connections (data/products.db and related utilities), Jinja2 templates (templates/).
- Notes: Extract endpoint list and current response shapes for apiContracts.md.

### Utilities and Data Scripts

- data/initialize_products_db.py, data/clear_products_db.py, data/insert_products.py
- utility/migrate_db.py, utility/migrate_categories_table.py, utility/rebuild_products_db.py, utility/sync_categories.py
- Role: DB setup, migration, sync, and maintenance scripts.
- Dependencies: sqlite3; should remain CLI-only and non-interactive for automation.

## Frontend

### Core (Bootstrapping & State)

- static/js/core/init.js
  - Role: Application bootstrap; initializes modules and state.
  - Depends on: ModuleLoader, stateManager, EventManager.
- static/js/core/init-MSI.js
  - Role: Alternative bootstrap (MSI variant).
  - Note: Candidate for deprecation or merge.
- static/js/core/stateManager.js
  - Role: Single source of truth for UI/application state; exposes getters/setters/subscribe.
  - Depends on: EventManager (indirectly), no direct DOM manipulation.
- static/js/core/ModuleLoader.js
  - Role: Dynamically loads/initializes modules; manages lifecycle.
  - Depends on: module registry and init contracts.

### Services (HTTP & Domain)

- static/js/services/ApiService.js
  - Role: Raw HTTP client wrapper; centralized fetch with error normalization.
- static/js/services/CategoryService.js
  - Role: Category domain behaviors (fetch hierarchies, assign/remove, create). Wraps ApiService.
  - Depends on: ApiService.

### Managers (Orchestration)

- static/js/managers/CategoryManager.js
  - Role: Orchestrates category operations (selection, assign/remove) coordinating services and state.
  - Depends on: CategoryService, stateManager, EventManager.
- static/js/managers/ExportManager.js
  - Role: Orchestrates CSV export operations.
  - Depends on: ApiService/CategoryService (as applicable), stateManager, EventManager.

### Modules (UI Logic)

- static/js/modules/categoryTree.js
  - Role: Builds/updates category tree UI based on state; handles selection events.
  - Depends on: stateManager, EventManager, DOM utilities.
- static/js/modules/dataLoader.js
  - Role: Initial and incremental data fetching; dispatches to state.
  - Depends on: CategoryService/ApiService, stateManager, EventManager.
- static/js/modules/productFilter.js
  - Role: Product filtering UI and state updates.
  - Depends on: stateManager, EventManager.
- static/js/modules/CategoryModalModule.js
  - Role: Wire modal components to state/events for create/delete flows.
  - Depends on: modals/\*, stateManager, CategoryService, EventManager.

### Components (UI)

- static/js/components/Button.vue, Card.vue, CategoryChip.vue, Input.vue
  - Role: Presentational components; may be used or legacy. Confirm current integration.
- static/js/components/modals/ModalBase.js
  - Role: Base modal behavior.
- static/js/components/modals/CategoryCreationModal.js, CategoryCreationModal-MSI.js
  - Role: Category creation modal behavior.
  - Note: MSI variant parallel; candidate for consolidation.
- static/js/components/modals/CategoryDeletionModal.js, CategoryDeletionModal-MSI.js
  - Role: Category deletion confirmation modal behavior.
  - Note: MSI variant parallel; candidate for consolidation.

### Events

- static/js/events/eventManager.js
  - Role: Pub/Sub event bus.
  - Event candidates: productSelected, productsLoaded, categoriesLoaded, categoryAssigned, categoryRemoved, categoryCreated, categoryDeleted, exportRequested, exportCompleted, errorOccurred.

### Utils

- static/js/utils/dom.js
  - Role: DOM helpers.
- static/js/utils/ui.js, UIHelpers.js
  - Role: UI helpers; check for duplication/overlap; candidate for merge.
- static/js/utils/ValidationUtils.js
  - Role: Client-side validation; ensure alignment with backend rules.
- static/js/utils/formatters.js
  - Role: Formatting helpers.
- static/js/utils/statisticsManager.js
  - Role: Metrics/analytics helpers (confirm usage).
- static/js/utils/index (none)
  - Note: Consider an index to re-export canonical utils.

### Test/Manual Pages

- test\_\*.html under project root (e.g., test-category-manager.html, test-modal-infrastructure.html, etc.)
  - Role: Manual verification pages; migrate critical scenarios to automated tests.

### Templates

- templates/base.html, index.html, bulk_assign.html, bulk_assign_improved.html, bulk_base.html, index_archive.html
- templates/components/\*.html (sidebar, product_header, category_management, success_message, modals)
  - Role: Server-rendered base and partials; frontend modules attach behavior.

## Divergent/Parallel Variants

- Core/MSI: init.js vs init-MSI.js
- Modals/MSI: CategoryCreationModal.js vs CategoryCreationModal-MSI.js; CategoryDeletionModal.js vs CategoryDeletionModal-MSI.js
- Action: Decide single canonical set; deprecate the other with migration notes.

## Immediate Observations (Refactor Targets)

- Ensure all network calls route through ApiService/CategoryService (search for direct fetch in modules).
- Normalize UI updates to read from stateManager after events; minimize direct DOM writes in unrelated layers.
- Consolidate utils (ui.js vs UIHelpers.js).
- Define an event contract doc and enforce usage across modules.
- Establish JSDoc types for state and event payloads to improve reliability.
