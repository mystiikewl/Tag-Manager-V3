# Phase 3: Frontend Architecture Cleanup

## Goal

Consolidate state management, eliminate module duplication, and establish clear architectural boundaries in the frontend.

## Current Issues

- Duplicate MSI vs non-MSI modules causing confusion
- Scattered state management across multiple files
- Direct DOM manipulation in service layers
- No clear separation of concerns
- Inconsistent event handling patterns

## Implementation Steps

### 3.1 State Management Consolidation

**Establish single source of truth:**

```javascript
// static/js/core/stateManager.js (enhanced)
class StateManager {
  constructor() {
    this.state = {
      products: [],
      filteredProducts: [],
      selectedProducts: new Set(),
      selectedCategories: new Set(),
      allCategories: {},
      currentView: "main",
      loading: false,
      error: null,
    };
    this.listeners = new Map();
  }

  // Centralized state mutations
  setState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.notifyListeners(prevState);
  }

  // Reactive subscriptions
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }

  // State queries
  getState() {
    return { ...this.state };
  }

  getSelectedProducts() {
    return Array.from(this.state.selectedProducts);
  }

  getSelectedCategories() {
    return Array.from(this.state.selectedCategories);
  }
}

export const stateManager = new StateManager();
```

### 3.2 Module Deduplication Strategy

**Consolidate MSI and non-MSI variants:**

1. **Analyze Differences:**

   - Compare `CategoryCreationModal.js` vs `CategoryCreationModal-MSI.js`
   - Identify which version has more features/better implementation
   - Document breaking changes needed

2. **Migration Plan:**

   ```javascript
   // Create unified modal module
   // static/js/components/modals/CategoryCreationModal.js
   export class CategoryCreationModal {
     constructor() {
       this.modal = null;
       this.isVisible = false;
     }

     show() {
       // Unified implementation
     }

     hide() {
       // Unified implementation
     }

     async createCategory(categoryData) {
       // Use CategoryService for API calls
       const result = await CategoryService.createCategory(categoryData);
       stateManager.setState({ lastAction: "category_created" });
       return result;
     }
   }
   ```

3. **Deprecation Process:**
   - Add deprecation warnings to MSI modules
   - Update imports across codebase
   - Remove old files after verification

### 3.3 Service Layer Enhancement

**Strengthen separation between HTTP and business logic:**

```javascript
// static/js/services/ApiService.js (enhanced)
export class ApiService {
  static async request(endpoint, options = {}) {
    const config = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    try {
      const response = await fetch(endpoint, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || response.statusText);
      }
      return response.json();
    } catch (error) {
      throw new Error(`API Error: ${error.message}`);
    }
  }
}

// static/js/services/CategoryService.js (business logic)
export class CategoryService {
  static async createCategory(categoryData) {
    // Business logic validation
    if (!categoryData.name || !categoryData.level) {
      throw new Error("Name and level are required");
    }

    // Call API service
    const result = await ApiService.request("/api/categories/create", {
      method: "POST",
      body: categoryData,
    });

    // Post-processing if needed
    return result;
  }

  static async getHierarchicalCategories() {
    const level1 = await this.getLevel1Categories();
    // Build hierarchy with children
    return this.buildHierarchy(level1);
  }
}
```

### 3.4 Event System Standardization

**Implement consistent event patterns:**

```javascript
// static/js/events/eventManager.js (enhanced)
export class EventManager {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Predefined event types
  static get EVENTS() {
    return {
      PRODUCT_SELECTED: "product:selected",
      PRODUCT_DESELECTED: "product:deselected",
      CATEGORY_SELECTED: "category:selected",
      CATEGORY_CREATED: "category:created",
      CATEGORY_DELETED: "category:deleted",
      STATE_UPDATED: "state:updated",
      ERROR_OCCURRED: "error:occurred",
    };
  }
}

export const eventManager = new EventManager();
```

### 3.5 UI Module Restructuring

**Establish clear UI component patterns:**

```javascript
// static/js/modules/categoryTree.js (refactored)
export class CategoryTreeModule {
  constructor() {
    this.treeElement = null;
    this.expandedNodes = new Set();
  }

  init() {
    this.treeElement = document.getElementById("category-tree");
    this.bindEvents();
    this.subscribeToState();
  }

  subscribeToState() {
    stateManager.subscribe("categories_loaded", this.render.bind(this));
    stateManager.subscribe(
      "category_selected",
      this.updateSelection.bind(this)
    );
  }

  render(categories) {
    // Pure function - no side effects
    const html = this.buildTreeHtml(categories);
    this.treeElement.innerHTML = html;
  }

  bindEvents() {
    // Event delegation for dynamic elements
    this.treeElement.addEventListener("click", this.handleClick.bind(this));
  }

  handleClick(event) {
    const target = event.target;
    if (target.matches(".category-checkbox")) {
      const categoryId = target.dataset.categoryId;
      const isSelected = target.checked;

      eventManager.emit(EventManager.EVENTS.CATEGORY_SELECTED, {
        categoryId,
        isSelected,
      });
    }
  }
}
```

## Testing Strategy

### Architecture Tests

- Test state manager isolation
- Test event system functionality
- Test service layer separation
- Verify no direct DOM manipulation in services

### Integration Tests

- Test complete workflows through UI modules
- Test state-to-UI synchronization
- Test error handling propagation

## Success Criteria

- [ ] Single state manager as source of truth
- [ ] All MSI modules eliminated and consolidated
- [ ] Clear separation: Services → Managers → UI Modules
- [ ] Event-driven architecture enforced
- [ ] No direct DOM manipulation in service layers
- [ ] Consistent module structure and naming

## Files to Create/Modify

- Enhance `static/js/core/stateManager.js`
- Consolidate modal components in `static/js/components/modals/`
- Update `static/js/services/` with clear boundaries
- Refactor `static/js/modules/` to use state subscriptions
- Update `static/js/events/eventManager.js`
- Remove all MSI variant files after consolidation

## Risk Mitigation

1. **Gradual Migration**: Update modules in small batches
2. **Feature Parity**: Ensure consolidated modules maintain all functionality
3. **Testing First**: Write tests before consolidating modules
4. **Rollback Plan**: Keep backup of MSI files during transition

## Timeline

- Week 1: State management consolidation and testing
- Week 2: Module deduplication (analyze and plan)
- Week 3: Module deduplication (implementation)
- Week 4: Event system and UI module restructuring
