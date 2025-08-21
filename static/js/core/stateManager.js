import { appState } from '../appState.js';
import { showSuccess, showError } from '../utils/ui.js';
import { updateAssignButtonState, updateSelectionDisplay } from '../uiHandlers.js';
import { updateCategorySelectionSummary } from '../modules/categoryTree.js';
import { productList, selectAllCheckbox } from '../domElements.js'; // Import DOM elements

// Enhanced state management with persistence
let products = [];
let filteredProducts = [];
export let allCategories = {}; // Store all categories by ID
export let selectedCategories = new Set(); // Changed from selectedCategory to Set for multi-selection
export let selectedProducts = new Set();
export let currentAsyncOperation = null; // Track async operations to prevent race conditions

export function getProducts() {
    return products;
}

export function setProducts(newProducts) {
    products = newProducts;
}

export function getFilteredProducts() {
    return filteredProducts;
}

export function setFilteredProducts(newFilteredProducts) {
    filteredProducts = newFilteredProducts;
}

// Restore previous page state from appState
export function restorePageState() {
    try {
        // Restore bulk category selection - updated for multi-selection
        const savedBulkCategory = appState.getBulkCategory();
        if (savedBulkCategory) {
            // For backward compatibility, if it's a single category, convert to array
            const categoriesToRestore = Array.isArray(savedBulkCategory) ? savedBulkCategory : [savedBulkCategory];
            
            categoriesToRestore.forEach(category => {
                selectedCategories.add(category.id);
                // Find and mark the saved category as selected
                const categoryElement = document.querySelector(`[data-category-id="${category.id}"] .category-checkbox`);
                if (categoryElement) {
                    categoryElement.checked = true;
                }
            });
        }

        // Restore product selections
        const savedProducts = appState.getBulkProducts();
        savedProducts.forEach(productId => {
            const checkbox = productList.querySelector(`[data-product-id="${productId}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });

        updateAssignButtonState();
        updateSelectionDisplay();
        showSuccess('Previous selection restored');
    } catch (error) {
        console.warn('Could not restore previous state:', error);
    }
}

export function updateBulkCategoryState() {
    // Update appState with current selected categories
    const categoriesArray = Array.from(selectedCategories).map(catId => allCategories[catId]).filter(Boolean);
    appState.setBulkCategory(categoriesArray);
}

export function clearAllSelections() {
    selectedProducts.clear();
    selectedCategories.clear(); // Clear selected categories too
    appState.clearBulkProducts();
    appState.setBulkCategory(null); // Clear category state
    
    // Clear product checkboxes
    document.querySelectorAll('.product-checkbox').forEach(cb => cb.checked = false);
    selectAllCheckbox.checked = false;
    
    // Clear category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    
    updateAssignButtonState();
    updateSelectionSummary();
    updateSelectionDisplay();
}

export function clearCategorySelection() {
    selectedCategories.clear();
    appState.setBulkCategory(null);
    
    // Clear all category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    
    updateAssignButtonState();
    updateSelectionDisplay();
}

export function handleProductCheckboxChange(event) {
    if (event.target.classList.contains('product-checkbox')) {
        const productId = event.target.dataset.productId;
        if (event.target.checked) {
            selectedProducts.add(productId);
            appState.addBulkProduct(productId);
        } else {
            selectedProducts.delete(productId);
            appState.removeBulkProduct(productId);
        }
        updateAssignButtonState();
        updateSelectionSummary();
    }
}

export function handleCategorySelection(category, isSelected) {
    if (isSelected) {
        selectedCategories.add(category.id);
        
        // Check if there are already categories selected from different levels
        const selectedLevels = new Set();
        selectedCategories.forEach(catId => {
            const cat = allCategories[catId];
            if (cat) selectedLevels.add(cat.level);
        });
        
        // Allow multi-selection only within the same level or related hierarchies
        if (selectedLevels.size > 1) {
            const currentLevel = category.level;
            const hasConflictingLevel = Array.from(selectedLevels).some(level => {
                // Allow parent-child relationships but not sibling level conflicts
                return Math.abs(level - currentLevel) > 1;
            });
            
            if (hasConflictingLevel) {
                // Show warning but allow selection (user can manually deselect if needed)
                showError('Warning: Selecting categories from distant levels may create complex hierarchies.');
            }
        }
    } else {
        selectedCategories.delete(category.id);
    }
    
    // Update state and UI
    updateBulkCategoryState();
    updateAssignButtonState();
    updateSelectionDisplay();
}

export function selectAllVisible() {
    const visibleCheckboxes = productList.querySelectorAll('.product-checkbox');
    const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
    
    visibleCheckboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
        const productId = checkbox.dataset.productId;
        if (!allChecked) {
            selectedProducts.add(productId);
            appState.addBulkProduct(productId);
        } else {
            selectedProducts.delete(productId);
            appState.removeBulkProduct(productId);
        }
    });
    
    updateAssignButtonState();
    updateSelectionSummary();
}

export function selectAllFiltered() {
    filteredProducts.forEach(product => {
        selectedProducts.add(product.product_id);
        appState.addBulkProduct(product.product_id);
        const checkbox = productList.querySelector(`[data-product-id="${product.product_id}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    updateAssignButtonState();
    updateSelectionSummary();
}

export function handleSelectAllCheckbox() {
    const isChecked = selectAllCheckbox.checked;
    
    // Disable autosave during bulk operation
    appState.disableAutosave();
    
    document.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
        const productId = checkbox.dataset.productId;
        if (isChecked) {
            appState.addBulkProduct(productId);
        } else {
            appState.removeBulkProduct(productId);
        }
    });
    
    // Re-enable autosave and save state
    appState.enableAutosave();
    updateAssignButtonState();
}

export function handleStateChange(state) {
    // Update UI based on state changes
    if (state.currentPage === 'bulk') {
        // Only update if we're on the bulk page
        updateAssignButtonState();
    }
}

export function removeCategoryFromSelection(categoryId) {
    selectedCategories.delete(categoryId);
    
    // Uncheck the category checkbox
    const checkbox = document.querySelector(`[data-category-id="${categoryId}"] .category-checkbox`);
    if (checkbox) checkbox.checked = false;
    
    updateBulkCategoryState();
    updateAssignButtonState();
    updateSelectionDisplay();
};
