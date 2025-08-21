# Tech Context

## Stack

- Backend: Python FastAPI (app.py), SQLite databases (data/products.db, data/products-MSI.db).
- Frontend: Vanilla JavaScript modules under static/js, TailwindCSS, Vite build pipeline.
- Templates: Jinja2 templates in templates/ with component partials in templates/components/.
- Styling: Tailwind configured via tailwind.config.js and postcss.config.js; CSS in static/input.css -> static/output.css.

## Project Structure Highlights

- static/js/core: init.js, stateManager.js, ModuleLoader.js (core bootstrapping and state).
- static/js/services: ApiService.js (HTTP), CategoryService.js (domain service).
- static/js/managers: CategoryManager.js, ExportManager.js (orchestration).
- static/js/modules: categoryTree.js, dataLoader.js, productFilter.js, CategoryModalModule.js (UI logic modules).
- static/js/components: UI components (Button.vue, Card.vue, CategoryChip.vue, Input.vue) and modals/ (JS modal modules).
- static/js/events: eventManager.js (pub/sub).
- static/js/utils: dom.js, ui.js, UIHelpers.js, ValidationUtils.js, formatters.js, statisticsManager.js.
- Backend utilities: utility/_.py for DB migrations/sync and data/_.py scripts for initializing/inserting products.

## Commands & Tooling (Expected)

- Backend run: python app.py (or uvicorn if configured in future).
- Frontend dev/build:
  - Dev: npx vite (or npm run dev if defined).
  - Build: npx vite build (or npm run build).
- Tailwind: integrated via Vite build pipeline.
- Data utilities:
  - python data/initialize_products_db.py
  - python data/clear_products_db.py
  - python utility/migrate_db.py
  - python utility/migrate_categories_table.py
  - python utility/rebuild_products_db.py
  - python utility/sync_categories.py

## Dependencies

- Node toolchain for Vite/Tailwind (package.json, package-lock.json).
- Python dependencies for FastAPI and database access (not listed here; ensure they are installed in your environment).

## Environment Constraints

- OS: Windows 10, cmd shell.
- Working directory is project root; tools should not cd elsewhere.
- SQLite files located under data/.

## Conventions to Enforce

- API error format and status codes per .cursor/rules/api-patterns.mdc.
- Single source of truth state in frontend via core/stateManager.
- Services (HTTP) must be side-effect free and domain-agnostic; domain services encapsulate business logic.
- UI changes triggered through event bus and state reads; avoid ad hoc DOM mutations in disparate modules.
- Consistent naming and module boundaries; route all fetch calls through ApiService/CategoryService.

## Testing Approach (Target)

- Backend: FastAPI tests with SQLite fixture DBs.
- Frontend: Unit tests for services/utils; DOM integration tests for key workflows.
- Manual test HTML pages under project exist; migrate critical flows to automated tests.
