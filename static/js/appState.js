// appState.js: Enhanced central store for application state with persistence

class AppState {
    constructor() {
        // Load from localStorage on initialization
        this.loadState();
        this.observers = [];
        
        // Auto-save state changes
        this.autosaveEnabled = true;
    }

    // Load state from localStorage
    loadState() {
        try {
            const savedState = localStorage.getItem('tagManagerState');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                this.currentProductId = parsed.currentProductId || null;
                this.selectedCategories = new Set(parsed.selectedCategories || []);
                this.hideAllocatedProducts = parsed.hideAllocatedProducts || false;
                this.lastSelectedBulkCategory = parsed.lastSelectedBulkCategory || null;
                this.bulkSelectedProducts = new Set(parsed.bulkSelectedProducts || []);
                this.currentPage = parsed.currentPage || 'main';
            } else {
                this.resetState();
            }
        } catch (error) {
            console.warn('Failed to load saved state, using defaults:', error);
            this.resetState();
        }
    }

    // Save state to localStorage
    saveState() {
        if (!this.autosaveEnabled) return;
        
        try {
            const stateToSave = {
                currentProductId: this.currentProductId,
                selectedCategories: Array.from(this.selectedCategories),
                hideAllocatedProducts: this.hideAllocatedProducts,
                lastSelectedBulkCategory: this.lastSelectedBulkCategory,
                bulkSelectedProducts: Array.from(this.bulkSelectedProducts),
                currentPage: this.currentPage,
                timestamp: Date.now()
            };
            localStorage.setItem('tagManagerState', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }

    // Reset to default state
    resetState() {
        this.currentProductId = null;
        this.selectedCategories = new Set();
        this.hideAllocatedProducts = false;
        this.lastSelectedBulkCategory = null;
        this.bulkSelectedProducts = new Set();
        this.currentPage = 'main';
    }

    // === MAIN PAGE STATE MANAGEMENT ===

    // Set current product and notify observers
    setProduct(productId) {
        this.currentProductId = productId;
        this.selectedCategories.clear();
        this.saveState();
        this.notify();
    }

    // Clear current product selection
    clearProduct() {
        this.currentProductId = null;
        this.selectedCategories.clear();
        this.saveState();
        this.notify();
    }

    // Get current product ID
    getCurrentProductId() {
        return this.currentProductId;
    }

    // Get current selected categories
    getCategories() {
        return Array.from(this.selectedCategories);
    }

    // Add category to selection
    addCategory(categoryId) {
        this.selectedCategories.add(categoryId);
        this.saveState();
        this.notify();
    }

    // Remove category from selection
    removeCategory(categoryId) {
        this.selectedCategories.delete(categoryId);
        this.saveState();
        this.notify();
    }

    // Clear all selected categories
    clearCategories() {
        this.selectedCategories.clear();
        this.saveState();
        this.notify();
    }

    // === BULK ASSIGNMENT STATE MANAGEMENT ===

    // Set bulk category selection
    setBulkCategory(categoryData) {
        this.lastSelectedBulkCategory = categoryData;
        this.saveState();
        this.notify();
    }

    // Get bulk category selection
    getBulkCategory() {
        return this.lastSelectedBulkCategory;
    }

    // Bulk product selection management
    addBulkProduct(productId) {
        this.bulkSelectedProducts.add(productId);
        this.saveState();
        this.notify();
    }

    removeBulkProduct(productId) {
        this.bulkSelectedProducts.delete(productId);
        this.saveState();
        this.notify();
    }

    clearBulkProducts() {
        this.bulkSelectedProducts.clear();
        this.saveState();
        this.notify();
    }

    getBulkProducts() {
        return Array.from(this.bulkSelectedProducts);
    }

    // === FILTER STATE MANAGEMENT ===

    setHideAllocatedProducts(hide) {
        this.hideAllocatedProducts = hide;
        this.saveState();
        this.notify();
    }

    getHideAllocatedProducts() {
        return this.hideAllocatedProducts;
    }

    // === PAGE STATE MANAGEMENT ===

    setCurrentPage(page) {
        this.currentPage = page;
        this.saveState();
        this.notify();
    }

    getCurrentPage() {
        return this.currentPage;
    }

    // === OBSERVER PATTERN ===

    // Register observer callback
    subscribe(observer) {
        this.observers.push(observer);
    }

    // Unregister observer
    unsubscribe(observer) {
        this.observers = this.observers.filter(obs => obs !== observer);
    }

    // Notify all observers of state changes
    notify() {
        const state = {
            productId: this.currentProductId,
            categories: this.getCategories(),
            hideAllocatedProducts: this.hideAllocatedProducts,
            bulkCategory: this.lastSelectedBulkCategory,
            bulkProducts: this.getBulkProducts(),
            currentPage: this.currentPage
        };
        
        this.observers.forEach(observer => {
            try {
                observer(state);
            } catch (error) {
                console.error('Observer error:', error);
            }
        });
    }

    // === UTILITY METHODS ===

    // Clear all state (for manual reset)
    clearAllState() {
        this.resetState();
        this.saveState();
        this.notify();
    }

    // Temporarily disable autosave (for bulk operations)
    disableAutosave() {
        this.autosaveEnabled = false;
    }

    // Re-enable autosave and force save
    enableAutosave() {
        this.autosaveEnabled = true;
        this.saveState();
    }
}

// Export singleton instance
export const appState = new AppState();