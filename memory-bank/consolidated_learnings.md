## Debugging Patterns

**Pattern: Module Import/Export Errors**
- When encountering "module does not provide an export named" errors, systematically check not only the module specified in the import path but also other logically related modules for the missing export.
- This is especially important when the initial error message might be misleading about the actual location of the function.
- *Rationale:* Improves efficiency in debugging by providing a structured approach to locating misplaced or incorrectly imported functions.

## Frontend Development Patterns

**Pattern: Centralized DOM Element Management**
- Centralizing DOM element selections (e.g., in `domElements.js`) is a good practice for maintainability.
- **Crucial:** Ensure strict synchronization between the IDs used in JavaScript (`document.getElementById('id')`) and the actual `id` attributes in the HTML templates. Mismatches lead to `TypeError: Cannot set properties of null` errors.
- *Rationale:* Prevents runtime errors due to missing DOM references and improves code readability.

**Pattern: Conditional JavaScript Initialization for Multi-Page Applications**
- For applications with multiple HTML pages served by a single JavaScript bundle, implement conditional JavaScript initialization.
- Call page-specific setup functions (e.g., event listeners, data loading) only when the corresponding HTML page is active.
- *Rationale:* Avoids `TypeError` when JavaScript attempts to interact with DOM elements that do not exist on the current page, improving robustness and performance.

**Pattern: Content Security Policy (CSP) Configuration**
- When using security headers like CSP in web frameworks (e.g., Flask with Talisman), explicitly whitelist all external resources (e.g., Google Fonts, external APIs).
- Ensure `style-src`, `font-src`, `script-src`, etc., directives include all necessary external origins.
- *Rationale:* Prevents `Refused to load` errors due to security policies and ensures all assets load correctly.

**Specific: Debugging SVG Path Errors**
- SVG path errors, especially "Expected arc flag ('0' or '1')", indicate malformed `d` attribute values.
- Carefully inspect arc commands (`A` or `a`) to ensure `large-arc-flag` and `sweep-flag` are strictly `0` or `1`, and that all 7 arguments are correctly provided and separated.
- *Rationale:* Resolves rendering issues and ensures SVG icons display correctly. Consider using simpler SVG or external icon libraries if complex paths are consistently problematic.
