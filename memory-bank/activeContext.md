# Active Context

## Current Focus

- Initialize and normalize the Memory Bank (canonical files).
- Inventory current architecture and modules; capture API contracts as-is for later hardening.
- Prepare staged refactor roadmap with measurable outcomes.

## Recent Changes

- Created canonical Memory Bank core files:
  - projectbrief.md
  - productContext.md
  - systemPatterns.md
  - techContext.md
- Next to add: progress.md baseline, systemInventory.md (modules + deps), apiContracts.md (current endpoints and response shapes).

## Next Steps (Short Term)

1. Write progress.md baseline (status, risks, immediate tasks).
2. Generate systemInventory.md:
   - Enumerate static/js modules by role (core, services, managers, modules, components, events, utils).
   - First-pass dependency notes between layers.
3. Extract current API endpoints and response shapes into apiContracts.md for later conformance to .cursor/rules/api-patterns.mdc.
4. Identify duplicates/MSI variants; decide deprecation path or consolidation plan.

## Decisions & Considerations

- Keep vanilla JS architecture; focus on state and module boundaries rather than framework migration.
- Adopt API error format and distinct endpoint naming from api-patterns.mdc.
- Single source of truth state via core/stateManager; all UI mutations flow through state + events.

## Risks / Unknowns

- Potential hidden coupling between modules (DOM mutations vs. state-driven rendering).
- MSI vs non-MSI parallel files may introduce divergence; careful consolidation required.
- Backend validation gaps or inconsistent responses might break assumptions in the frontend.

## Quality Gates (Target)

- API: documented schemas + consistent error format.
- Frontend: all fetches via ApiService/CategoryService; state-driven UI; event contract documented.
- Tests: critical flows covered (create category, assign/remove categories, export).
- Tooling: enforce lint/format tasks for frontend/backend.

## Work Items Queue

- [ ] progress.md baseline with current status and plan
- [ ] systemInventory.md module catalog + initial dependency map
- [ ] apiContracts.md current endpoints and shapes
- [ ] Plan for deprecating MSI variants or merging into single canonical modules
- [ ] Define event names and payloads in a single reference (eventManager contract)
