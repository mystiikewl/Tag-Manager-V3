// Enhanced bulk assignment with persistent state management
import { appState } from './appState.js';
import { updateCategorySelectionSummary } from './modules/categoryTree.js';

// Add event listener for refreshing category display
document.addEventListener('refreshCategoryDisplay', async () => {
    console.log('refreshCategoryDisplay event received in bulk-assign. Reloading categories...');
    await loadAllCategories();
});

// DOM Elements (updated to match actual template structure)
const categoryTree = document.getElementById('category-tree');
const productSearch = document.getElementById('product-search');
const categoryFilter = document.getElementById('category-filter');
const selectAllCheckbox = document.getElementById('select-all-checkbox');
const selectAllVisibleBtn = document.getElementById('select-all-visible');
const selectFilteredBtn = document.getElementById('select-filtered');
const productList = document.getElementById('product-list');
const assignCategoriesBtn = document.getElementById('assign-categories');
const removeCategoriesBtn = document.getElementById('remove-categories');
const clearSelectionBtn = document.getElementById('clear-selection');
const loadingOverlay = document.getElementById('loading-overlay');
const notificationContainer = document.getElementById('notification-container');
const visibleCount = document.getElementById('visible-count');
const totalCount = document.getElementById('total-count');
const selectionSummary = document.getElementById('selection-summary');

// New DOM elements for multi-category selection
const clearCategorySelectionBtn = document.getElementById('clear-category-selection');
const categorySelectionSummary = document.getElementById('category-selection-summary');
const selectedCategoriesList = document.getElementById('selected-categories-list');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');

// Debug: Check DOM elements
console.log('DOM Elements Check:');
console.log('removeCategoriesBtn found:', !!removeCategoriesBtn, removeCategoriesBtn);
console.log('assignCategoriesBtn found:', !!assignCategoriesBtn, assignCategoriesBtn);

// Enhanced state management with persistence
let products = [];
let filteredProducts = [];
let allCategories = {}; // Store all categories by ID
let selectedCategories = new Set(); // Changed from selectedCategory to Set for multi-selection
let selectedProducts = new Set();
let currentAsyncOperation = null; // Track async operations to prevent race conditions

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
    // Set page context in state
    appState.setCurrentPage('bulk');
    
    // Debug: Check button existence and visibility
    setTimeout(() => {
        console.log('=== BUTTON DEBUG ===');
        console.log('Remove button element:', removeCategoriesBtn);
        console.log('Remove button visible:', removeCategoriesBtn ? 'YES' : 'NO');
        if (removeCategoriesBtn) {
            console.log('Remove button classes:', removeCategoriesBtn.className);
            console.log('Remove button disabled:', removeCategoriesBtn.disabled);
            console.log('Remove button style display:', getComputedStyle(removeCategoriesBtn).display);
            console.log('Remove button style visibility:', getComputedStyle(removeCategoriesBtn).visibility);
            console.log('Remove button style opacity:', getComputedStyle(removeCategoriesBtn).opacity);
        }
        console.log('=== END DEBUG ===');
    }, 500);
    
    // Test notification to verify system works
    setTimeout(() => {
        console.log('Testing notification system...');
        showSuccess('Notification system test - if you see this, notifications are working!');
    }, 1000);
    
    await loadAllCategories();
    await loadProducts();
    setupEventListeners();
    restorePageState(); // Restore previous state
});

// Restore previous page state from appState
function restorePageState() {
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
            const checkbox = document.querySelector(`[data-product-id="${productId}"]`);
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

// New function to get category counts efficiently
async function getCategoryCounts(productIds) {
    if (productIds.length === 0) return {};
    
    try {
        const response = await fetch('/api/products/bulk-categories-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_ids: productIds })
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch category counts');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching category counts:', error);
        showError('Failed to load category counts');
        return {};
    }
}

// --- Product Loading and Rendering ---
async function loadProducts() {
    showLoadingOverlay(true, 'Loading products...');
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        products = await response.json();
        filteredProducts = [...products]; // Initialize filteredProducts
        renderProducts(filteredProducts);
        await updateCurrentCategoriesDisplayForAllVisibleProducts(); // Fetch categories for initially loaded products
    } catch (error) {
        console.error('Failed to load products:', error);
        showError('Failed to load products. Please try again.');
        products = []; // Ensure products is an empty array on failure
        filteredProducts = [];
        renderProducts([]); // Render an empty table or error message
    } finally {
        showLoadingOverlay(false);
    }
}

function renderProducts(productsToRender) {
    productList.innerHTML = ''; // Clear existing products

    if (productsToRender.length === 0) {
        const tr = productList.insertRow();
        const td = tr.insertCell();
        td.colSpan = 4; // Span across all columns (checkbox, name, categories, actions)
        td.textContent = 'No products found.';
        td.className = 'text-center py-4 text-brand-grey-medium';
        return;
    }

    // Get saved product selections
    const savedSelections = appState.getBulkProducts();

    productsToRender.forEach(product => {
        const tr = productList.insertRow();
        tr.dataset.productId = product.product_id;
        tr.className = 'hover:bg-blue-50 transition-colors duration-150';

        // Checkbox cell
        const tdCheckbox = tr.insertCell();
        tdCheckbox.className = 'px-4 py-3';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'product-checkbox rounded border-brand-grey-light text-brand-red focus:ring-brand-red';
        checkbox.dataset.productId = product.product_id;
        
        // Restore saved selection state
        checkbox.checked = savedSelections.includes(product.product_id);
        if (checkbox.checked) {
            selectedProducts.add(product.product_id);
            appState.addBulkProduct(product.product_id); // Sync with state
        }
        
        tdCheckbox.appendChild(checkbox);

        // Product Name cell
        const tdName = tr.insertCell();
        tdName.className = 'px-4 py-3 text-sm text-brand-dark font-medium';
        tdName.textContent = product.product_name;

        // Current Categories cell
        const tdCategories = tr.insertCell();
        tdCategories.className = 'px-4 py-3 text-sm text-brand-grey-medium product-categories-cell';
        tdCategories.id = `product-cats-${product.product_id}`; // ID for easy update
        tdCategories.textContent = 'Loading categories...'; // Placeholder
        
        // Actions cell
        const tdActions = tr.insertCell();
        tdActions.className = 'px-4 py-3 text-sm';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'text-brand-red hover:text-brand-dark text-xs';
        viewBtn.textContent = 'View';
        viewBtn.onclick = () => window.open(`/?product=${product.product_id}`, '_blank');
        tdActions.appendChild(viewBtn);
    });
    
    // Update UI counters
    updateProductCounts();
    updateSelectionSummary();
}

function updateProductCounts() {
    if (visibleCount) visibleCount.textContent = filteredProducts.length;
    if (totalCount) totalCount.textContent = products.length;
}

// --- End Product Loading and Rendering ---

// These old functions are replaced by the new category tree functions

// Old category click handler removed - using new tree-based selection

// Setup event listeners
function setupEventListeners() {
    // Debug: Check if buttons exist and their initial state
    console.log('Setting up event listeners...');
    console.log('removeCategoriesBtn element:', removeCategoriesBtn);
    console.log('removeCategoriesBtn classes:', removeCategoriesBtn?.className);
    console.log('removeCategoriesBtn style:', removeCategoriesBtn?.style.cssText);
    
    // Product search and filtering with state preservation
    productSearch.addEventListener('input', handleProductSearch);
    categoryFilter.addEventListener('change', handleCategoryFilter);
    selectAllCheckbox.addEventListener('change', handleSelectAllCheckbox);
    selectAllVisibleBtn.addEventListener('click', () => selectAllVisible());
    selectFilteredBtn.addEventListener('click', () => selectAllFiltered());
    productList.addEventListener('change', handleProductCheckboxChange);
    assignCategoriesBtn.addEventListener('click', handleAssignCategory);
    
    // Check if remove button exists before adding event listener
    if (removeCategoriesBtn) {
        removeCategoriesBtn.addEventListener('click', handleRemoveCategory);
        console.log('Added event listener to remove button');
    } else {
        console.error('Remove categories button not found!');
    }
    
    clearSelectionBtn.addEventListener('click', () => clearAllSelections());
    
    // New event listeners for category selection controls
    if (clearCategorySelectionBtn) clearCategorySelectionBtn.addEventListener('click', () => clearCategorySelection());
    if (expandAllBtn) expandAllBtn.addEventListener('click', () => expandAllCategories());
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => collapseAllCategories());
    
    updateAssignButtonState(); // Initial state

    // Subscribe to appState changes
    appState.subscribe(handleStateChange);
}

// Helper functions for new event handlers
function selectAllVisible() {
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

function selectAllFiltered() {
    filteredProducts.forEach(product => {
        selectedProducts.add(product.product_id);
        appState.addBulkProduct(product.product_id);
        const checkbox = document.querySelector(`[data-product-id="${product.product_id}"]`);
        if (checkbox) checkbox.checked = true;
    });
    
    updateAssignButtonState();
    updateSelectionSummary();
}

function clearAllSelections() {
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

function updateSelectionSummary() {
    const count = selectedProducts.size;
    selectionSummary.textContent = `${count} product${count !== 1 ? 's' : ''} selected`;
}

// Handle global state changes
function handleStateChange(state) {
    // Update UI based on state changes
    if (state.currentPage === 'bulk') {
        // Only update if we're on the bulk page
        updateAssignButtonState();
    }
}

// --- Event Handlers ---
function handleProductSearch() {
    applyProductFilters();
}

function handleCategoryFilter() {
    applyProductFilters();
}

async function applyProductFilters() {
    const searchTerm = productSearch.value.toLowerCase();
    const categoryFilterValue = categoryFilter.value;
    
    // Start with all products
    let filtered = [...products];
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(product => 
            product.product_name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply category filter
    if (categoryFilterValue !== 'all') {
        try {
            // Get category data for all products that passed search filter
            const productIds = filtered.map(p => p.product_id);
            const response = await fetch('/api/products/bulk-categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_ids: productIds })
            });
            
            if (response.ok) {
                const categoryData = await response.json();
                
                filtered = filtered.filter(product => {
                    const productCategories = categoryData[product.product_id] || [];
                    const categoryCount = productCategories.length;
                    
                    switch (categoryFilterValue) {
                        case 'uncategorized':
                            return categoryCount === 0;
                        case 'categorized':
                            return categoryCount > 0;
                        case 'multi-category':
                            return categoryCount > 1;
                        default:
                            return true;
                    }
                });
            }
        } catch (error) {
            console.error('Error applying category filter:', error);
            showError('Failed to apply category filter');
        }
    }
    
    filteredProducts = filtered;
    renderProducts(filteredProducts);
    await updateCurrentCategoriesDisplayForAllVisibleProducts();
}

function handleSelectAllCheckbox() {
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

function handleProductCheckboxChange(event) {
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

async function handleAssignCategory() {
    if (selectedCategories.size === 0 || selectedProducts.size === 0) {
        showError('Please select at least one category and one product.');
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
        showSuccess(result.message || 'Categories assigned successfully!');
        
        // Update category display for the affected products
        await updateCurrentCategoriesDisplayForProducts(Array.from(selectedProducts));

        // Clear selections
        clearAllSelections();

    } catch (error) {
        console.error('Failed to assign categories:', error);
        showError(`Failed to assign categories: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

async function handleRemoveCategory() {
    if (selectedCategories.size === 0 || selectedProducts.size === 0) {
        showError('Please select at least one category and one product.');
        return;
    }

    // Show confirmation dialog for removal
    const categoryCount = selectedCategories.size;
    const productCount = selectedProducts.size;
    const confirmMessage = `Are you sure you want to remove ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} from ${productCount} product${productCount === 1 ? '' : 's'}?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    showLoadingOverlay(true, 'Removing categories...');
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
        showSuccess(result.message || 'Categories removed successfully!');
        
        // Update category display for the affected products
        await updateCurrentCategoriesDisplayForProducts(Array.from(selectedProducts));

        // Clear selections
        clearAllSelections();

    } catch (error) {
        console.error('Failed to remove categories:', error);
        showError(`Failed to remove categories: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- End Event Handlers ---

// --- Category Display & API Calls ---
async function loadAllCategories() {
    showLoadingOverlay(true, 'Loading categories...');
    try {
        // Load all categories from the backend 
        const response = await fetch('/api/categories/level1');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const level1Cats = await response.json();

        // Store all categories for tree building
        allCategories = {};
        level1Cats.forEach(cat => {
            allCategories[cat.id] = { 
                ...cat, 
                children: {},
                expanded: false,
                level: 1
            };
        });
        
        // Render the category tree
        renderCategoryTree();
    } catch (error) {
        console.error('Failed to load categories:', error);
        showError('Failed to load categories. Please try again.');
    } finally {
        showLoadingOverlay(false);
    }
}

async function renderCategoryTree() {
    categoryTree.innerHTML = '';
    
    // Render all level 1 categories
    const level1Categories = Object.values(allCategories).filter(cat => cat.level === 1);
    
    level1Categories.forEach(category => {
        const categoryNode = createCategoryTreeNode(category, 1);
        categoryTree.appendChild(categoryNode);
    });
}

function createCategoryTreeNode(category, level) {
    // Main container
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'category-tree-node mb-2';
    nodeDiv.dataset.categoryId = category.id;
    nodeDiv.dataset.level = level;
    
    // Category header
    const headerDiv = document.createElement('div');
    headerDiv.className = `category-node-header flex items-center py-3 px-4 rounded-lg cursor-pointer 
                          bg-brand-near-white hover:bg-brand-grey-light transition-all duration-200 
                          border border-brand-grey-light shadow-sm`;
    headerDiv.style.marginLeft = `${(level - 1) * 20}px`;
    
    // Expand/collapse icon (if has children)
    if (category.hasChildren) {
        const expandIcon = document.createElement('button');
        expandIcon.className = 'expand-icon w-5 h-5 mr-3 text-brand-grey-medium hover:text-brand-dark transition-colors';
        expandIcon.innerHTML = category.expanded 
            ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
            : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
        
        expandIcon.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleCategoryNode(category, nodeDiv);
        });
        
        headerDiv.appendChild(expandIcon);
    } else {
        const spacer = document.createElement('div');
        spacer.className = 'w-5 h-5 mr-3';
        headerDiv.appendChild(spacer);
    }
    
    // Level badge
    const levelBadge = document.createElement('span');
    let badgeColorClass = '';
    if (level === 1) badgeColorClass = 'bg-blue-500 text-white';
    else if (level === 2) badgeColorClass = 'bg-red-500 text-white';   
    else badgeColorClass = 'bg-green-500 text-white';
    levelBadge.className = `w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${badgeColorClass}`;
    levelBadge.textContent = `L${level}`;
    
    // Category name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-semibold text-brand-dark flex-1';
    nameSpan.textContent = category.name;
    
    // Multi-selection checkbox instead of single selection indicator
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'checkbox-container ml-2';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'category-checkbox w-4 h-4 rounded border-2 border-brand-grey-medium text-brand-red focus:ring-brand-red transition-colors';
    checkbox.dataset.categoryId = category.id;
    checkbox.dataset.level = level;
    
    // Check if this category is already selected
    checkbox.checked = selectedCategories.has(category.id);
    
    // Add change event listener for multi-selection
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        handleCategorySelection(category, checkbox.checked);
    });
    
    checkboxDiv.appendChild(checkbox);
    
    headerDiv.appendChild(levelBadge);
    headerDiv.appendChild(nameSpan);
    headerDiv.appendChild(checkboxDiv);
    
    nodeDiv.appendChild(headerDiv);
    
    // Children container (initially hidden unless expanded)
    if (category.hasChildren) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = `category-children mt-2 ${category.expanded ? '' : 'hidden'}`;
        childrenDiv.dataset.parentId = category.id;
        
        // Render children if already loaded
        Object.values(category.children || {}).forEach(child => {
            const childNode = createCategoryTreeNode(child, level + 1);
            childrenDiv.appendChild(childNode);
        });
        
        nodeDiv.appendChild(childrenDiv);
    }
    
    return nodeDiv;
}

async function toggleCategoryNode(category, nodeElement) {
    category.expanded = !category.expanded;
    
    // Update expand icon
    const expandIcon = nodeElement.querySelector('.expand-icon');
    if (expandIcon) {
        expandIcon.innerHTML = category.expanded 
            ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
            : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    }
    
    const childrenDiv = nodeElement.querySelector('.category-children');
    if (childrenDiv) {
        if (category.expanded) {
            // Load children if not already loaded
            if (Object.keys(category.children || {}).length === 0) {
                await loadCategoryChildren(category);
                // Re-render children
                childrenDiv.innerHTML = '';
                Object.values(category.children || {}).forEach(child => {
                    const childNode = createCategoryTreeNode(child, category.level + 1);
                    childrenDiv.appendChild(childNode);
                });
            }
            childrenDiv.classList.remove('hidden');
        } else {
            childrenDiv.classList.add('hidden');
        }
    }
}

async function loadCategoryChildren(parentCategory) {
    try {
        const level = parentCategory.level + 1;
        const response = await fetch(`/api/categories/level${level}/${parentCategory.id}`);
        if (!response.ok) throw new Error(`Failed to fetch level ${level} categories`);
        
        const children = await response.json();
        parentCategory.children = {};
        
        children.forEach(child => {
            parentCategory.children[child.id] = {
                ...child,
                level: level,
                children: {},
                expanded: false
            };
            allCategories[child.id] = parentCategory.children[child.id];
        });
    } catch (error) {
        console.error(`Error loading category children:`, error);
        showError(`Failed to load subcategories. Please try again.`);
    }
}

function handleCategorySelection(category, isSelected) {
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

function updateBulkCategoryState() {
    // Update appState with current selected categories
    const categoriesArray = Array.from(selectedCategories).map(catId => allCategories[catId]).filter(Boolean);
    appState.setBulkCategory(categoriesArray);
}

function updateSelectionDisplay() {
    const selectedCount = selectedCategories.size;
    if (selectedCount === 0) {
        updateCategorySelectionSummary();
        showSuccess('No categories selected');
    } else if (selectedCount === 1) {
        const categoryId = Array.from(selectedCategories)[0];
        const category = allCategories[categoryId];
        updateCategorySelectionSummary();
        showSuccess(`Selected: ${category.name} (Level ${category.level})`);
    } else {
        // Group by level for better display
        const levelGroups = {};
        selectedCategories.forEach(catId => {
            const cat = allCategories[catId];
            if (cat) {
                if (!levelGroups[cat.level]) levelGroups[cat.level] = [];
                levelGroups[cat.level].push(cat.name);
            }
        });
        
        const levelSummary = Object.entries(levelGroups)
            .map(([level, names]) => `L${level}: ${names.join(', ')}`)
            .join(' | ');
        
        updateCategorySelectionSummary();
        showSuccess(`Selected ${selectedCount} categories: ${levelSummary}`);
    }
}

function clearCategorySelection() {
    selectedCategories.clear();
    appState.setBulkCategory(null);
    
    // Clear all category checkboxes
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    
    updateAssignButtonState();
    updateSelectionDisplay();
}

async function expandAllCategories() {
    showLoadingOverlay(true, 'Expanding categories...');
    try {
        // Get all expandable categories
        const expandableNodes = document.querySelectorAll('.category-tree-node[data-level="1"], .category-tree-node[data-level="2"]');
        
        for (const nodeElement of expandableNodes) {
            const categoryId = nodeElement.dataset.categoryId;
            const category = allCategories[categoryId];
            
            if (category && category.hasChildren && !category.expanded) {
                await toggleCategoryNode(category, nodeElement);
                // Add small delay for smoother UX
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        showSuccess('All categories expanded');
    } catch (error) {
        console.error('Error expanding categories:', error);
        showError('Failed to expand all categories');
    } finally {
        showLoadingOverlay(false);
    }
}

function collapseAllCategories() {
    // Collapse all expanded categories
    const expandedNodes = document.querySelectorAll('.category-tree-node');
    
    expandedNodes.forEach(nodeElement => {
        const categoryId = nodeElement.dataset.categoryId;
        const category = allCategories[categoryId];
        
        if (category && category.expanded) {
            category.expanded = false;
            
            // Update expand icon
            const expandIcon = nodeElement.querySelector('.expand-icon');
            if (expandIcon) {
                expandIcon.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
            }
            
            // Hide children
            const childrenDiv = nodeElement.querySelector('.category-children');
            if (childrenDiv) {
                childrenDiv.classList.add('hidden');
            }
        }
    });
    
    showSuccess('All categories collapsed');
}


// Global function to remove category from selection (called from chip buttons)
window.removeCategoryFromSelection = function(categoryId) {
    selectedCategories.delete(categoryId);
    
    // Uncheck the category checkbox
    const checkbox = document.querySelector(`[data-category-id="${categoryId}"] .category-checkbox`);
    if (checkbox) checkbox.checked = false;
    
    updateBulkCategoryState();
    updateAssignButtonState();
    updateSelectionDisplay();
};

// Function to update current categories display for specific products
async function updateCurrentCategoriesDisplayForProducts(productIdsToUpdate) {
    if (!productIdsToUpdate || productIdsToUpdate.length === 0) return;

    // Use the /api/products/bulk-categories endpoint
    try {
        const response = await fetch('/api/products/bulk-categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_ids: productIdsToUpdate })
        });
        if (!response.ok) {
            throw new Error('Failed to fetch bulk category details');
        }
        const productsCategoriesMap = await response.json(); // Expects { product_id: [{id, name, level, parent}, ...], ... }

        productIdsToUpdate.forEach(productId => {
            const cellId = `product-cats-${productId}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                const categoriesForProduct = productsCategoriesMap[productId] || [];
                if (categoriesForProduct.length > 0) {
                    // Display as small chips
                    cell.innerHTML = categoriesForProduct.map(cat => {
                        let bgColor = 'bg-brand-grey-medium'; // Default
                        if (cat.level === 1) bgColor = 'bg-blue-500';
                        else if (cat.level === 2) bgColor = 'bg-red-500';
                        else if (cat.level === 3) bgColor = 'bg-green-500';
                        return `<span class="inline-block ${bgColor} text-brand-white text-xs font-semibold px-2 py-2 rounded-full mb-1 mr-1 mt-1 ml-1">${cat.name}</span>`;
                    }).join('');
                } else {
                    cell.textContent = 'No categories assigned.';
                }
            }
        });
    } catch (error) {
        console.error('Error updating current categories display:', error);
        showError('Could not update product categories.');
        // Optionally set cell text to an error message for affected products
        productIdsToUpdate.forEach(productId => {
            const cell = document.getElementById(`product-cats-${productId}`);
            if (cell) cell.textContent = 'Error loading categories.';
        });
    }
}

// Helper to update categories for all currently visible products in the table
async function updateCurrentCategoriesDisplayForAllVisibleProducts() {
    const visibleProductIds = Array.from(productList.querySelectorAll('tr[data-product-id]'))
                                   .map(tr => tr.dataset.productId)
                                   .filter(id => id); // Filter out any undefined/null IDs
    if (visibleProductIds.length > 0) {
        await updateCurrentCategoriesDisplayForProducts(visibleProductIds);
    }
}

// --- End Category Display & API Calls ---

// --- UI Utility Functions ---
function updateAssignButtonState() {
    const hasSelections = selectedCategories.size > 0 && selectedProducts.size > 0;
    
    if (hasSelections) {
        // Enable both buttons
        assignCategoriesBtn.disabled = false;
        assignCategoriesBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        removeCategoriesBtn.disabled = false;
        removeCategoriesBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Update button text to reflect multiple categories
        const categoryCount = selectedCategories.size;
        const productCount = selectedProducts.size;
        assignCategoriesBtn.textContent = `Assign ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} to ${productCount} product${productCount === 1 ? '' : 's'}`;
        removeCategoriesBtn.textContent = `Remove ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'} from ${productCount} product${productCount === 1 ? '' : 's'}`;
    } else {
        // Disable both buttons
        assignCategoriesBtn.disabled = true;
        assignCategoriesBtn.classList.add('opacity-50', 'cursor-not-allowed');
        assignCategoriesBtn.textContent = 'Assign Categories';
        
        removeCategoriesBtn.disabled = true;
        removeCategoriesBtn.classList.add('opacity-50', 'cursor-not-allowed');
        removeCategoriesBtn.textContent = 'Remove Categories';
    }
}

function showLoadingOverlay(show, message = 'Processing...') {
    const overlayText = loadingOverlay.querySelector('p');
    if (overlayText) {
        overlayText.textContent = message;
    }
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'success') {
    console.log('showNotification called:', message, type); // Debug log
    
    const notification = document.createElement('div');
    let bgColor, textColor, borderColor, iconSvg;

    // Determine styling based on notification type
    if (type === 'success') {
        bgColor = 'bg-green-500';
        textColor = 'text-white';
        borderColor = 'border-green-500';
        // SVG for success icon (check mark)
        iconSvg = `<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 1 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
    } else { // error
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        borderColor = 'border-red-500';
        // SVG for error icon (cross mark)
        iconSvg = `<svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 1 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 1 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
    }

    // Style notifications for bottom-right with pop-up animation
    notification.style.cssText = `
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid ${type === 'success' ? '#059669' : '#dc2626'};
        display: flex;
        align-items: center;
        max-width: 384px;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
        transform: scale(0.8);
        opacity: 0;
        transition: all 200ms ease-out;
        pointer-events: auto;
        z-index: 60;
    `;
    notification.innerHTML = `${iconSvg}<span>${message}</span>`;
    
    console.log('Creating notification with pop-up animation');
    
    // Find and use the notification container
    const container = notificationContainer || document.getElementById('notification-container');
    if (container) {
        console.log('Adding notification to container');
        container.appendChild(notification);
        
        // Trigger pop-up animation after a brief delay
        setTimeout(() => {
            notification.style.transform = 'scale(1.05)';
            notification.style.opacity = '1';
            
            // Settle to normal size
            setTimeout(() => {
                notification.style.transform = 'scale(1)';
            }, 150);
        }, 10);
    } else {
        console.error('Notification container not found, adding to body');
        // Fallback: add to body with absolute positioning
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        document.body.appendChild(notification);
        
        // Apply same animation for fallback
        setTimeout(() => {
            notification.style.transform = 'scale(1.05)';
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.transform = 'scale(1)';
            }, 150);
        }, 10);
    }

    console.log('Notification added to DOM');

    // Auto-dismiss the notification with fade-out
    setTimeout(() => {
        console.log('Starting notification dismissal');
        notification.style.opacity = '0';
        notification.style.transform = 'scale(0.9)';
        setTimeout(() => {
            console.log('Removing notification');
            notification.remove();
        }, 200);
    }, 3000);
}

/**
 * Displays an error toast notification.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    showNotification(message, 'error');
}

/**
 * Displays a success toast notification.
 * @param {string} message - The success message to display.
 */
function showSuccess(message) {
    showNotification(message, 'success');
}

// --- End UI Utility Functions ---

// Old render function removed - replaced by new category tree functions above
