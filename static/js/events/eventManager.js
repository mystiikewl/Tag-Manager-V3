import { appState } from '../appState.js';
import { 
    productSearch, categoryFilter, selectAllCheckbox, selectAllVisibleBtn, 
    selectFilteredBtn, productList, assignCategoriesBtn, removeCategoriesBtn, 
    clearSelectionBtn, clearCategorySelectionBtn, expandAllBtn, collapseAllBtn,
    categoryTree as domCategoryTree
} from '../domElements.js';
import { 
    handleProductCheckboxChange, clearAllSelections, clearCategorySelection, 
    selectAllVisible, selectAllFiltered, handleSelectAllCheckbox, handleStateChange,
    selectedCategories, selectedProducts, allCategories, updateBulkCategoryState, handleCategorySelection
} from '../core/stateManager.js';
import { 
    updateAssignButtonState, updateSelectionSummary, updateSelectionDisplay, 
    showSuccessMessage, showErrorMessage
} from '../uiHandlers.js';
import { updateCategorySelectionSummary, updateCurrentCategoriesDisplayForProducts, expandAllCategories, collapseAllCategories, loadAllCategories, loadCategoryChildren, toggleCategoryNode } from '../modules/categoryTree.js';
import { applyProductFilters } from '../modules/productFilter.js';
import { showLoadingOverlay, showError, showSuccess } from '../utils/ui.js';
import { debouncedRefreshAllStatistics } from '../utils/statisticsManager.js';

// Main page event listeners
export function setupMainPageEventListeners() {
    console.log('Setting up main page event listeners...');
    // Subscribe to appState changes
    appState.subscribe(handleStateChange);
    
    // Subscribe to app state changes for category preview updates
    appState.subscribe((state) => {
        // Update preview when app state changes
        if (state.productId) {
            setTimeout(() => updateCategoryPreview(), 100); // Small delay to ensure DOM is updated
        }
        
        // Sync category tree checkboxes with app state
        const allCategoryCheckboxes = document.querySelectorAll('.category-checkbox');
        allCategoryCheckboxes.forEach(checkbox => {
            const categoryId = checkbox.dataset.categoryId;
            const isSelected = state.categories && state.categories.includes(categoryId);
            checkbox.checked = isSelected;
        });
    });

    // Initialize any existing event listeners
    setupEventListeners();
}

// Setup general event listeners
function setupEventListeners() {
    // Basic event listener setup - most functionality is now handled by the simplified FAB
    console.log('Basic event listeners setup completed');
    
    // Add event delegation for category tree interactions
    document.addEventListener('click', async (e) => {
        // Handle expand/collapse icon clicks
        if (e.target.closest('.expand-icon')) {
            e.preventDefault();
            e.stopPropagation();
            
            const nodeElement = e.target.closest('.category-tree-node');
            if (nodeElement) {
                const categoryId = nodeElement.dataset.categoryId;
                const category = allCategories[categoryId];
                if (category && category.hasChildren) {
                    await toggleCategoryNode(category, nodeElement);
                }
            }
        }
        
        // Handle category checkbox clicks
        if (e.target.classList.contains('category-checkbox')) {
            e.stopPropagation();
            const categoryId = e.target.dataset.categoryId;
            
            // Determine which page we're on and use appropriate handler
            const isMainPage = document.querySelector('#category-tree') && !document.querySelector('#product-table');
            
            console.log('Event delegation - Category checkbox clicked:', {
                categoryId,
                checked: e.target.checked,
                isMainPage,
                hasMainPageHandler: !!handleMainPageCategorySelection
            });
            
            if (isMainPage) {
                // Main page - use the new category selection system
                console.log('Event delegation - Using main page handler');
                handleMainPageCategorySelection(categoryId, e.target.checked);
            } else {
                // Bulk page - use the existing bulk selection system
                console.log('Event delegation - Using bulk page handler');
                if (typeof handleCategorySelection === 'function') {
                    handleCategorySelection(categoryId, e.target.checked);
                }
            }
        }
    });
}

// Bulk assignment page event listeners
export function setupBulkPageEventListeners() {
    console.log('Setting up bulk page event listeners...');
    
    // Product search and filtering with state preservation
    if (productSearch) productSearch.addEventListener('input', applyProductFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyProductFilters);
    if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', handleSelectAllCheckbox);
    if (selectAllVisibleBtn) selectAllVisibleBtn.addEventListener('click', () => selectAllVisible());
    if (selectFilteredBtn) selectFilteredBtn.addEventListener('click', () => selectAllFiltered());
    if (productList) productList.addEventListener('change', handleProductCheckboxChange);
    if (assignCategoriesBtn) assignCategoriesBtn.addEventListener('click', handleAssignCategory);
    
    if (removeCategoriesBtn) {
        removeCategoriesBtn.addEventListener('click', handleRemoveCategory);
    } else {
        console.warn('Remove categories button not found on bulk page.');
    }
    
    if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', () => clearAllSelections());
    
    // New event listeners for category selection controls
    if (clearCategorySelectionBtn) clearCategorySelectionBtn.addEventListener('click', () => clearCategorySelection());
    if (expandAllBtn) expandAllBtn.addEventListener('click', () => expandAllCategories(true));
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => collapseAllCategories(false));
    
    updateAssignButtonState(); // Initial state

    // Subscribe to appState changes
    appState.subscribe(handleStateChange);
}

async function handleAssignCategory() {
    if (selectedCategories.size === 0 || selectedProducts.size === 0) {
        showErrorMessage('Please select at least one category and one product.');
        return;
    }

    showLoadingOverlay(true, 'Assigning categories...');
    try {
        // Use the new bulk assignment endpoint for multiple categories
        const response = await fetch('/api/products/bulk-assign-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                product_ids: Array.from(selectedProducts),
                category_ids: Array.from(selectedCategories)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showSuccess(result.message || 'Categories assigned successfully!'); // Use imported showSuccess
        
        // Update category display for the affected products
        await updateCurrentCategoriesDisplayForProducts(Array.from(selectedProducts));

        // Clear selections
        clearAllSelections();
        
        // Refresh statistics and product count badge immediately
        debouncedRefreshAllStatistics(500);

    } catch (error) {
        console.error('Assignment failed:', error);
        showError(`Failed to assign categories: ${error.message}`); // Use imported showError
    } finally {
        showLoadingOverlay(false); // Use imported showLoadingOverlay
    }
}

async function handleRemoveCategory() {
    if (selectedCategories.size === 0 || selectedProducts.size === 0) {
        showErrorMessage('Please select at least one category and one product.');
        return;
    }

    // Show confirmation dialog for removal
    const categoryCount = selectedCategories.size;
    const productCount = selectedProducts.size;
    const confirmMessage = `Are you sure you want to remove ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} from ${productCount} product${productCount === 1 ? '' : 's'}?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    showLoadingOverlay(true, 'Removing categories...'); // Use imported showLoadingOverlay
    try {
        // Use the new bulk removal endpoint for multiple categories
        const response = await fetch('/api/products/bulk-remove-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                product_ids: Array.from(selectedProducts),
                category_ids: Array.from(selectedCategories)
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showSuccess(result.message || 'Categories removed successfully!'); // Use imported showSuccess
        
        // Update category display for the affected products
        await updateCurrentCategoriesDisplayForProducts(Array.from(selectedProducts));

        // Clear selections
        clearAllSelections();
        
        // Refresh statistics and product count badge immediately
        debouncedRefreshAllStatistics(500);

    } catch (error) {
        console.error('Failed to remove categories:', error);
        showError(`Failed to remove categories: ${error.message}`); // Use imported showError
    } finally {
        showLoadingOverlay(false); // Use imported showLoadingOverlay
    }
}

// Function to update category preview based on selected checkboxes
function updateCategoryPreview() {
    console.log('updateCategoryPreview called');
    const productId = appState.getCurrentProductId();
    console.log('Current product ID:', productId);
    
    if (!productId) {
        console.log('No product selected, skipping preview update');
        return;
    }
    
    // Get currently selected categories from the tree
    const selectedCategoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    console.log('Found checked category checkboxes:', selectedCategoryCheckboxes.length);
    
    const previewCategories = [];
    
    selectedCategoryCheckboxes.forEach(checkbox => {
        const categoryId = checkbox.dataset.categoryId;
        const category = allCategories[categoryId];
        console.log('Processing checkbox:', { categoryId, category });
        
        if (category) {
            previewCategories.push({
                id: category.id,
                name: category.name,
                level: category.level
            });
        }
    });
    
    console.log('Preview categories to show:', previewCategories);
    
    // Get current official categories for the product
    fetch(`/api/products/${productId}/categories`)
        .then(response => {
            console.log('API response status:', response.status);
            return response.ok ? response.json() : [];
        })
        .then(categories => {
            console.log('Official categories from API:', categories);
            displayProductCategories(categories, previewCategories);
        })
        .catch(error => {
            console.error('Error fetching current categories:', error);
            displayProductCategories([], previewCategories);
        });
}

// Function to handle product selection and update UI
function handleProductSelection(productId) {
    appState.setProduct(productId);
    
    // Show the product-specific sections
    const noProductState = document.getElementById('no-product-selected-state');
    const currentCategories = document.getElementById('current-categories');
    const addCategoryBtn = document.getElementById('add-category-btn');
    
    if (noProductState) noProductState.style.display = 'none';
    if (currentCategories) currentCategories.style.display = 'block';
    if (addCategoryBtn) addCategoryBtn.style.display = 'block';
    
    // Load and display categories for this product
    updateCategoryPreview();
}

// Make handleProductSelection globally available
window.handleProductSelection = handleProductSelection;

// Handle category selection for main page (different from bulk page)
function handleMainPageCategorySelection(categoryId, isSelected) {
    console.log('handleMainPageCategorySelection called:', { categoryId, isSelected });
    
    if (isSelected) {
        appState.addCategory(categoryId);
        console.log('Added category to appState:', categoryId);
    } else {
        appState.removeCategory(categoryId);
        console.log('Removed category from appState:', categoryId);
    }
    
    console.log('Current appState categories:', appState.getCategories());
    
    // Update preview display
    updateCategoryPreview();
}

// Make handleMainPageCategorySelection globally available
window.handleMainPageCategorySelection = handleMainPageCategorySelection;
