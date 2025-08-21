# System Patterns

## Architecture Overview

- Backend: FastAPI (Python) with SQLite database.
- Frontend: Vanilla JS modules, TailwindCSS for styling, Vite for bundling/dev.
- Templates: Jinja2 HTML templates under templates/ with component partials.
- Static assets: static/js/\* modular structure; static/css via Tailwind pipeline.

## Layered Responsibilities

- Services (HTTP): ApiService handles HTTP requests; no domain logic.
- Domain Services: CategoryService encapsulates category-specific behaviors and validation adapters.
- Managers/Modules: Orchestrate workflows, call services, and update state (e.g., CategoryManager, ExportManager, modules/categoryTree, productFilter, dataLoader).
- State: Single source of truth via core/stateManager with event-driven updates.
- UI Components: components/_ and modals/_ render UI based on state and dispatch intent via events/handlers.

## Event-Driven UI

- Central EventManager publishes domain events (e.g., productSelected, categoriesLoaded, categoryAssigned, categoryRemoved, exportCompleted, errorOccurred).
- Modules subscribe to named events and update DOM by reading state, not mutating global variables directly.

## API Contracts (To Standardize)

- Follow .cursor/rules/api-patterns.mdc:
  - Distinct endpoint names for distinct response shapes.
  - Consistent error format:
    {
    "error": "Error message",
    "details": { ... }
    }
  - Pydantic models for request/response, proper status codes.

## Data and Validation Patterns

- Category hierarchy: 3 levels with parent-child constraints.
- Validation on create/assign/remove:
  - Name uniqueness within level/parent.
  - Parent existence and compatible level for levels 2/3.
  - No duplicate product-category assignments.
- Use ValidationUtils in frontend for synchronous checks; delegate authoritative validation to backend.

## State Management

- State shape (illustrative):
  - products: Map/product list with current selection
  - categories: hierarchical structure with hasChildren flags
  - selectedProductId: number | null
  - selectedCategories: Set<number> for current product UI selection
  - loadingFlags: { products: boolean, categories: boolean, assign: boolean, export: boolean, ... }
  - ui: { activeModal: string | null, notifications: [] }
- All async flows: services -> stateManager update -> event emit -> render modules.

## UI Rendering

- Components are pure functions where possible: (state, props) -> DOM updates.
- Modals (CategoryCreationModal, CategoryDeletionModal) show confirm flows; actions dispatched through managers/services.
- Category chips color code by level: L1 blue, L2 red, L3 green.

## Error Handling

- Centralized error handler mapping API errors to user-friendly notifications.
- All network errors route through ApiService catch to a standardized shape for UI consumption.
- Defensive programming: handle empty states, missing parents, and retry-friendly paths.

## Testing Approach

- Backend: FastAPI tests for endpoints and validation with fixtures for SQLite.
- Frontend: Unit tests for services/utils; DOM integration tests for key flows (create/assign/remove/export).
- Test HTML pages under project are used for manual checks; migrate critical ones to automated tests.

## Build & Tooling

- Tailwind config and Vite for the build.
- Target setup for linting/formatting (ESLint/Prettier for JS; Ruff/Black or Flake8/Black for Python).
- CI-ready commands: build, test, and lint.

## Anti-Patterns To Eliminate

- Direct DOM mutation scattered across modules without going through state.
- Fetch calls outside ApiService/CategoryService.
- Implicit cross-module coupling and duplicated utilities.
- Mixed naming conventions and parallel MSI variants without clear rationale.
