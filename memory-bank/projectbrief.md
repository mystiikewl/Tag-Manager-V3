# Project Brief

## Overview

Tag Manager V2 is a web application for managing a three-level product category hierarchy and assigning categories to products. It provides a FastAPI backend with SQLite storage and a modular, vanilla JS frontend using TailwindCSS and Vite for the static pipeline. The UI supports browsing products, creating categories with constraints, assigning/removing categories, and exporting mappings to CSV.

## Goals

- Normalize architecture and reduce coupling between modules.
- Establish clear API contracts with consistent responses and validation.
- Consolidate frontend state management to a single source of truth.
- Componentize UI updates and standardize event handling.
- Improve testability and reliability with unit/integration tests.
- Document system patterns and ensure maintainability.

## Success Criteria

- Documented API endpoints, request/response schemas, and error format.
- Single, well-defined state manager as the source of truth.
- Clear boundaries: Services (HTTP) → Domain Services (business) → Managers (orchestrate) → UI modules/components.
- Consistent naming conventions and file organization.
- Test coverage established for critical flows (category create/assign/remove, export).
- Updated Memory Bank reflecting current architecture, decisions, and progress.

## Non-Goals (for initial refactor)

- Feature expansion beyond current scope.
- Migration to a new frontend framework; keep vanilla JS for now.
- Database tech change; SQLite remains unless blocking issues arise.

## Constraints

- Windows 10 environment, cmd shell.
- Must operate from project root path, do not cd elsewhere within tools.
- Existing data scripts and utilities must continue to function.

## Stakeholders and Users

- Internal operators responsible for maintaining product catalog categories.
- Developers and maintainers who need clarity and stability of contracts and modules.
